/**
 * 중도상환 시뮬레이션 검산
 */

import { describe, it, expect } from "vitest";
import { calcEarlyRepaymentImpact } from "./early-repayment";

describe("중도상환 시뮬레이션 — 김상민 씨", () => {
  // 골든 페르소나: 2.5억 / 30년 / 4.2%
  const baseLoan = {
    principal: 250_000_000,
    annualRatePercent: 4.2,
    termMonths: 360,
  };

  it("매달 0원 추가 = 원래 만기와 동일해야 함", () => {
    const result = calcEarlyRepaymentImpact({
      loan: baseLoan,
      extraMonthly: 0,
    });
    // 0원 추가하면 단축 거의 0
    expect(result.monthsSaved).toBeLessThanOrEqual(1);
    expect(result.interestSaved).toBeLessThan(10_000); // 1만원 미만
  });

  it("매달 10만원 추가 → 만기 단축 + 이자 절감", () => {
    const result = calcEarlyRepaymentImpact({
      loan: baseLoan,
      extraMonthly: 100_000,
    });

    // 단축은 적어도 30개월 이상 (2.5년+)
    expect(result.monthsSaved).toBeGreaterThan(30);
    // 절감 이자는 최소 1천만원 이상
    expect(result.interestSaved).toBeGreaterThan(10_000_000);
    // 새 만기는 원래보다 짧아야 함
    expect(result.newTermMonths).toBeLessThan(360);
  });

  it("매달 30만원 추가 → 더 큰 단축", () => {
    const result10 = calcEarlyRepaymentImpact({
      loan: baseLoan,
      extraMonthly: 100_000,
    });
    const result30 = calcEarlyRepaymentImpact({
      loan: baseLoan,
      extraMonthly: 300_000,
    });

    // 30만원이 10만원보다 더 많이 단축, 더 많이 절감
    expect(result30.monthsSaved).toBeGreaterThan(result10.monthsSaved);
    expect(result30.interestSaved).toBeGreaterThan(result10.interestSaved);
    // 30만원 추가 시 70개월 이상 단축
    expect(result30.monthsSaved).toBeGreaterThan(70);
  });

  it("새 월 상환액 = 원래 + 추가액", () => {
    const result = calcEarlyRepaymentImpact({
      loan: baseLoan,
      extraMonthly: 100_000,
    });
    expect(result.newMonthlyPayment).toBeCloseTo(
      result.originalMonthlyPayment + 100_000,
      2
    );
  });

  it("매달 50만원 추가 → 약 13년 단축 (월 상환의 41% 추가)", () => {
    const result = calcEarlyRepaymentImpact({
      loan: baseLoan,
      extraMonthly: 500_000,
    });
    // 50만원/달 추가는 매우 큰 효과 (월 상환액의 41% 증가)
    // 실제 검산 결과 약 13년 단축
    expect(result.yearsSaved).toBeGreaterThan(12);
    expect(result.yearsSaved).toBeLessThan(14);
    // 절감 이자도 매우 큼 (8천만원 이상)
    expect(result.interestSaved).toBeGreaterThan(80_000_000);
  });
});
