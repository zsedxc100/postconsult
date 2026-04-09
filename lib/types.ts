/**
 * 공유 타입 — 시스템 전체에서 쓰이는 데이터 모양 정의
 *
 * 새 구조 (2026-04 리팩터링):
 * - track/stage 매트릭스 제거
 * - joinedProducts / proposedProducts / emphasizedProducts 리스트 중심
 * - DISC + Klontz Money Scripts + 자유 메모 (3종 다 옵션)
 * - 나이는 필수, 가족·소득 등은 옵션 (정교화)
 * - 보장성 vs 저축성 자동 분류
 */

// ─────────────────────────────────────────────
// 1. 상품 (Product) — 시스템의 핵심 개념
// ─────────────────────────────────────────────

export type ProductType =
  | "savings"        // 정기적금·자유적립·청약·정기예금
  | "loan"           // 주담대·생활안정·사업자·신용 등
  | "mutualAid"      // 대출금상환공제·화재공제·종신공제
  | "insurance"      // 보험류 (실손·암·운전자 등)
  | "pension";       // 노란우산공제 등 연금형

export type ProductCategory = "보장성" | "저축성" | "혼합";

export type RepayMethod = "원리금균등" | "원금균등" | "만기일시";

export interface Product {
  type: ProductType;
  category?: ProductCategory; // 자동 분류 — type 으로부터 매핑
  name: string;               // 상품명 (자유 입력, 예: "정기적금 12개월", "주담대 30년")

  // ─── 수신·연금 ─────
  monthlyDeposit?: number;     // 월 납입액 (원)
  principal?: number;          // 일시 예치 원금 (정기예금)
  ratePercent?: number;        // 적용 금리 (%)
  termMonths?: number;         // 가입 기간 (개월)
  isTaxFree?: boolean;         // 비과세종합저축 적용
  midwayRate?: string;         // 중도해지 시 이율 (자유 텍스트, 예: "기본금리의 50%")
  maturityDate?: string;       // 만기일 (자유 텍스트, 예: "2027-04-08")

  // ─── 여신 ─────
  loanPrincipal?: number;
  loanRate?: number;
  loanTermMonths?: number;
  repayMethod?: RepayMethod;

  // ─── 공통 ─────
  preferentialConditions?: string[];  // 우대조건 ["조합원 +0.2%p", "급여이체 +0.1%p"]
  specialNotes?: string;              // 특이사항·주의사항 (자유 텍스트)
}

// ─────────────────────────────────────────────
// 2. 성향 분석 (3종, 다 옵션)
// ─────────────────────────────────────────────

/**
 * DISC — 대화 톤 분석 (영업 표준)
 */
export type DiscType = "D" | "I" | "S" | "C";

/**
 * Klontz Money Scripts — 돈에 대한 무의식적 신념
 * Brad Klontz, 2011. 금융 행동재무학 표준.
 *
 * - avoidance:  돈 얘기 부담, 단순함 선호 → 안전·자동화 강조
 * - worship:    돈을 통한 행복 추구 → 수익·복리·세제 혜택 강조
 * - status:     체면·VIP·우대 중시 → 조합원 우대·등급 강조
 * - vigilance:  신중·검소·안전 우선 → 원금보장·예금자보호 강조
 */
export type KlontzType = "avoidance" | "worship" | "status" | "vigilance";

// ─────────────────────────────────────────────
// 3. 익명 프로필 — Claude API 입력 (PII 0)
// ─────────────────────────────────────────────

export interface AnonymousProfile {
  // 필수: 재무설계 기본축
  ageGroup: string;              // "20대" | "30대" | ... | "70대+"

  // 옵션: 정교화 (있으면 더 정밀)
  familyStatus?: string;         // 미혼/기혼_무자녀/기혼_자녀/1인가구
  childrenCount?: number;        // 자녀 수
  dependentsCount?: number;      // 부양가족 수
  incomeRange?: string;          // 소득 구간 (예: "월 250-300만"), 구체 금액 X

