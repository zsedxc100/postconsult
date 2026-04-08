"use client";

/**
 * 직원 입력 폼 — D 케이스 (여신 약정 완료) 만 우선
 *
 * Zero-PII 원칙:
 * - 고객명·전화는 React state에만, 새로고침 시 사라짐
 * - 서버에는 익명 프로필만 전송
 * - 생성 후 결과를 URL fragment(#)에 base64로 박아서 리포트 페이지로 이동
 * - 서버는 리포트 본문도 저장하지 않음
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnonymousProfile, ReportOutput, CalculationContext } from "@/lib/types";

export default function NewReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PII (브라우저 메모리에만, 서버 절대 안 감)
  const [customerName, setCustomerName] = useState("");
  const [consultantName, setConsultantName] = useState("");

  // 익명 프로필 필드 (lifeEvent 는 서버에서 ageGroup 으로부터 자동 매핑)
  const [profile, setProfile] = useState<AnonymousProfile>({
    track: "loan",
    stage: "post_agreement",
    ageGroup: "40대",
    familyStatus: "기혼_자녀",
    discType: "S",
    bitType: "preserver",
    loanPurpose: "주택",
    loanPrincipal: 250_000_000,
    loanTermMonths: 360,
    interestRatePercent: 4.2,
    repayMethod: "원리금균등",
    topicChips: ["주담대 약정완료", "금리인하요구권", "중도상환검토", "대출금상환공제"],
    branchName: "OO지점",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. 서버에 익명 프로필만 전송
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error ?? "Generation failed");
      }

      const data = (await res.json()) as {
        report: ReportOutput;
        calc: CalculationContext;
      };

      // 2. 리포트 + PII 정보를 URL fragment 에 박기
      // fragment(#) 는 서버에 절대 전송되지 않음
      // profile 도 같이 넣음 (그래프 그리려면 원금·금리·기간 필요)
      const payload = {
        report: data.report,
        calc: data.calc,
        profile,
        customerName,
        consultantName,
      };
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));

      // 3. 리포트 페이지로 이동 (랜덤 ID + fragment)
      const reportId = Math.random().toString(36).slice(2, 10);
      router.push(`/r/${reportId}#${encoded}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>PostConsult — 새 리포트 생성</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Zero-PII 시범 모드. 고객명·담당자명은 브라우저에만 머무름.
      </p>

      <form onSubmit={handleSubmit}>
        {/* PII 입력 (브라우저 전용) */}
        <fieldset style={{ marginBottom: 24, padding: 16, border: "1px solid #fdba74", borderRadius: 8, background: "#fff7ed" }}>
          <legend style={{ padding: "0 8px", color: "#9a3412" }}>👤 PII (브라우저에만 머무름)</legend>
          <Field label="고객명">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="김상민"
              style={inputStyle}
              required
            />
          </Field>
          <Field label="담당자명">
            <input
              type="text"
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
              placeholder="박OO"
              style={inputStyle}
              required
            />
          </Field>
        </fieldset>

        {/* 익명 프로필 (Claude로 전송됨) */}
        <fieldset style={{ marginBottom: 24, padding: 16, border: "1px solid #86efac", borderRadius: 8, background: "#f0fdf4" }}>
          <legend style={{ padding: "0 8px", color: "#166534" }}>📋 익명 프로필 (Claude로 전송)</legend>

          <Field label="업무">
            <select
              value={profile.track}
              onChange={(e) => setProfile({ ...profile, track: e.target.value as "loan" | "savings" })}
              style={inputStyle}
            >
              <option value="loan">여신 (대출)</option>
              <option value="savings">수신 (예금) — 추후</option>
            </select>
          </Field>

          <Field label="단계">
            <select
              value={profile.stage}
              onChange={(e) => setProfile({ ...profile, stage: e.target.value as AnonymousProfile["stage"] })}
              style={inputStyle}
            >
              <option value="post_agreement">D — 여신 약정 완료 (골든 페르소나)</option>
              <option value="pre_agreement">C — 여신 약정 전</option>
              <option value="product_signed">B — 수신 가입 완료</option>
              <option value="consult_only">A — 상담만</option>
            </select>
          </Field>

          <Field label="연령대 (생애주기는 자동 매핑)">
            <select
              value={profile.ageGroup}
              onChange={(e) => setProfile({ ...profile, ageGroup: e.target.value })}
              style={inputStyle}
            >
              <option value="20대">20대 — 사회초년생 (청약·종잣돈)</option>
              <option value="30대">30대 — 가정 형성기 (결혼·출산·주택)</option>
              <option value="40대">40대 — 자녀 양육기 (교육·주담대·보장)</option>
              <option value="50대">50대 — 자녀 독립기 (노후 가속)</option>
              <option value="60대">60대 — 은퇴 준비기 (현금흐름)</option>
              <option value="70대+">70대+ — 은퇴 생활기 (자산 보존)</option>
            </select>
          </Field>

          <Field label="DISC 성향">
            <select
              value={profile.discType}
              onChange={(e) => setProfile({ ...profile, discType: e.target.value as AnonymousProfile["discType"] })}
              style={inputStyle}
            >
              <option value="D">D — 주도형 (결론 먼저, 직설)</option>
              <option value="I">I — 사교형 (밝고 친근)</option>
              <option value="S">S — 안정형 (신중, 단계별)</option>
              <option value="C">C — 신중형 (분석, 수치)</option>
            </select>
          </Field>

          <Field label="투자 성향 (BIT)">
            <select
              value={profile.bitType}
              onChange={(e) => setProfile({ ...profile, bitType: e.target.value as AnonymousProfile["bitType"] })}
              style={inputStyle}
            >
              <option value="preserver">Preserver — 안정 추구</option>
              <option value="follower">Follower — 추종형</option>
              <option value="independent">Independent — 독립형</option>
              <option value="accumulator">Accumulator — 축적형</option>
            </select>
          </Field>

          <Field label="대출 원금 (원)">
            <input
              type="number"
              value={profile.loanPrincipal ?? ""}
              onChange={(e) => setProfile({ ...profile, loanPrincipal: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>

          <Field label="대출 기간 (개월)">
            <input
              type="number"
              value={profile.loanTermMonths ?? ""}
              onChange={(e) => setProfile({ ...profile, loanTermMonths: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>

          <Field label="연 이율 (%)">
            <input
              type="number"
              step="0.01"
              value={profile.interestRatePercent ?? ""}
              onChange={(e) => setProfile({ ...profile, interestRatePercent: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>

          <Field label="지점명">
            <input
              type="text"
              value={profile.branchName ?? ""}
              onChange={(e) => setProfile({ ...profile, branchName: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </fieldset>

        {error && (
          <div style={{ padding: 12, background: "#fef2f2", color: "#991b1b", borderRadius: 8, marginBottom: 16 }}>
            ❌ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: loading ? "#9ca3af" : "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "리포트 생성 중... (Claude 호출 1~3초)" : "리포트 생성"}
        </button>
      </form>
    </main>
  );
}

// ─────────────────────────────────────────────
// 작은 헬퍼 컴포넌트
// ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  background: "white",
};
