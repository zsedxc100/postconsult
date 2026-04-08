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
 */

// ─────────────────────────────────────────────
// PII 패턴들
// ─────────────────────────────────────────────

/**
 * 한국 휴대폰 번호: 010-XXXX-XXXX, 011/016/017/018/019, 하이픈 유무 무관
 * 예: 010-1234-5678, 01012345678, 010 1234 5678
 */
const PHONE_PATTERN = /01[016789][- ]?\d{3,4}[- ]?\d{4}/;

/**
 * 한국 계좌번호: 보통 XXX-XX-XXXXXX 또는 XXX-XXX-XXXXXX 등
 * 좀 보수적으로: 숫자 3개 + 구분자 + 숫자 2~6개 + 구분자 + 숫자 4개+
 */
const ACCOUNT_PATTERN = /\d{3}[-]\d{2,6}[-]\d{4,}/;

/**
 * 주민등록번호: XXXXXX-X (앞 6자리 + 하이픈 + 1자리만 봐도 의심)
 * 예: 800101-1, 800101-1234567
 */
const RESIDENT_ID_PATTERN = /\d{6}[-]\d{1,7}/;

/**
 * 이메일 주소
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * 신용카드 번호: 4자리×4 = 16자리 (구분자 무관)
 */
const CARD_PATTERN = /(?:\d{4}[- ]?){3}\d{4}/;

/**
 * 한국 이름: 한글 2~4글자 (성+이름).
 * ⚠️ 가장 까다로운 검사. "안녕하세요" 같은 일반 한글도 잡힐 수 있음.
 * → 그래서 이건 "허용 필드" 화이트리스트와 함께 사용해.
 *    아래 isAnonymousProfile 함수에서 전체 검사.
 */
const KOREAN_NAME_LIKE = /[가-힣]{2,4}(?:님)?/;

// ─────────────────────────────────────────────
// 익명 프로필이 가져도 되는 필드 (화이트리스트)
// 이 필드들은 한글이 들어있어도 OK (생애이벤트, 직업 등)
// ─────────────────────────────────────────────
const ANONYMOUS_ALLOWED_FIELDS = new Set([
  "track",                  // savings | loan
  "stage",                  // consult_only | post_agreement 등
  "ageGroup",               // 20대, 30대...
  "lifeEvent",              // 청약, 자녀교육, 은퇴준비 등
  "familyStatus",           // 미혼, 기혼_자녀 등
  "discType",               // D, I, S, C
  "bitType",                // preserver, follower, independent, accumulator
  "loanPurpose",            // 주택, 생활자금, 사업자금 등
  "loanPrincipal",          // 숫자
  "loanTermMonths",         // 숫자
  "interestRatePercent",    // 숫자
  "repayMethod",            // 원리금균등, 원금균등, 만기일시
  "topicChips",             // 칩 라벨 배열
  "branchName",             // 지점 이름 (지점은 PII 아님)
  "consultantName",         // 담당자 이름은 PII로 분류 (직원 본인 식별 가능)
  // ↑ consultantName 은 익명 화이트리스트에서 제외!
]);

// 명시적 PII 필드 (있으면 무조건 차단)
const FORBIDDEN_FIELDS = new Set([
  "customerName",
  "customerPhone",
  "customerAccount",
  "customerEmail",
  "customerAddress",
  "customerResidentId",
  "name",
  "phone",
  "account",
  "email",
  "address",
  "residentId",
  "cardNumber",
]);

// ─────────────────────────────────────────────
// 결과 타입
// ─────────────────────────────────────────────
export interface PIIDetection {
  found: boolean;
  reasons: string[]; // 무엇이 발견됐는지 (디버깅·로그용 — 실제 PII 값은 안 담음)
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
// 객체 전체 검사 (필드별)
// 이게 진짜 사용할 함수.
// 익명 프로필이 외부로 나가기 직전 마지막 관문.
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

    // 2. 화이트리스트에 없는 필드는 거부 (안전한 기본값)
    //    새 필드 추가하려면 ANONYMOUS_ALLOWED_FIELDS 에 명시적으로 등록해야 함
    if (!ANONYMOUS_ALLOWED_FIELDS.has(key)) {
      reasons.push(`unknown_field:${key}`);
      continue;
    }

    // 3. 값이 문자열이면 PII 패턴 검사
    if (typeof value === "string") {
      const detected = detectPIIInText(value);
      if (detected.found) {
        reasons.push(...detected.reasons.map((r) => `${key}:${r}`));
      }
    }

    // 4. 배열이면 각 요소 검사 (topicChips 같은 경우)
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          const detected = detectPIIInText(item);
          if (detected.found) {
            reasons.push(...detected.reasons.map((r) => `${key}[]:${r}`));
          }
        }
      }
    }
  }

  if (reasons.length > 0) {
    throw new PIIGuardError(
      "PII detected in profile — refusing to send to Claude",
      reasons
    );
  }
}

// ─────────────────────────────────────────────
// 전용 에러 클래스
// (일반 Error 와 구분해서 잡기 쉽게)
// ─────────────────────────────────────────────
export class PIIGuardError extends Error {
  reasons: string[];

  constructor(message: string, reasons: string[]) {
    super(message);
    this.name = "PIIGuardError";
    this.reasons = reasons;
  }
}
