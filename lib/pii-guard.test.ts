/**
 * PII 가드레일 검산
 *
 * 정책: 의심되면 차단. 거짓 양성 OK, 거짓 음성 NOT OK.
 *
 * 모든 PII 패턴은 반드시 잡혀야 하고,
 * 안전한 익명 프로필은 반드시 통과해야 함.
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

    it("주민등록번호 (앞 6자리만이라도)", () => {
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
      // 13자리, 15자리는 카드 16자리 패턴에 안 잡힘
      expect(detectPIIInText("연 4.2% 30년 360개월").found).toBe(false);
    });

    it("특수문자 가득한 텍스트", () => {
      expect(detectPIIInText("월 122만원! 이자 1.9억!").found).toBe(false);
    });
  });
});

describe("객체 전체 검사 — assertAnonymousProfile", () => {
  describe("✅ 통과해야 하는 익명 프로필", () => {
    it("김상민 케이스 익명화 버전", () => {
      const safe = {
        track: "loan",
        stage: "post_agreement",
        ageGroup: "40대",
        lifeEvent: "자녀교육",
        familyStatus: "기혼_자녀",
        discType: "S",
        bitType: "preserver",
        loanPurpose: "주택",
        loanPrincipal: 250_000_000,
        loanTermMonths: 360,
        interestRatePercent: 4.2,
        repayMethod: "원리금균등",
        topicChips: ["금리인하요구권", "중도상환검토", "대출금상환공제"],
        branchName: "OO지점",
      };
      expect(() => assertAnonymousProfile(safe)).not.toThrow();
    });

    it("최소 필드만 있어도 OK", () => {
      const minimal = {
        track: "savings",
        stage: "consult_only",
        ageGroup: "30대",
      };
      expect(() => assertAnonymousProfile(minimal)).not.toThrow();
    });
  });

  describe("❌ 차단되어야 하는 것", () => {
    it("이름 필드가 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          track: "loan",
          customerName: "김상민", // 금지 필드
        })
      ).toThrow(PIIGuardError);
    });

    it("phone 필드가 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          track: "loan",
          phone: "010-1234-5678",
        })
      ).toThrow(PIIGuardError);
    });

    it("화이트리스트에 없는 필드는 차단 (모르는 필드)", () => {
      expect(() =>
        assertAnonymousProfile({
          track: "loan",
          mysteryField: "뭔지 모르겠음",
        })
      ).toThrow(PIIGuardError);
    });

    it("허용된 필드라도 그 안에 전화번호 패턴이 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          track: "loan",
          stage: "post_agreement",
          // lifeEvent 는 허용 필드지만 그 안에 전화번호가 들어있음 (악의적/실수)
          lifeEvent: "010-1234-5678 자녀교육",
        })
      ).toThrow(PIIGuardError);
    });

    it("topicChips 배열 안에 PII 있으면 차단", () => {
      expect(() =>
        assertAnonymousProfile({
          track: "loan",
          topicChips: ["주담대", "user@example.com 이메일"],
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
          track: "loan",
          customerName: "김상민",
          phone: "010-1234-5678",
        });
        // 여기 도달하면 안 됨
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
