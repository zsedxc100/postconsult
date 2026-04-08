/**
 * 나이 → 생애주기 단계 자동 매핑
 *
 * CFP 프레임워크 기반. 사용자가 수동으로 선택하지 않아도 기본값이 되어줌.
 * (특별한 경우엔 폼에서 override 가능하지만 기본적으로는 자동)
 */

export type AgeGroup =
  | "20대"
  | "30대"
  | "40대"
  | "50대"
  | "60대"
  | "70대+";

export interface LifecycleStage {
  stage: string;           // 단계 이름
  primaryFocus: string;    // 주요 과제
  lifeEvent: string;       // 대표 생애 이벤트
  description: string;     // 한 줄 설명
}

const LIFECYCLE_MAP: Record<AgeGroup, LifecycleStage> = {
  "20대": {
    stage: "사회초년생",
    primaryFocus: "종잣돈·신용·비상자금",
    lifeEvent: "청약",
    description: "자산 형성 시작, 신용 습관 구축, 비상자금 3개월치 확보",
  },
  "30대": {
    stage: "가정 형성기",
    primaryFocus: "주택구입·자녀출산·보장설계",
    lifeEvent: "결혼",
    description: "가정 형성, 주택 준비, 자녀 출산 대비, 첫 보장 설계",
  },
  "40대": {
    stage: "자녀 양육기",
    primaryFocus: "교육자금·주담대관리·노후준비 시작",
    lifeEvent: "자녀교육",
    description: "지출 정점기. 교육자금 마련, 대출 관리, 가장 역할 집중",
  },
  "50대": {
    stage: "자녀 독립기",
    primaryFocus: "노후자금 가속·대출청산",
    lifeEvent: "은퇴준비",
    description: "자녀 독립 지원 마무리, 은퇴 자금 본격 적립",
  },
  "60대": {
    stage: "은퇴 준비기/초기",
    primaryFocus: "현금흐름·의료비·자산보존",
    lifeEvent: "은퇴후",
    description: "현금흐름 안정화, 의료비 대비, 안정형 자산 배분",
  },
  "70대+": {
    stage: "은퇴 생활기",
    primaryFocus: "자산보존·상속·의료비",
    lifeEvent: "은퇴후",
    description: "자산 보존, 상속 계획, 안정성 최우선",
  },
};

export function getLifecycleStage(ageGroup: string): LifecycleStage | null {
  return LIFECYCLE_MAP[ageGroup as AgeGroup] ?? null;
}

export function getDefaultLifeEvent(ageGroup: string): string | null {
  return LIFECYCLE_MAP[ageGroup as AgeGroup]?.lifeEvent ?? null;
}

/**
 * 생애주기 재무 곡선 데이터 (그래프용)
 * 연령대별로 "필요 자금" 상대값 (0~100)
 */
export function getLifecycleCurve(): Array<{
  age: number;
  expenditure: number;
  income: number;
  label: string;
}> {
  return [
    { age: 25, expenditure: 30, income: 40, label: "20대" },
    { age: 30, expenditure: 55, income: 60, label: "30대 초" },
    { age: 35, expenditure: 70, income: 75, label: "30대 후" },
    { age: 40, expenditure: 90, income: 85, label: "40대 초" },
    { age: 45, expenditure: 100, income: 95, label: "40대 후" }, // 지출 정점
    { age: 50, expenditure: 85, income: 100, label: "50대 초" }, // 소득 정점
    { age: 55, expenditure: 70, income: 90, label: "50대 후" },
    { age: 60, expenditure: 60, income: 60, label: "60대 초" },
    { age: 65, expenditure: 55, income: 30, label: "60대 후" },
    { age: 70, expenditure: 50, income: 20, label: "70대" },
    { age: 75, expenditure: 55, income: 15, label: "70대 후" },
  ];
}
