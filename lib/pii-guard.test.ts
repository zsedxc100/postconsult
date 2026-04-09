/**
 * PII 가드레일 검산 (2026-04 새 구조)
 *
 * 정책: 의심되면 차단. 거짓 양성 OK, 거짓 음성 NOT OK.
 */

import { describe, it, expect } from "vitest";
import {
  detectPIIInText,
  assertAnonymousProfile,
  PIIGuardError,
} from "./pii-guard";

describe("PII 패턴 검출 — 텍스트 검사", () => {
  describe("✅ 잡혀야 하는 것 (PII)", () => {
    it("전화번호 010-1234-5678", () => {
      expect(detectPIIInText("연락처: 010-1234-5678").found).toBe(true);
    });

    it("전화번호 하이픈 없음", () => {
      expect(detectPIIInText("01012345678 입니다").found).toBe(true);
    });

    it("전화번호 공백 구분", () => {
      expect(detectPIIInText("010 1234 5678").found).toBe(true);
    });

    it("019 / 016 등 구형 번호", () => {
      expect(detectPIIInText("019-999-9999").found).toBe(true);
      expect(detectPIIInText("016-555-7777").found).toBe(true);
    });

    it("계좌번호 110-123-456789", () => {
      expect(detectPIIInText("계좌 110-123-456789").found).toBe(true);
    });

    it("주민등록번호", () => {
      expect(detectPIIInText("800101-1234567").found).toBe(true);
      expect(detectPIIInText("800101-1").found).toBe(true);
    });

    it("이메일 주소", () => {
      expect(detectPIIInText("contact: user@example.com").found).toBe(true);
    });

    it("신용카드 번호 16자리", () => {
      expect(detectPIIInText("카드: 1234-5678-9012-3456").found).toBe(true);
      expect(detectPIIInText("1234567890123456").found).toBe(true);
    });
  });

  describe("✅ 통과해야 하는 것 (안전)", () => {
    it("일반 한국어 문장", () => {
      expect(detectPIIInText("오늘 상담해주셔서 감사합니다").found).toBe(false);
    });

    it("상품 정보", () => {
      expect(detectPIIInText("주담대 2.5억, 30년, 4.2%").found).toBe(false);
    });

    it("긴 숫자라도 카드 패턴 아님", () => {
      expect(detectPIIInText("연 4.2% 30년 360개월").found).toBe(false);
    });
  });
});

describe("객체 전체 검사 — assertAnonymousProfile (새 구조)", () => {
  describe("✅ 통과해야 하는 익명 프로필", () => {
    it("최소 필드 (나이만)", () => {
      const minimal = {
        ageGroup: "30대",
        joinedProducts: [],
        proposedProducts: [],
        topics: [],
      };
      expect(() => assertAnonymousProfile(minimal)).not.toThrow();
    });

    it("이서연 사회초년생 케이스 (수신 가입)", () => {
      const profile = {
        ageGroup: "20대",
        familyStatus: "미혼",
        childrenCount: 0,
        dependentsCount: 0,
        incomeRange: "월 200-300만",
        joinedProducts: [
          {
            type: "savings",
            category: "저축성",
            name: "정기적금 12개월",
            monthlyDeposit: 300000,
            ratePercent: 3.7,
            termMonths: 12,
            isTaxFree: false,
            preferentialConditions: ["조합원 +0.1%p", "급여이체 +0.1%p"],
            midwayRate: "기본금리의 50%",
          },
        ],
        proposedProducts: [
          {
            type: "savings",
            name: "자유적립예금",
            specialNotes: "비상자금 마련용",
          },
        ],
        emphasizedProducts: [
          { name: "청약종합저축", reason: "사회초년생 주력" },
          { name: "노란우산공제", reason: "장기 비과세" },
        ],
        topics: ["사회초년생", "청약", "비상자금", "조합원우대"],
        discType: "I",
        klontzType: "vigilance",
        freeNote: "꼼꼼하게 다 물어보심, 자료 원함",
        branchName: "춘천신협",
      };
      expect(() => assertAnonymousProfile(profile)).not.toThrow();
    });

    it("김상민 골든 페르소나 (여신 약정 완료)", () => {
      const profile = {
        ageGroup: "40대",
        familyStatus: "기혼_자녀",
        childrenCount: 2,
        joinedProducts: [
          {
            type: "loan",
            name: "주담대 30년",
            loanPrincipal: 250_000_000,
            loanRate: 4.2,
            loanTermMonths: 360,
            repayMethod: "원리금균등",
          },
        ],
        proposedProducts: [],
        topics: ["주담대 약정완료", "금리인하요구권"],
        discType: "S",
        klontzType: "vigilance",
        branchName: "춘천신협",
      };
      expect(() => assertAnonymousProfile(profile)).not.toThrow();
    });
  });

  describe("❌ 차단되어야 하는 것", () => {
    it("customerName 필드가 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "40대",
          customerName: "김상민",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("phone 필드가 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "40대",
          phone: "010-1234-5678",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("consultantName 도 차단 (담당자도 PII)", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "40대",
          consultantName: "박지영",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("화이트리스트에 없는 필드 차단 (모르는 필드)", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "30대",
          mysteryField: "뭔지 모름",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("freeNote 안에 전화번호 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "30대",
          freeNote: "고객 010-1234-5678",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("topics 배열 안에 이메일 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "30대",
          joinedProducts: [],
          proposedProducts: [],
          topics: ["주담대", "user@example.com"],
        })
      ).toThrow(PIIGuardError);
    });

    it("joinedProducts[0].specialNotes 안에 PII 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "30대",
          joinedProducts: [
            {
              type: "savings",
              name: "정기적금",
              specialNotes: "고객 전화 010-9999-8888",
            },
          ],
          proposedProducts: [],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("joinedProducts[0] 안에 모르는 필드 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "30대",
          joinedProducts: [
            {
              type: "savings",
              name: "정기적금",
              customerName: "이서연", // 상품 안에 PII
            },
          ],
          proposedProducts: [],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("emphasizedProducts 의 reason 안에 PII 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          ageGroup: "30대",
          joinedProducts: [],
          proposedProducts: [],
          emphasizedProducts: [
            { name: "청약저축", reason: "010-1111-2222 통화" },
          ],
          topics: [],
        })
      ).toThrow(PIIGuardError);
    });

    it("객체가 아니면 거부", () => {
      expect(() => assertAnonymousProfile("not an object")).toThrow(
        PIIGuardError
      );
      expect(() => assertAnonymousProfile(null)).toThrow(PIIGuardError);
    });
  });

  describe("에러에 이유가 담겨야 함 (디버깅용)", () => {
    it("PIIGuardError 의 reasons 배열에 발견된 패턴 명시", () => {
      try {
        assertAnonymousProfile({
          ageGroup: "40대",
          customerName: "김상민",
          phone: "010-1234-5678",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        });
        expect.fail("PIIGuardError 가 던져졌어야 함");
      } catch (e) {
        expect(e).toBeInstanceOf(PIIGuardError);
        if (e instanceof PIIGuardError) {
          expect(e.reasons.length).toBeGreaterThan(0);
          expect(e.reasons.some((r) => r.includes("customerName"))).toBe(true);
          expect(e.reasons.some((r) => r.includes("phone"))).toBe(true);
        }
      }
    });
  });
});
