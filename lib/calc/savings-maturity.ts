/**
 * 수신 만기 시뮬레이션
 *
 * "월 X원씩 N개월 넣으면 만기에 얼마 받느냐 + 이자 + 비과세 혜택"
 *
 * 정기적금·자유적립·청약저축 모두 동일한 단리 공식.
 * (한국 은행권 표준 — 매달 납입 분에 잔여 개월 수만큼 이자 적용)
 *
 * 정기예금(목돈 일시예치)은 calcLumpSumMaturity 별도 함수.
 */

// ─────────────────────────────────────────────
// 입력
// ─────────────────────────────────────────────
export interface MonthlySavingsInput {
  monthlyDeposit: number;       // 월 납입액 (원)
  annualRatePercent: number;    // 연 이율 (%)
  termMonths: number;           // 가입 기간 (개월)
  isTaxFree?: boolean;          // 비과세종합저축 적용 여부
}

export interface LumpSumSavingsInput {
  principal: number;            // 일시 예치 원금 (원)
  annualRatePercent: number;
  termMonths: number;
  isTaxFree?: boolean;
}

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
export interface SavingsMaturityResult {
  totalDeposited: number;      // 만기까지 납입한 원금 합계
  totalInterest: number;       // 세전 총 이자
  taxAmount: number;           // 이자소득세 (15.4%, 비과세면 0)
  netInterest: number;         // 세후 이자
  maturityValue: number;       // 실제 수령액 (원금 + 세후 이자)

  // 비과세 비교 (참고용)
  maturityValueIfTaxed: number;     // 과세 적용 시 수령액
  maturityValueIfTaxFree: number;   // 비과세 적용 시 수령액
  taxFreeBenefit: number;           // 비과세로 추가로 받는 금액
}

// 한국 이자소득세율 (2026)
const TAX_RATE = 0.154; // 15.4% (이자소득세 14% + 지방세 1.4%)

// ─────────────────────────────────────────────
// 적금 계산 — 매달 납입
// ─────────────────────────────────────────────
export function calcMonthlySavingsMaturity(
  input: MonthlySavingsInput
): SavingsMaturityResult {
  const { monthlyDeposit, annualRatePercent, termMonths, isTaxFree = false } = input;

  const monthlyRate = annualRatePercent / 100 / 12;
  const totalDeposited = monthlyDeposit * termMonths;

  // 한국 은행 표준 적금 단리 공식
  // 첫 달 납입 → n개월 이자
  // 둘째 달 납입 → (n-1)개월 이자
  // ...
  // 마지막 달 납입 → 1개월 이자
  // 총 이자 = 월납액 × 월이율 × n(n+1)/2
  const totalInterest =
    monthlyDeposit * monthlyRate * (termMonths * (termMonths + 1)) / 2;

  return buildResult(totalDeposited, totalInterest, isTaxFree);
}

// ─────────────────────────────────────────────
// 정기예금 계산 — 목돈 일시 예치
// ─────────────────────────────────────────────
export function calcLumpSumMaturity(
  input: LumpSumSavingsInput
): SavingsMaturityResult {
  const { principal, annualRatePercent, termMonths, isTaxFree = false } = input;

  // 단리 공식: 원금 × 연이율 × (기간/12)
  // 한국 정기예금 표준
  const totalInterest = principal * (annualRatePercent / 100) * (termMonths / 12);

  return buildResult(principal, totalInterest, isTaxFree);
}

// ─────────────────────────────────────────────
// 공통 결과 빌더 (비과세 비교 포함)
// ─────────────────────────────────────────────
function buildResult(
  totalDeposited: number,
  totalInterest: number,
  isTaxFree: boolean
): SavingsMaturityResult {
  const taxAmount = isTaxFree ? 0 : totalInterest * TAX_RATE;
  const netInterest = totalInterest - taxAmount;

  // 항상 두 시나리오 다 계산해서 비과세 효과 보여줌
  const maturityValueIfTaxed = totalDeposited + totalInterest * (1 - TAX_RATE);
  const maturityValueIfTaxFree = totalDeposited + totalInterest;
  const taxFreeBenefit = maturityValueIfTaxFree - maturityValueIfTaxed;

  return {
    totalDeposited,
    totalInterest,
    taxAmount,
    netInterest,
    maturityValue: isTaxFree ? maturityValueIfTaxFree : maturityValueIfTaxed,
    maturityValueIfTaxed,
    maturityValueIfTaxFree,
    taxFreeBenefit,
  };
}
