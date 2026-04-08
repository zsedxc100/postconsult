/**
 * 금리인하요구권 효과 시뮬레이션
 *
 * "현재 금리에서 X%p 낮아지면 월 상환액·총 이자가 얼마나 줄어드는가?"
 *
 * 김상민 씨에게 던질 결정적 멘트의 근거:
 * "취업·소득 증가·신용도 향상 시 금리인하요구권 신청 → 0.3%p 낮아지면 약 1,500만원 절감"
 *
 * 신협 D 케이스 (여신 약정 완료) 슬롯 3 핵심 데이터.
 */

import { calcEqualPaymentSchedule, type LoanInput } from "./repayment";

// ─────────────────────────────────────────────
// 입력 — 원래 대출 + 인하 폭
// ─────────────────────────────────────────────
export interface RateCutInput {
  loan: LoanInput;            // 원래 대출 조건
  rateCutPercentPoint: number; // 인하할 금리 (%p, 예: 0.3 = 0.3%p 인하)
}

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
export interface RateCutResult {
  originalRate: number;             // 원래 연이율 (%)
  newRate: number;                  // 인하 후 연이율 (%)

  originalMonthlyPayment: number;   // 원래 월 상환액
  newMonthlyPayment: number;        // 새 월 상환액
  monthlySaving: number;            // 매달 절감액

  originalTotalInterest: number;    // 원래 총 이자
  newTotalInterest: number;         // 새 총 이자
  totalInterestSaving: number;      // 총 절감 이자
}

// ─────────────────────────────────────────────
// 실제 계산 함수
// ─────────────────────────────────────────────
export function calcRateCutImpact(input: RateCutInput): RateCutResult {
  const { loan, rateCutPercentPoint } = input;

  // 1. 원래 시나리오
  const original = calcEqualPaymentSchedule(loan);

  // 2. 새 금리로 다시 계산
  // 안전장치: 인하 폭이 너무 커서 음수가 되지 않게
  const newRate = Math.max(0, loan.annualRatePercent - rateCutPercentPoint);
  const newLoan: LoanInput = {
    ...loan,                       // 원금·기간은 그대로
    annualRatePercent: newRate,    // 이율만 교체
  };
  const newScenario = calcEqualPaymentSchedule(newLoan);

  // 3. 비교 결과
  return {
    originalRate: loan.annualRatePercent,
    newRate,

    originalMonthlyPayment: original.monthlyPayment,
    newMonthlyPayment: newScenario.monthlyPayment,
    monthlySaving: original.monthlyPayment - newScenario.monthlyPayment,

    originalTotalInterest: original.totalInterest,
    newTotalInterest: newScenario.totalInterest,
    totalInterestSaving: original.totalInterest - newScenario.totalInterest,
  };
}
