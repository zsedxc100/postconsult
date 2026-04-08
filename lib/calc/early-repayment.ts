/**
 * 중도상환 시뮬레이션
 *
 * "매달 X원을 추가로 갚으면 만기가 얼마나 단축되고
 *  이자는 얼마나 절감되는가?" 를 계산합니다.
 *
 * 신협 D 케이스(여신 약정 완료) 핵심 기능.
 * 고객에게 "월 10만원만 더 내시면 4년 일찍 끝나요" 같은 결정적 멘트의 근거.
 */

import { calcEqualPaymentSchedule, type LoanInput } from "./repayment";

// ─────────────────────────────────────────────
// 입력 — 원래 대출 + 매달 얼마나 추가로 갚을지
// ─────────────────────────────────────────────
export interface EarlyRepaymentInput {
  loan: LoanInput;            // 원래 대출 조건
  extraMonthly: number;       // 매달 추가 상환액 (원)
}

// ─────────────────────────────────────────────
// 결과 — 비교가 한눈에 들어오게
// ─────────────────────────────────────────────
export interface EarlyRepaymentResult {
  // 원래 시나리오
  originalTermMonths: number;       // 360
  originalTotalInterest: number;    // 약 1.9억

  // 새 시나리오 (추가 상환 적용)
  newTermMonths: number;            // 예: 312
  newTotalInterest: number;         // 예: 1.5억

  // 비교
  monthsSaved: number;              // 단축 개월 (예: 48)
  yearsSaved: number;               // 단축 년 (소수점 가능, 예: 4.0)
  interestSaved: number;            // 절감 이자 (예: 약 4천만)

  // 보조 정보
  originalMonthlyPayment: number;   // 원래 월 상환액
  newMonthlyPayment: number;        // 새 월 상환액 = 원래 + extra
}

// ─────────────────────────────────────────────
// 실제 계산 함수
// ─────────────────────────────────────────────
export function calcEarlyRepaymentImpact(
  input: EarlyRepaymentInput
): EarlyRepaymentResult {
  const { loan, extraMonthly } = input;

  // 1. 원래 시나리오를 먼저 계산 (이전 함수 재사용 ✨)
  const original = calcEqualPaymentSchedule(loan);

  // 2. 새 시나리오 시뮬레이션
  // 매달 (원래 상환액 + extra) 만큼 갚으면서 잔액이 0이 될 때까지 카운트
  const monthlyRate = loan.annualRatePercent / 100 / 12;
  const newMonthlyPayment = original.monthlyPayment + extraMonthly;

  let balance = loan.principal;
  let monthsElapsed = 0;
  let newTotalInterest = 0;

  // 안전장치: 무한루프 방지 (원 만기의 2배까지만)
  const maxMonths = loan.termMonths * 2;

  while (balance > 0 && monthsElapsed < maxMonths) {
    const interest = balance * monthlyRate;
    let principalPaid = newMonthlyPayment - interest;

    // 이번 달에 다 갚으면 (마지막 달 처리)
    if (principalPaid >= balance) {
      newTotalInterest += interest;
      balance = 0;
      monthsElapsed += 1;
      break;
    }

    balance -= principalPaid;
    newTotalInterest += interest;
    monthsElapsed += 1;
  }

  // 3. 비교 결과 만들기
  const monthsSaved = loan.termMonths - monthsElapsed;
  const yearsSaved = monthsSaved / 12;
  const interestSaved = original.totalInterest - newTotalInterest;

  return {
    originalTermMonths: loan.termMonths,
    originalTotalInterest: original.totalInterest,
    newTermMonths: monthsElapsed,
    newTotalInterest,
    monthsSaved,
    yearsSaved,
    interestSaved,
    originalMonthlyPayment: original.monthlyPayment,
    newMonthlyPayment,
  };
}
