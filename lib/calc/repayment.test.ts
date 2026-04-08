/**
 * 상환 계산기 검산
 *
 * 이 파일을 `npm test` 로 실행하면 vitest가 모든 검산을 자동으로 돌려.
 * 하나라도 틀리면 빨간 X 표시.
 */

import { describe, it, expect } from "vitest";
import { calcEqualPaymentSchedule } from "./repayment";

describe("원리금균등 상환 — 김상민 씨 케이스", () => {
  // 우리 골든 페르소나 D — 주담대 2.5억 / 30년 / 4.2%
  const result = calcEqualPaymentSchedule({
    principal: 250_000_000,    // 2.5억
    annualRatePercent: 4.2,
    termMonths: 360,            // 30년
  });

  it("월 상환액은 약 122만원이어야 함", () => {
    // 실제 은행 공식 계산기로 검증한 값: 약 1,222,712원
    const monthly = Math.round(result.monthlyPayment);
    expect(monthly).toBeGreaterThan(1_220_000);
    expect(monthly).toBeLessThan(1_225_000);
  });

  it("총 이자는 약 1.9억원대여야 함", () => {
    const total = Math.round(result.totalInterest);
    expect(total).toBeGreaterThan(189_000_000);
    expect(total).toBeLessThan(191_000_000);
  });

  it("월별 스케줄은 360개여야 함 (30년 × 12개월)", () => {
    expect(result.schedule).toHaveLength(360);
  });

  it("마지막 달엔 잔액이 거의 0이어야 함", () => {
    const last = result.schedule[359];
    expect(last.remainingBalance).toBeLessThan(1);
  });

  it("매달 납입액은 모두 동일해야 함 (원리금균등)", () => {
    const first = result.schedule[0].payment;
    const middle = result.schedule[180].payment;
    const last = result.schedule[359].payment;
    expect(middle).toBeCloseTo(first, 2);
    expect(last).toBeCloseTo(first, 2);
  });

  it("초기엔 이자 비중이 크고 후반엔 원금 비중이 큼", () => {
    // 1개월차: 이자 > 원금
    expect(result.schedule[0].interest).toBeGreaterThan(result.schedule[0].principal);
    // 360개월차: 원금 > 이자
    expect(result.schedule[359].principal).toBeGreaterThan(result.schedule[359].interest);
  });

  it("매달 원금+이자의 합은 월 납입액과 같아야 함", () => {
    const entry = result.schedule[100]; // 임의의 100개월차
    expect(entry.principal + entry.interest).toBeCloseTo(entry.payment, 2);
  });
});

describe("원리금균등 상환 — 일반 케이스", () => {
  it("1억 / 10년 / 5% 예시", () => {
    const result = calcEqualPaymentSchedule({
      principal: 100_000_000,
      annualRatePercent: 5,
      termMonths: 120,
    });
    // 은행 공식 계산기: 약 1,060,655원
    const monthly = Math.round(result.monthlyPayment);
    expect(monthly).toBeGreaterThan(1_060_000);
    expect(monthly).toBeLessThan(1_062_000);
  });

  it("무이자 케이스도 동작해야 함 (안전 장치)", () => {
    const result = calcEqualPaymentSchedule({
      principal: 12_000_000,
      annualRatePercent: 0,
      termMonths: 12,
    });
    expect(result.monthlyPayment).toBe(1_000_000); // 1200만 / 12
    expect(result.totalInterest).toBe(0);
  });
});
