"use client";

/**
 * 리포트 페이지 — Phase 1.3d (못생긴 버전, 디자인 0%)
 *
 * Zero-PII:
 * - URL fragment(#) 에서 모든 데이터 읽음
 * - 서버는 fragment 를 못 봄
 * - 페이지 새로고침해도 fragment 는 유지됨 (브라우저 history)
 * - 다른 사람과 URL 공유 시 #뒤가 같이 가야 함
 *
 * 슬롯 7개를 텍스트로만 표시. 디자인은 Phase 2~3.
 */

import { useEffect, useState } from "react";
import type { ReportOutput, CalculationContext } from "@/lib/types";

interface ReportPayload {
  report: ReportOutput;
  calc: CalculationContext;
  customerName: string;
  consultantName: string;
}

export default function ReportPage() {
  const [data, setData] = useState<ReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // URL fragment 읽기 (#뒤 부분)
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setError("리포트 데이터가 없어요. /new 에서 먼저 생성해주세요.");
        return;
      }
      const decoded = decodeURIComponent(hash);
      const json = decodeURIComponent(escape(atob(decoded)));
      const parsed = JSON.parse(json) as ReportPayload;
      setData(parsed);
    } catch (e) {
      setError(`디코딩 실패: ${(e as Error).message}`);
    }
  }, []);

  if (error) {
    return (
      <main style={pageStyle}>
        <p style={{ color: "#dc2626" }}>❌ {error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={pageStyle}>
        <p>로딩 중…</p>
      </main>
    );
  }

  const { report, calc, customerName, consultantName } = data;

  // 모든 placeholder 를 진짜 이름으로 치환 (브라우저 안에서만)
  const fill = (s: string) =>
    s.replace(/\{고객명\}/g, customerName).replace(/\{담당자\}/g, consultantName);

  return (
    <main style={pageStyle}>
      <div style={{ marginBottom: 16, padding: 8, background: "#fef3c7", borderRadius: 4, fontSize: 12 }}>
        ⚠️ Phase 1.3d 미완성 디자인. Phase 2부터 와우 작업.
      </div>

      {/* 슬롯 1 — Hero */}
      <Section title="슬롯 1 — Hero">
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{fill(report.hero.headline)}</h2>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#16a34a" }}>
          {report.hero.bigNumberValue}
        </div>
        <div style={{ color: "#666" }}>{report.hero.bigNumberLabel}</div>
      </Section>

      {/* 슬롯 2 — 오늘의 상담 */}
      <Section title="슬롯 2 — 오늘의 상담">
        <div style={{ marginBottom: 8 }}>
          {report.todaysSummary.topicChips.map((chip) => (
            <span key={chip} style={chipStyle}>
              {chip}
            </span>
          ))}
        </div>
        {report.todaysSummary.summaryLines.map((line, i) => (
          <p key={i} style={{ margin: "4px 0" }}>• {fill(line)}</p>
        ))}
      </Section>

      {/* 슬롯 3 — 분석·시뮬레이션 (텍스트만, 그래프는 Phase 3) */}
      <Section title="슬롯 3 — 분석·시뮬레이션">
        <p>{fill(report.analysisExplanation)}</p>
        {calc.monthlyPayment && (
          <p style={{ color: "#666", fontSize: 13 }}>
            (계산 결과 — 월 상환 {Math.round(calc.monthlyPayment).toLocaleString()}원, 총 이자 {Math.round((calc.totalInterest ?? 0) / 10000).toLocaleString()}만원)
          </p>
        )}
        {calc.earlyRepayment && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", color: "#16a34a" }}>
              중도상환 시나리오 보기
            </summary>
            <ul>
              {calc.earlyRepayment.map((s) => (
                <li key={s.extraMonthly}>
                  매달 +{(s.extraMonthly / 10000).toLocaleString()}만원 → {s.yearsSaved.toFixed(1)}년 단축, {Math.round(s.interestSaved / 10000).toLocaleString()}만원 절감
                </li>
              ))}
            </ul>
          </details>
        )}
        {calc.rateCut && (
          <p style={{ color: "#666", fontSize: 13 }}>
            금리인하 {calc.rateCut.cutPercentPoint}%p → 월 {Math.round(calc.rateCut.monthlySaving).toLocaleString()}원 ↓, 총 {Math.round(calc.rateCut.totalInterestSaving / 10000).toLocaleString()}만원 절감
          </p>
        )}
      </Section>

      {/* 슬롯 4 — 왜 신협인가 */}
      <Section title="슬롯 4 — 왜 신협인가">
        <p style={{ whiteSpace: "pre-line" }}>{fill(report.whyShinhyup)}</p>
      </Section>

      {/* 슬롯 5 — 다음 단계 */}
      <Section title="슬롯 5 — 다음 단계 (추천)">
        {report.nextSteps.map((step, i) => (
          <div key={i} style={{ marginBottom: 12, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
            <strong>{step.title}</strong>
            <p style={{ margin: "4px 0 0", color: "#666", fontSize: 13 }}>{step.reason}</p>
          </div>
        ))}
      </Section>

      {/* 슬롯 6 — 교차 전략 */}
      <Section title="슬롯 6 — 교차 전략">
        <p>{fill(report.crossStrategy)}</p>
      </Section>

      {/* 슬롯 7 — 클로징 */}
      <Section title="슬롯 7 — 클로징">
        <p style={{ fontStyle: "italic", color: "#444" }}>{fill(report.closing)}</p>
      </Section>

      {/* 카카오톡 미리보기 (Phase 1.3e 자리) */}
      <Section title="📱 알림톡 본문 (카톡 복사용)">
        <pre style={{
          background: "#fef9c3",
          padding: 16,
          borderRadius: 8,
          whiteSpace: "pre-wrap",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          {fill(report.alimTalkBody)}
        </pre>
        <button
          onClick={() => {
            navigator.clipboard.writeText(fill(report.alimTalkBody));
            alert("복사됨! 업무폰 카톡에서 붙여넣으세요.");
          }}
          style={{
            marginTop: 8,
            padding: "8px 16px",
            background: "#fbbf24",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📋 본문 복사하기
        </button>
      </Section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "40px auto",
  padding: 24,
  fontFamily: "system-ui, sans-serif",
};

const chipStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  margin: "2px 4px 2px 0",
  background: "#dbeafe",
  color: "#1e40af",
  borderRadius: 12,
  fontSize: 12,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </h3>
      {children}
    </section>
  );
}
