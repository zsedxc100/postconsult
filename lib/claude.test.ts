/**
 * Claude wrapper 검산 — PII 가드 통합 부분만
 *
 * 실제 Claude 호출은 비용·인터넷 의존 때문에 단위 테스트하지 않음.
 * 대신 PII 가드 → Claude 호출 직전 차단되는지 확인.
 */

import { describe, it, expect } from "vitest";
import { generateReport, PIIGuardError } from "./claude";

describe("generateReport — PII 가드 통합 (새 구조)", () => {
  it("PII 가 들어있으면 Claude 호출 전에 차단 (네트워크 안 탐)", async () => {
    await expect(
      generateReport({
        // @ts-expect-error 의도적으로 잘못된 필드
        profile: {
          ageGroup: "40대",
          customerName: "김상민",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        },
        calc: {},
      })
    ).rejects.toThrow(PIIGuardError);
  });

  it("화이트리스트 외 필드도 거부", async () => {
    await expect(
      generateReport({
        // @ts-expect-error 의도적으로 모르는 필드
        profile: {
          ageGroup: "40대",
          mysteryField: "뭔지 모름",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        },
        calc: {},
      })
    ).rejects.toThrow(PIIGuardError);
  });

  it("freeNote 안의 PII 패턴도 차단", async () => {
    await expect(
      generateReport({
        profile: {
          ageGroup: "30대",
          freeNote: "010-1234-5678 통화함",
          joinedProducts: [],
          proposedProducts: [],
          topics: [],
        },
        calc: {},
      })
    ).rejects.toThrow(PIIGuardError);
  });

  it("joinedProducts 안의 PII 도 차단 (재귀 검사)", async () => {
    await expect(
      generateReport({
        profile: {
          ageGroup: "30대",
          joinedProducts: [
            {
              type: "savings",
              name: "정기적금",
              specialNotes: "010-9999-8888 고객",
            },
          ],
          proposedProducts: [],
          topics: [],
        },
        calc: {},
      })
    ).rejects.toThrow(PIIGuardError);
  });
});
