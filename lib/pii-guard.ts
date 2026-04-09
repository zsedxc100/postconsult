/**
 * PII 가드레일 (검문소)
 *
 * 이 시스템의 가장 중요한 보안 코드. CLAUDE.md 절대 규칙 #1 을 코드로 강제.
 *
 * 두 곳에서 호출됨:
 * 1. 클라이언트(브라우저) — 폼 제출 직전, 사용자에게 즉시 피드백
 * 2. 서버(API 라우트) — Claude 호출 직전, 마지막 방어선
 *
 * 정책: 의심되면 차단. 거짓 양성(false positive)은 OK, 거짓 음성(false negative)은 절대 NOT OK.
 *
 * 2026-04 리팩터링:
 * - track/stage 필드 제거
 * - 상품 배열 (joinedProducts/proposedProducts/emphasizedProducts) 안까지 재귀 검사
 * - klontzType, freeNote, dependentsCount 등 새 필드 화이트리스트 추가
 */

// ─────────────────────────────────────────────
// PII 패턴들
// ─────────────────────────────────────────────

const PHONE_PATTERN = /01[016789][- ]?\d{3,4}[- ]?\d{4}/;
const ACCOUNT_PATTERN = /\d{3}[-]\d{2,6}[-]\d{4,}/;
const RESIDENT_ID_PATTERN = /\d{6}[-]\d{1,7}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const CARD_PATTERN = /(?:\d{4}[- ]?){3}\d{4}/;

// ─────────────────────────────────────────────
// 익명 프로필이 가져도 되는 필드 (화이트리스트)
// 새 필드 추가하려면 여기에 명시적으로 등록해야 함 (fail-secure)
// ─────────────────────────────────────────────
const ANONYMOUS_ALLOWED_FIELDS = new Set([
  // 필수
  "ageGroup",

  // 옵션 (정교화)
  "familyStatus",
  "childrenCount",
  "dependentsCount",
  "incomeRange",

  // 상품 (배열, 안까지 재귀 검사)
  "joinedProducts",
  "proposedProducts",
  "emphasizedProducts",

  // 상담 토픽
  "topics",

  // 성향 (3종 옵션)
  "discType",
  "klontzType",
  "freeNote",

  // 표시용
  "branchName",
]);

// 명시적 PII 필드 (있으면 무조건 차단)
const FORBIDDEN_FIELDS = new Set([
  "customerName",
  "customerPhone",
  "customerAccount",
  "customerEmail",
  "customerAddress",
  "customerResidentId",
  "consultantName",  // 담당자 이름도 PII (직원 식별 가능)
  "name",
  "phone",
  "account",
  "email",
  "address",
  "residentId",
  "cardNumber",
  // track/stage 는 이제 사용 안 함 → 발견되면 거부 안 하지만 unknown_field 로 잡힘
]);

// 상품 객체 안에 허용된 필드
const PRODUCT_ALLOWED_FIELDS = new Set([
  "type",
  "category",
  "name",
  // 수신·연금
  "monthlyDeposit",
  "principal",
  "ratePercent",
  "termMonths",
  "isTaxFree",
  "midwayRate",
  "maturityDate",
  // 여신
  "loanPrincipal",
  "loanRate",
  "loanTermMonths",
  "repayMethod",
  // 공통
  "preferentialConditions",
  "specialNotes",
]);

// 강조 상품 객체 안에 허용된 필드
const EMPHASIZED_PRODUCT_FIELDS = new Set(["name", "reason"]);

// ─────────────────────────────────────────────
// 결과 타입
// ─────────────────────────────────────────────
export interface PIIDetection {
  found: boolean;
  reasons: string[]; // 무엇이 발견됐는지 (실제 PII 값은 안 담음)
}

export class PIIGuardError extends Error {
  reasons: string[];
  constructor(message: string, reasons: string[]) {
    super(message);
    this.name = "PIIGuardError";
    this.reasons = reasons;
  }
}

