/**
 * 익명 프로필을 받아서 어떤 계산을 돌릴지 정하고, 결과를 CalculationContext 로 조립.
 *
 * 케이스별로 필요한 숫자가 다르기 때문에 이 함수가 분기 처리 담당.
 * 계산 엔진(lib/calc/) 자체는 이 함수 호출되기 전에는 모름.
 */

import { calcEqualPaymentSchedule } from "./calc/repayment";
import { calcEarlyRepaymentImpact } from "./calc/early-repayment";
import { calcRateCutImpact } from "./calc/rate-cut";
import { getDefaultLifeEvent } from "./lifecycle-map";
import type { AnonymousProfile, CalculationContext } from "./types";

/**
 * 익명 프로필의 lifeEvent 를 나이에 맞춰 자동 보정.
 * 사용자가 수동으로 지정한 값이 있으면 그대로 유지.
 */
export function normalizeProfile(profile: AnonymousProfile): AnonymousProfile {
  if (!profile.lifeEvent && profile.ageGroup) {
    const autoEvent = getDefaultLifeEvent(profile.ageGroup);
    if (autoEvent) {
      return { ...profile, lifeEvent: autoEvent };
    }
  }
  return profile;
}

export function buildCalcContext(
  profile: AnonymousProfile
): CalculationContext {
  const ctx: CalculationContext = {};

  // 여신 케이스 (C·D)는 대출 계산 필요
  if (
    profile.track === "loan" &&
    profile.loanPrincipal &&
    profile.loanTermMonths &&
    profile.interestRatePercent !== undefined
  ) {
    const loan = {
      principal: profile.loanPrincipal,
      annualRatePercent: profile.interestRatePercent,
      termMonths: profile.loanTermMonths,
    };

    // 1) 기본 상환 스케줄 (월 상환액·총 이자)
    const baseSchedule = calcEqualPaymentSchedule(loan);
    ctx.monthlyPayment = baseSchedule.monthlyPayment;
    ctx.totalInterest = baseSchedule.totalInterest;

    // 2) 약정 완료 케이스(D)는 추가 시나리오들
    if (profile.stage === "post_agreement") {
      // 중도상환 시나리오 4개 (5만/10만/20만/30만)
      const extraOptions = [50_000, 100_000, 200_000, 300_000];
      ctx.earlyRepayment = extraOptions.map((extra) => {
        const r = calcEarlyRepaymentImpact({
          loan,
          extraMonthly: extra,
        });
        return {
          extraMonthly: extra,
          yearsSaved: r.yearsSaved,
          interestSaved: r.interestSaved,
        };
      });

      // 금리인하요구권 0.3%p 시나리오
      const rateCut = calcRateCutImpact({
        loan,
        rateCutPercentPoint: 0.3,
      });
      ctx.rateCut = {
        cutPercentPoint: 0.3,
        monthlySaving: rateCut.monthlySaving,
        totalInterestSaving: rateCut.totalInterestSaving,
      };
    }
  }

  // 수신 케이스 (A·B) 는 추후 (savings-maturity 함수 만들면 추가)

  return ctx;
}
