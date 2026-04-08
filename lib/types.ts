/**
 * 공유 타입 — 시스템 전체에서 쓰이는 데이터 모양 정의
 *
 * 한 곳에 모아두면 코드가 일관돼. 이 파일에 정의된 타입을 다른 파일들이 import 해서 씀.
 */

// ─────────────────────────────────────────────
// 1. 익명 프로필 — Claude에 보내는 입력 (PII 0)
// ─────────────────────────────────────────────
export type Track = "savings" | "loan";

export type Stage =
  | "consult_only"      // A: 상담만
  | "product_signed"    // B: 수신 가입 완료
  | "pre_agreement"     // C: 여신 약정 전
  | "post_agreement";   // D: 여신 약정 완료 (골든 페르소나)

export type DiscType = "D" | "I" | "S" | "C";

export type BitType =
  | "preserver"
  | "follower"
  | "independent"
  | "accumulator";

export type RepayMethod = "원리금균등" | "원금균등" | "만기일시";

export interface AnonymousProfile {
  track: Track;
  stage: Stage;
  ageGroup?: string;          // "40대"
  lifeEvent?: string;         // "자녀교육"
  familyStatus?: string;      // "기혼_자녀"
  discType?: DiscType;
  bitType?: BitType;

  // 여신 전용
  loanPurpose?: string;       // "주택"
  loanPrincipal?: number;     // 250000000
  loanTermMonths?: number;    // 360
  interestRatePercent?: number; // 4.2
  repayMethod?: RepayMethod;

  // 칩
  topicChips?: string[];

  // 표시용 (비PII)
  branchName?: string;        // "OO지점"
}

// ─────────────────────────────────────────────
// 2. 계산 결과 — 계산 엔진이 미리 만든 숫자
// (Claude는 이 숫자를 만지지 않고 해석만 함)
// ─────────────────────────────────────────────
export interface CalculationContext {
  monthlyPayment?: number;
  totalInterest?: number;

  // 중도상환 시뮬 (여러 시나리오)
  earlyRepayment?: {
    extraMonthly: number;
    yearsSaved: number;
    interestSaved: number;
  }[];

  // 금리인하 시뮬
  rateCut?: {
    cutPercentPoint: number;
    monthlySaving: number;
    totalInterestSaving: number;
  };
}

// ─────────────────────────────────────────────
// 3. 리포트 출력 구조 — Claude가 JSON으로 답함
// 이 구조 그대로 슬롯 컴포넌트가 렌더
// ─────────────────────────────────────────────
export interface ReportOutput {
  // 슬롯 1: Hero
  hero: {
    headline: string;          // "오늘의 핵심: ..." (50자 이내)
    bigNumberValue: string;    // "약 4,500만원" 같은 형식화된 문자열
    bigNumberLabel: string;    // "평생 절감 가능 이자"
  };

  // 슬롯 2: 오늘의 상담
  todaysSummary: {
    topicChips: string[];      // 표시용 칩 라벨
    summaryLines: string[];    // 3줄 요약
  };

  // 슬롯 3: 분석·시뮬레이션 (텍스트 해설만; 그래프 데이터는 계산엔진에서)
  analysisExplanation: string;

  // 슬롯 4: 왜 신협인가 (공통 고정 내용 — 일단 Claude가 카피만 다듬음)
  whyShinhyup: string;

  // 슬롯 5: 다음 단계 (추천 카드들)
  nextSteps: {
    title: string;
    reason: string;            // CFP 근거 한 줄
  }[];

  // 슬롯 6: 교차 전략
  crossStrategy: string;

  // 슬롯 7: 클로징
  closing: string;

  // 카카오톡 미리보기용 — 단축 알림톡 본문 (1000자 이내)
  alimTalkBody: string;
}
