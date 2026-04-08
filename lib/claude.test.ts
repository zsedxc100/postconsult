/**
 * Claude wrapper 검산 — 구조적 부분만
 *
 * 실제 Claude 호출은 비용·인터넷 의존 때문에 단위 테스트하지 않음.
 * 대신 PII 가드, 타입, JSON 파싱 등 결정적인 부분만 검증.
 *
 * 실제 호출 동작 검증은 Phase 1.3d (폼 + 리포트 페이지)에서.
 */

import { describe, it, expect } from "vitest";
import { generateReport, PIIGuardError } from "./claude";

describe("generateReport — PII 가드 통합", () => {
  it("PII가 들어있으면 Claude 호출 전에 거부 (네트워크 안 탐)", async () => {
    // 이 케이스는 절대 Claude API에 도달하면 안 됨
    // assertAnonymousProfile 단계에서 즉시 throw
    await expect(
      generateReport({
        // @ts-expect-error 의도적으로 잘못된 필드 넣음
        profile: {
          track: "loan",
          customerName: "김상민", // 금지 필드
        },
        calc: {},
      })
    ).rejects.toThrow(PIIGuardError);
  });

  it("화이트리스트 외 필드도 거부", async () => {
    await expect(
      generateReport({
        // @ts-expect-error 의도적으로 모르는 필드 넣음
        profile: {
          track: "loan",
          mysteryField: "뭔지 모름",
        },
        calc: {},
      })
    ).rejects.toThrow(PIIGuardError);
  });

  it("허용 필드 안에 PII 패턴이 있으면 거부", async () => {
    await expect(
      generateReport({
        profile: {
          track: "loan",
          stage: "post_agreement",
          // lifeEvent 는 허용 필드지만 안에 전화번호
          lifeEvent: "010-1234-5678 이슈",
        },
        calc: {},
      })
    ).rejects.toThrow(PIIGuardError);
  });
});