// ─────────────────────────────────────────────
// 텍스트 한 덩어리 검사
// ─────────────────────────────────────────────
export function detectPIIInText(text: string): PIIDetection {
  const reasons: string[] = [];

  if (PHONE_PATTERN.test(text)) reasons.push("phone_number_pattern");
  if (ACCOUNT_PATTERN.test(text)) reasons.push("account_number_pattern");
  if (RESIDENT_ID_PATTERN.test(text)) reasons.push("resident_id_pattern");
  if (EMAIL_PATTERN.test(text)) reasons.push("email_pattern");
  if (CARD_PATTERN.test(text)) reasons.push("card_number_pattern");

  return { found: reasons.length > 0, reasons };
}

// ─────────────────────────────────────────────
// 값 (문자열·배열·객체) 안의 텍스트를 모두 재귀로 검사
// ─────────────────────────────────────────────
function scanValueForPII(value: unknown, path: string, reasons: string[]): void {
  if (typeof value === "string") {
    const detected = detectPIIInText(value);
    if (detected.found) {
      reasons.push(...detected.reasons.map((r) => `${path}:${r}`));
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => scanValueForPII(item, `${path}[${i}]`, reasons));
  } else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      scanValueForPII(v, `${path}.${k}`, reasons);
    }
  }
}

// ─────────────────────────────────────────────
// 상품 객체 한 개 검사 (필드명 + 값)
// ─────────────────────────────────────────────
// 상품 객체 안에서는 화이트리스트만으로 검사 (FORBIDDEN 검사 X)
// 이유: 상품의 "name" 필드는 상품명이라 PII 아님. 최상위에서는 차단해야 하지만
//      상품 안에서는 허용. 화이트리스트에 있는 필드만 OK, 나머지는 unknown_field 로 자동 차단.
function checkProductFields(
  product: unknown,
  arrayPath: string,
  index: number,
  reasons: string[],
  allowedFieldSet: Set<string> = PRODUCT_ALLOWED_FIELDS
): void {
  if (typeof product !== "object" || product === null) {
    reasons.push(`${arrayPath}[${index}]:not_object`);
    return;
  }

  const obj = product as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (!allowedFieldSet.has(key)) {
      reasons.push(`${arrayPath}[${index}]:unknown_field:${key}`);
      continue;
    }
    scanValueForPII(value, `${arrayPath}[${index}].${key}`, reasons);
  }
}

// ─────────────────────────────────────────────
// 익명 프로필 전체 검사 — 메인 진입점
// 외부 호출 직전 마지막 관문
// ─────────────────────────────────────────────
export function assertAnonymousProfile(profile: unknown): void {
  if (typeof profile !== "object" || profile === null) {
    throw new PIIGuardError("Profile must be an object", []);
  }

  const reasons: string[] = [];
  const obj = profile as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    // 1. 명시적 금지 필드명 확인
    if (FORBIDDEN_FIELDS.has(key)) {
      reasons.push(`forbidden_field:${key}`);
      continue;
    }

    // 2. 화이트리스트에 없는 필드는 거부 (fail-secure)
    if (!ANONYMOUS_ALLOWED_FIELDS.has(key)) {
      reasons.push(`unknown_field:${key}`);
      continue;
    }

    // 3. 상품 배열은 객체 안까지 검사
    if (key === "joinedProducts" || key === "proposedProducts") {
      if (!Array.isArray(value)) {
        reasons.push(`${key}:not_array`);
        continue;
      }
      value.forEach((p, i) =>
        checkProductFields(p, key, i, reasons, PRODUCT_ALLOWED_FIELDS)
      );
      continue;
    }

    // 4. 강조 상품 배열도 따로 (다른 필드 셋)
    if (key === "emphasizedProducts") {
      if (!Array.isArray(value)) {
        reasons.push(`${key}:not_array`);
        continue;
      }
      value.forEach((p, i) =>
        checkProductFields(p, key, i, reasons, EMPHASIZED_PRODUCT_FIELDS)
      );
      continue;
    }

    // 5. 그 외 필드 → 값 안까지 PII 패턴 검사
    scanValueForPII(value, key, reasons);
  }

  if (reasons.length > 0) {
    throw new PIIGuardError(
      "PII detected in profile — refusing to send to Claude",
      reasons
    );
  }
}
