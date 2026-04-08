/**
 * 금리인하요구권 효과 검산
 */

import { describe, it, expect } from "vitest";
import { calcRateCutImpact } from "./rate-cut";

describe("금리인하요구권 시뮬레이션 — 김상민 씨", () => {
  const baseLoan = {
    principal: 250_000_000,
    annualRatePercent: 4.2,
    termMonths: 360,
  };

  it("0.3%p 인하 → 월 상환액·총 이자 모두 줄어야 함", () => {
    const r = calcRateCutImpact({
      loan: baseLoan,
      rateCutPercentPoint: 0.3,
    });

    expect(r.originalRate).toBe(4.2);
    expect(r.newRate).toBeCloseTo(3.9, 5);

    expect(r.newMonthlyPayment).toBeLessThan(r.originalMonthlyPayment);
    expect(r.newTotalInterest).toBeLessThan(r.originalTotalInterest);
    expect(r.monthlySaving).toBeGreaterThan(0);
    expect(r.totalInterestSaving).toBeGreaterThan(0);
  });

  it("0.3%p 인하 → 총 절감 이자는 약 1500만원대", () => {
    const r = calcRateCutImpact({
      loan: baseLoan,
      rateCutPercentPoint: 0.3,
    });
    // 검증된 값: 30년 동안 약 1500만원 절감
    expect(r.totalInterestSaving).toBeGreaterThan(13_000_000);
    expect(r.totalInterestSaving).toBeLessThan(17_000_000);
  });

  it("0.5%p 인하 → 0.3%p 인하보다 더 큰 절감", () => {
    const r03 = calcRateCutImpact({
      loan: baseLoan,
      rateCutPercentPoint: 0.3,
    });
    const r05 = calcRateCutImpact({
      loan: baseLoan,
      rateCutPercentPoint: 0.5,
    });
    expect(r05.totalInterestSaving).toBeGreaterThan(r03.totalInterestSaving);
    expect(r05.monthlySaving).toBeGreaterThan(r03.monthlySaving);
  });

  it("0%p 인하 (변화 없음) → 절감 0", () => {
    const r = calcRateCutImpact({
      loan: baseLoan,
      rateCutPercentPoint: 0,
    });
    expect(r.monthlySaving).toBeCloseTo(0, 2);
    expect(r.totalInterestSaving).toBeCloseTo(0, 2);
  });

  it("인하 폭이 원금리보다 커도 안전 (음수 방지)", () => {
    const r = calcRateCutImpact({
      loan: baseLoan,
      rateCutPercentPoint: 10, // 10%p 인하 = 4.2 - 10 = -5.8 → 0으로 처리
    });
    expect(r.newRate).toBe(0);
    // 무이자 상태에서도 함수가 동작해야 함
    expect(r.newMonthlyPayment).toBeGreaterThan(0);
  });
});
