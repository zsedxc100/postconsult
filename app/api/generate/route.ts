/**
 * POST /api/generate
 *
 * 브라우저 → 익명 프로필 → 계산 엔진 → Claude → JSON 리포트 (슬롯 0~5)
 *
 * 절대 규칙:
 * - 입력에 PII 있으면 즉시 400 (Claude까지 가지 않음)
 * - 응답에는 어떤 PII도 포함되지 않음 ({고객명}, {담당자} placeholder만)
 *
 * 2026-04 리팩터링: 새 데이터 모델 (joinedProducts/proposedProducts/emphasizedProducts)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCalcContext, normalizeProfile } from "@/lib/build-calc-context";
import { generateReport } from "@/lib/claude";
import { PIIGuardError } from "@/lib/pii-guard";

// ─────────────────────────────────────────────
// Product 스키마
// ─────────────────────────────────────────────
const productSchema = z.object({
  type: z.enum(["savings", "loan", "mutualAid", "insurance", "pension"]),
  category: z.enum(["보장성", "저축성", "혼합"]).optional(),
  name: z.string().min(1),

  // 수신·연금
  monthlyDeposit: z.number().optional(),
  principal: z.number().optional(),
  ratePercent: z.number().optional(),
  termMonths: z.number().int().optional(),
  isTaxFree: z.boolean().optional(),
  midwayRate: z.string().optional(),
  maturityDate: z.string().optional(),

  // 여신
  loanPrincipal: z.number().optional(),
  loanRate: z.number().optional(),
  loanTermMonths: z.number().int().optional(),
  repayMethod: z.enum(["원리금균등", "원금균등", "만기일시"]).optional(),

  // 공통
  preferentialConditions: z.array(z.string()).optional(),
  specialNotes: z.string().optional(),
});

// ─────────────────────────────────────────────
// 익명 프로필 스키마
// ─────────────────────────────────────────────
const profileSchema = z.object({
  ageGroup: z.string().min(1),

  // 옵션 (정교화)
  familyStatus: z.string().optional(),
  childrenCount: z.number().int().optional(),
  dependentsCount: z.number().int().optional(),
  incomeRange: z.string().optional(),

  // 상품
  joinedProducts: z.array(productSchema).default([]),
  proposedProducts: z.array(productSchema).default([]),
  emphasizedProducts: z
    .array(z.object({ name: z.string().min(1), reason: z.string().optional() }))
    .max(3)
    .optional(),

  // 토픽
  topics: z.array(z.string()).default([]),

  // 성향 (3종 옵션)
  discType: z.enum(["D", "I", "S", "C"]).optional(),
  klontzType: z
    .enum(["avoidance", "worship", "status", "vigilance"])
    .optional(),
  freeNote: z.string().optional(),

  // 표시용
  branchName: z.string().optional(),
});

const requestSchema = z.object({
  profile: profileSchema,
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

    // 2. 정규화 (상품 카테고리 자동 채움 등)
    const profile = normalizeProfile(parsed.data.profile);

    // 3. 계산 엔진 실행 (PII 0)
    const calc = buildCalcContext(profile);

    // 4. Claude 호출 (generateReport 안에서 PII 가드 마지막 검문)
    const report = await generateReport({ profile, calc });

    // 5. 응답
    return NextResponse.json({ report, calc, profile });
  } catch (e) {
    if (e instanceof PIIGuardError) {
      return NextResponse.json(
        {
          error: "PII detected — request blocked",
          reasons: e.reasons,
        },
        { status: 400 }
      );
    }

    console.error("[/api/generate] error:", e);
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
