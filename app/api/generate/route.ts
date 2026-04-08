/**
 * POST /api/generate
 *
 * 브라우저 → 익명 프로필 → 계산 엔진 → Claude → JSON 리포트
 *
 * 절대 규칙:
 * - 입력에 PII 있으면 즉시 400 (Claude까지 가지 않음)
 * - 응답에는 어떤 PII도 포함되지 않음 ({고객명}, {담당자} placeholder만)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCalcContext, normalizeProfile } from "@/lib/build-calc-context";
import { generateReport } from "@/lib/claude";
import { PIIGuardError } from "@/lib/pii-guard";

// ─────────────────────────────────────────────
// 입력 스키마 (zod 로 검증)
// — Form에서 보낸 익명 프로필 모양이 맞는지 확인
// ─────────────────────────────────────────────
const requestSchema = z.object({
  profile: z.object({
    track: z.enum(["savings", "loan"]),
    stage: z.enum([
      "consult_only",
      "product_signed",
      "pre_agreement",
      "post_agreement",
    ]),
    ageGroup: z.string().optional(),
    lifeEvent: z.string().optional(),
    familyStatus: z.string().optional(),
    discType: z.enum(["D", "I", "S", "C"]).optional(),
    bitType: z
      .enum(["preserver", "follower", "independent", "accumulator"])
      .optional(),
    loanPurpose: z.string().optional(),
    loanPrincipal: z.number().optional(),
    loanTermMonths: z.number().optional(),
    interestRatePercent: z.number().optional(),
    repayMethod: z.enum(["원리금균등", "원금균등", "만기일시"]).optional(),
    topicChips: z.array(z.string()).optional(),
    branchName: z.string().optional(),
  }),
});

// ─────────────────────────────────────────────
// POST 핸들러
// ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // 1. 입력 파싱·검증
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request shape", details: parsed.error.issues },
        { status: 400 }
      );
    }
    // 2. 나이 → 생애주기 자동 매핑 (수동 선택 없어도 동작)
    const profile = normalizeProfile(parsed.data.profile);

    // 3. 계산 엔진 실행 (PII 0)
    const calc = buildCalcContext(profile);

    // 3. Claude 호출
    //    generateReport 안에서 PII 가드가 한 번 더 검문
    const report = await generateReport({ profile, calc });

    // 4. 응답
    return NextResponse.json({ report, calc });
  } catch (e) {
    // PII 가드 에러 → 400 + 이유
    if (e instanceof PIIGuardError) {
      return NextResponse.json(
        {
          error: "PII detected — request blocked",
          reasons: e.reasons,
        },
        { status: 400 }
      );
    }

    // 그 외 에러 → 500
    console.error("[/api/generate] error:", e);
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