  // 상품 (시스템의 핵심)
  joinedProducts: Product[];     // 오늘 가입한 상품 (0~N)
  proposedProducts: Product[];   // 직원이 권유한 상품 (0~N)
  emphasizedProducts?: {         // 직원이 강조하고 싶은 상품 (0~3)
    name: string;                //   - 상품명
    reason?: string;             //   - 직원 메모 (선택, 예: "이번 분기 주력")
  }[];

  // 상담 토픽 (자유 입력 또는 칩)
  topics: string[];

  // 성향 (3종 다 옵션, 다 비워도 동작)
  discType?: DiscType;
  klontzType?: KlontzType;
  freeNote?: string;             // 자유 메모 한 줄 (예: "꼼꼼하게 다 물어보심, 자료 원함")

  // 표시용 (PII 아님)
  branchName?: string;           // 기본값 "춘천신협"
}

// ─────────────────────────────────────────────
// 4. 계산 결과 — 계산 엔진이 미리 만든 숫자
// (Claude는 이 숫자를 만지지 않고 해석만 함)
// ─────────────────────────────────────────────

export interface CalculationContext {
  // 대출 관련 (joinedProducts/proposedProducts 에 loan 이 있을 때)
  loan?: {
    productName: string;
    monthlyPayment: number;
    totalInterest: number;
    earlyRepayment?: {
      extraMonthly: number;
      yearsSaved: number;
      interestSaved: number;
    }[];
    rateCut?: {
      cutPercentPoint: number;
      monthlySaving: number;
      totalInterestSaving: number;
    };
  }[];

  // 적금·예금 관련 (savings 가 있을 때)
  savings?: {
    productName: string;
    totalDeposited: number;
    totalInterest: number;
    maturityValue: number;
    isTaxFree: boolean;
    taxFreeBenefit?: number;     // 비과세 적용 시 추가 수령액
  }[];
}

// ─────────────────────────────────────────────
// 5. 리포트 출력 — Claude가 JSON으로 답함
// 슬롯 0~5 새 구조
// ─────────────────────────────────────────────

export interface JoinedProductCard {
  productName: string;
  summary: string;                          // 한 줄 요약
  keyDetails: { label: string; value: string }[]; // ex. [{label:"금리", value:"연 3.7%"}, ...]
  keepInMind: string[];                     // ⭐ 잊지 마세요 항목들 (우대조건·중도해지 등)
}

export interface ProposedProductCard {
  productName: string;
  description: string;     // 상품 설명
  reason: string;          // 왜 이 분에게 권유했는지 (CFP 근거)
}

export interface RecommendationCard {
  name: string;             // 추천 상품명
  shortComment: string;     // 한 줄 코멘트 (CFP 근거 또는 트렌드)
  isEmphasized?: boolean;   // ⭐ 직원이 강조한 상품
  cfpReason?: string;       // 펼침 시 표시 (옵션)
}

export interface ReportOutput {
  // ─── 카톡용 (4~6줄 짧음, 직원이 복사해서 카톡에 붙여넣기) ───
  kakaoMessage: string;

  // ─── 자세히 보기 페이지용 (슬롯 0~5) ───

  // 슬롯 0: 인사 멘트 (담당자 → 고객)
  greeting: string;

  // 슬롯 1: 오늘 가입한 상품 (joinedProducts 0개면 빈 배열)
  joinedProductsCards: JoinedProductCard[];

  // 슬롯 2: 권유받은 상품 (proposedProducts 0개면 빈 배열)
  proposedProductsCards: ProposedProductCard[];

  // 슬롯 3: AI 추천 상품 + 강조 상품 (간단 코멘트)
  recommendations: RecommendationCard[];

  // 슬롯 4: 신협이 안전한 이유 (수신/여신 톤 자동)
  whyShinhyup: string;

  // 슬롯 5: 클로징 (사무적, 안부 약속 X)
  closing: string;
}

// ─────────────────────────────────────────────
// 6. 헬퍼 — 상품 type → category 자동 분류
// ─────────────────────────────────────────────

export function categorizeProduct(type: ProductType): ProductCategory {
  switch (type) {
    case "savings":
      return "저축성";
    case "loan":
      return "저축성"; // 대출도 저축성 트랙 (시뮬·이자 기반)
    case "mutualAid":
    case "insurance":
      return "보장성";
    case "pension":
      return "혼합";
  }
}
