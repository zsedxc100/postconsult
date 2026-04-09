/**
 * 익명 프로필의 상품 리스트를 보고 어떤 계산을 돌릴지 결정하는 매니저.
 *
 * 새 구조: joinedProducts + proposedProducts 안의 각 Product 를 순회하며
 * type 에 따라 적절한 계산 엔진 함수를 호출.
 */

import { calcEqualPaymentSchedule } from "./calc/repayment";
import { calcEarlyRepaymentImpact } from "./calc/early-repayment";
import { calcRateCutImpact } from "./calc/rate-cut";
import { calcMonthlySavingsMaturity, calcLumpSumMaturity } from "./calc/savings-maturity";
import type { AnonymousProfile, CalculationContext, Product } from "./types";
import { categorizeProduct } from "./types";

/**
 * 상품 카테고리(보장성/저축성/혼합)를 자동으로 채워줌.
 * 사용자(폼)가 명시 안 했으면 type 으로 추론.
 */
export function normalizeProducts(products: Product[]): Product[] {
  return products.map((p) => ({
    ...p,
    category: p.category ?? categorizeProduct(p.type),
  }));
}

/**
 * 익명 프로필 정규화 — 상품 카테고리 자동 채움 등.
 */
export function normalizeProfile(profile: AnonymousProfile): AnonymousProfile {
  return {
    ...profile,
    joinedProducts: normalizeProducts(profile.joinedProducts ?? []),
    proposedProducts: normalizeProducts(profile.proposedProducts ?? []),
  };
}

/**
 * 한 상품에 대해 가능한 계산을 돌려서 결과 누적.
 */
function processProduct(
  product: Product,
  ctx: CalculationContext
): void {
  // 여신 (대출)
  if (product.type === "loan" && product.loanPrincipal && product.loanRate !== undefined && product.loanTermMonths) {
    const loan = {
      principal: product.loanPrincipal,
      annualRatePercent: product.loanRate,
      termMonths: product.loanTermMonths,
    };

    const baseSchedule = calcEqualPaymentSchedule(loan);

    // 중도상환 시나리오 4종
    const earlyRepayment = [50_000, 100_000, 200_000, 300_000].map((extra) => {
      const r = calcEarlyRepaymentImpact({ loan, extraMonthly: extra });
      return {
        extraMonthly: extra,
        yearsSaved: r.yearsSaved,
        interestSaved: r.interestSaved,
      };
    });

    // 금리인하 0.3%p 시나리오
    const rateCut = calcRateCutImpact({
      loan,
      rateCutPercentPoint: 0.3,
    });

    if (!ctx.loan) ctx.loan = [];
    ctx.loan.push({
      productName: product.name,
      monthlyPayment: baseSchedule.monthlyPayment,
      totalInterest: baseSchedule.totalInterest,
      earlyRepayment,
      rateCut: {
        cutPercentPoint: 0.3,
        monthlySaving: rateCut.monthlySaving,
        totalInterestSaving: rateCut.totalInterestSaving,
      },
    });
    return;
  }

  // 수신 — 적금 (월 납입)
  if (
    (product.type === "savings" || product.type === "pension") &&
    product.monthlyDeposit &&
    product.ratePercent !== undefined &&
    product.termMonths
  ) {
    const result = calcMonthlySavingsMaturity({
      monthlyDeposit: product.monthlyDeposit,
      annualRatePercent: product.ratePercent,
      termMonths: product.termMonths,
      isTaxFree: product.isTaxFree ?? false,
    });

    if (!ctx.savings) ctx.savings = [];
    ctx.savings.push({
      productName: product.name,
      totalDeposited: result.totalDeposited,
      totalInterest: result.totalInterest,
      maturityValue: result.maturityValue,
      isTaxFree: product.isTaxFree ?? false,
      taxFreeBenefit: result.taxFreeBenefit,
    });
    return;
  }

  // 수신 — 정기예금 (일시 예치)
  if (
    product.type === "savings" &&
    product.principal &&
    product.ratePercent !== undefined &&
    product.termMonths
  ) {
    const result = calcLumpSumMaturity({
      principal: product.principal,
      annualRatePercent: product.ratePercent,
      termMonths: product.termMonths,
      isTaxFree: product.isTaxFree ?? false,
    });

    if (!ctx.savings) ctx.savings = [];
    ctx.savings.push({
      productName: product.name,
      totalDeposited: result.totalDeposited,
      totalInterest: result.totalInterest,
      maturityValue: result.maturityValue,
      isTaxFree: product.isTaxFree ?? false,
      taxFreeBenefit: result.taxFreeBenefit,
    });
    return;
  }

  // 그 외 (mutualAid, insurance) → 계산 엔진 없음. Claude 가 텍스트만 작성
}

/**
 * 메인 함수 — 익명 프로필을 받아 계산 컨텍스트 빌드.
 *
 * joinedProducts 와 proposedProducts 둘 다 처리.
 * (proposedProducts 는 가입 안 한 거지만, "이 상품 가입하면 만기 얼마" 시뮬 데이터 제공)
 */
export function buildCalcContext(
  profile: AnonymousProfile
): CalculationContext {
  const ctx: CalculationContext = {};

  for (const p of profile.joinedProducts ?? []) {
    processProduct(p, ctx);
  }
  for (const p of profile.proposedProducts ?? []) {
    processProduct(p, ctx);
  }

  return ctx;
}
