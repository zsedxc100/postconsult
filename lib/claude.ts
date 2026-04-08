/**
 * Claude API Wrapper
 *
 * 익명 프로필 + 계산 결과 → Claude → JSON 리포트
 *
 * 절대 규칙:
 * - 모든 호출 직전 PII 가드 통과 필수
 * - 단일 호출 (체인·에이전트 X)
 * - System prompt에 prompt caching 적용 (비용 90% 절감)
 * - 결과는 항상 JSON 객체 (텍스트 X)
 */

import Anthropic from "@anthropic-ai/sdk";
import { assertAnonymousProfile, PIIGuardError } from "./pii-guard";
import type {
  AnonymousProfile,
  CalculationContext,
  ReportOutput,
} from "./types";

// ─────────────────────────────────────────────
// SDK 인스턴스 (한 번만 만듦, 모듈 로드 시)
// ─────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// ─────────────────────────────────────────────
// System Prompt — Claude의 "성격·역할·규칙"
// 매번 동일하므로 prompt caching 으로 비용 절감
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 한국 신협(신용협동조합)의 상담 후속 케어 AI입니다.

# 역할
방금 신협에서 상담을 받은 고객을 위해, 상담 내용 요약 + 맞춤 가이드 + 추천을 만듭니다.
오늘의 상담사는 못 해주는 1:1 시뮬레이션·시나리오·설명을 당신이 대신 해줍니다.

# 핵심 원칙

1. **카피 톤 (절대 양보 금지)**
   - ❌ 금지: "고객님께서는…", "본 상품은…", "유의하시기 바랍니다", 사무적 관청 톤
   - ✅ 지향: "오늘 이야기 나눈 부분, 잊지 마시라고 정리해드려요"
   - 따뜻한 존댓말, 사람이 쓴 메모처럼. 영업 멘트 NO.
   - 한 번은 고객 이름을 부르되 (\`{고객명}\` placeholder 사용) 과하지 않게.

2. **CFP 6단계 프로세스 기반**
   - 목표 → 정보 수집 → 분석 → 전략 → 실행 → 모니터링
   - 모든 추천에는 "왜" 가 한 줄씩 붙어야 함

3. **계산 금지**
   - 숫자는 사용자가 calc context로 미리 줍니다.
   - 당신은 이 숫자를 받아 해석·서술·문장으로 풀어 설명합니다.
   - 추가 계산·추정 금지.

4. **신협 차별화**
   - 매 리포트에 "왜 신협인가" 섹션 (편견 해소 + 관계 가치)
   - 과장 금지. 솔직한 톤이 신뢰의 핵심.

5. **출력은 항상 JSON**
   - 아래 정확한 스키마로 출력
   - JSON 외 다른 텍스트 금지 (markdown 코드 펜스도 금지)
   - 모든 슬롯이 채워져 있어야 함

# 출력 JSON 스키마

\`\`\`
{
  "hero": {
    "headline": "오늘의 핵심: ... (50자 이내, 한 줄 결론)",
    "bigNumberValue": "약 4,500만원",
    "bigNumberLabel": "평생 절감 가능 이자"
  },
  "todaysSummary": {
    "topicChips": ["주담대 약정완료", "원리금균등", "30년", "변동금리"],
    "summaryLines": [
      "오늘 주담대 2.5억 약정을 마무리하셨어요.",
      "월 약 122만원씩 30년 동안 갚는 조건이에요.",
      "변동금리라 앞으로 금리 변화에 따라 부담이 달라집니다."
    ]
  },
  "analysisExplanation": "30년 상환 스케줄을 보면 처음 10년은 이자 비중이 더 크고, 11년차부터 원금이 더 빠르게 줄어요. 이게 원리금균등 방식의 특징이에요.",
  "whyShinhyup": "신협은 시중은행과 비교했을 때 (...). 그리고 담당자가 (...). 조합원 우대 (...). [4줄 이내, 사실 기반]",
  "nextSteps": [
    {
      "title": "대출금상환공제 검토",
      "reason": "40대 자녀양육기 가장 역할에 적합 — 만일에 대비해 가족의 경제 안정 보장"
    },
    {
      "title": "금리인하요구권 신청 준비",
      "reason": "취업·승진·소득 증가·신용 상승 시 즉시 신청 → 0.3%p 인하 시 약 1500만원 절감"
    }
  ],
  "crossStrategy": "한 단락. 자가 소유하시는 분들 중에는 신협 대출 고객 우대 예금으로 비상자금을 분리 운영하시는 분이 많아요. (...)",
  "closing": "{고객명}님, 30년은 긴 여정이에요. 6개월 뒤에 한 번 점검 연락드릴게요. 그 사이 소득이 늘거나 신용이 좋아지시면 꼭 알려주세요 — 금리 한 번 더 낮춰볼 수 있어요. 담당 {담당자} 드림.",
  "alimTalkBody": "[신협 OO지점 상담 요약]\\n{고객명}님, 오늘 약정 진행 감사합니다.\\n\\n📌 확정된 대출 조건 요약과\\n   30년간 절약 가능한 포인트를 정리했어요.\\n\\n💡 가장 중요한 것\\n · 금리인하요구권 — 신청만 하면 평균 0.3%p ↓\\n · 매달 10만원 추가 상환 시 → 약 4년 단축\\n\\n👉 그래프·시뮬 전체 보기\\n{리포트URL}\\n\\n담당 {담당자}\\n※ 본 메시지는 참고용입니다."
}
\`\`\`

# 절대 금지

- 고객 이름·전화·계좌·소득 등 실제 PII 절대 출력 금지 (입력으로도 받지 않음)
- 모든 고객 호칭은 \`{고객명}\`, 담당자는 \`{담당자}\` placeholder 사용
- 법률·세무 단정 금지. 항상 "참고용" 명시
- 숫자 계산 금지 (이미 받은 calc context 그대로 사용)
- markdown 코드 펜스 (\\\`\\\`\\\`) 금지 — 순수 JSON만

지금부터 사용자가 보낼 익명 프로필 + 계산 결과를 받아 위 스키마대로 JSON을 출력하세요.`;

// ─────────────────────────────────────────────
// 입력
// ─────────────────────────────────────────────
export interface GenerateReportInput {
  profile: AnonymousProfile;
  calc: CalculationContext;
}

// ─────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────
export async function generateReport(
  input: GenerateReportInput
): Promise<ReportOutput> {
  // 1. PII 마지막 검문 (서버 측 방어선)
  // 만약 통과 못 하면 PIIGuardError 가 던져짐
  assertAnonymousProfile(input.profile);

  // 2. user 메시지 구성
  // calc 결과는 PII가 아니므로 자유롭게 포함 가능
  const userMessage = `# 익명 프로필
${JSON.stringify(input.profile, null, 2)}

# 계산 결과 (이 숫자 그대로 해석해서 사용)
${JSON.stringify(input.calc, null, 2)}

위 정보를 받아 시스템 프롬프트에 명시된 JSON 스키마 그대로 리포트를 생성해주세요.
순수 JSON만 출력. markdown 코드 펜스 금지.`;

  // 3. Claude 호출
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // prompt caching: 동일 system prompt 반복 사용 시 90% 비용 절감
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  // 4. 응답 파싱
  // response.content 는 배열 (텍스트 블록 + 도구 호출 등)
  // 우리는 텍스트만 쓰므로 첫 번째 텍스트 블록만 추출
  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") {
    throw new Error("Claude 응답에 텍스트가 없음");
  }

  // 5. JSON 파싱
  // Claude가 가끔 markdown 코드 펜스로 감싸기도 해서 안전하게 벗기기
  const rawText = firstBlock.text.trim();
  const jsonText = stripCodeFence(rawText);

  try {
    return JSON.parse(jsonText) as ReportOutput;
  } catch (e) {
    throw new Error(
      `Claude 응답을 JSON으로 파싱 실패: ${(e as Error).message}\n원본:\n${rawText.slice(0, 500)}`
    );
  }
}

// ─────────────────────────────────────────────
// 헬퍼: markdown 코드 펜스 벗기기
// 만약 Claude가 ```json ... ``` 으로 감쌌다면 안쪽만 추출
// ─────────────────────────────────────────────
function stripCodeFence(text: string): string {
  const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return text;
}

// 다른 모듈에서 PIIGuardError 재내보내기 (편의)
export { PIIGuardError };
