"use client";

/**
 * 리포트 페이지 (가독성 개선 버전)
 *
 * Zero-PII:
 * - URL fragment(#) 에서 모든 데이터 읽음
 * - 서버는 fragment 를 못 봄
 *
 * Phase 2 의 Hero Wow 디자인 전 중간 가독성 개선 버전.
 * 카드 레이아웃, 여백, 타이포그래피 정리 + Recharts 그래프 1개 추가.
 */

import { useEffect, useState } from "react";
import { RepaymentChart } from "@/components/RepaymentChart";
import type { ReportOutput, CalculationContext, AnonymousProfile } from "@/lib/types";

interface ReportPayload {
  report: ReportOutput;
  calc: CalculationContext;
  customerName: string;
  consultantName: string;
  profile?: AnonymousProfile;
}

export default function ReportPage() {
  const [data, setData] = useState<ReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
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
      <main style={styles.page}>
        <div style={styles.errorBox}>❌ {error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={styles.page}>
        <p style={{ textAlign: "center", color: "#9ca3af" }}>로딩 중…</p>
      </main>
    );
  }

  const { report, calc, customerName, consultantName, profile } = data;
  const fill = (s: string) =>
    s.replace(/\{고객명\}/g, customerName).replace(/\{담당자\}/g, consultantName);

  function copyAlimTalk() {
    navigator.clipboard.writeText(fill(report.alimTalkBody));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={styles.page}>
      {/* 상단 헤더 */}
      <header style={styles.header}>
        <div style={styles.branchTag}>
          {profile?.branchName ?? "신협 OO지점"} · 상담 후속 리포트
        </div>
        <div style={styles.consultantTag}>담당 {consultantName}</div>
      </header>

      {/* 슬롯 1 — Hero */}
      <section style={{ ...styles.card, ...styles.heroCard }}>
        <div style={styles.heroLabel}>{report.hero.bigNumberLabel}</div>
        <div style={styles.heroNumber}>{report.hero.bigNumberValue}</div>
        <div style={styles.heroHeadline}>{fill(report.hero.headline)}</div>
      </section>

      {/* 슬롯 2 — 오늘의 상담 */}
      <Card title="📌 오늘 이야기 나눈 것">
        <div style={{ marginBottom: 12 }}>
          {report.todaysSummary.topicChips.map((chip) => (
            <span key={chip} style={styles.chip}>
              {chip}
            </span>
          ))}
        </div>
        <ul style={styles.summaryList}>
          {report.todaysSummary.summaryLines.map((line, i) => (
            <li key={i} style={styles.summaryItem}>
              {fill(line)}
            </li>
          ))}
        </ul>
      </Card>

      {/* 슬롯 3 — 분석·시뮬레이션 (그래프 포함) */}
      <Card title="📊 30년 상환 시뮬레이션">
        {profile?.loanPrincipal && profile?.interestRatePercent && profile?.loanTermMonths && (
          <>
            <div style={styles.statRow}>
              <Stat label="월 상환액" value={`${Math.round(calc.monthlyPayment ?? 0).toLocaleString()}원`} />
              <Stat label="총 이자" value={`${Math.round((calc.totalInterest ?? 0) / 10000).toLocaleString()}만원`} />
              <Stat label="원금" value={`${Math.round(profile.loanPrincipal / 10000).toLocaleString()}만원`} />
            </div>
            <RepaymentChart
              principal={profile.loanPrincipal}
              annualRatePercent={profile.interestRatePercent}
              termMonths={profile.loanTermMonths}
            />
            <p style={styles.chartCaption}>
              초록(원금) vs 주황(이자). 시간이 지날수록 원금 상환 비중이 커져요.
            </p>
          </>
        )}
        <p style={styles.paragraph}>{fill(report.analysisExplanation)}</p>

        {calc.earlyRepayment && calc.earlyRepayment.length > 0 && (
          <details style={styles.details}>
            <summary style={styles.detailsSummary}>
              💡 중도상환 시나리오 (펼쳐보기)
            </summary>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>매달 추가</th>
                  <th style={styles.th}>단축 기간</th>
                  <th style={styles.th}>절감 이자</th>
                </tr>
              </thead>
              <tbody>
                {calc.earlyRepayment.map((s) => (
                  <tr key={s.extraMonthly}>
                    <td style={styles.td}>+{(s.extraMonthly / 10000).toLocaleString()}만원</td>
                    <td style={styles.td}>{s.yearsSaved.toFixed(1)}년</td>
                    <td style={styles.td}>{Math.round(s.interestSaved / 10000).toLocaleString()}만원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}

        {calc.rateCut && (
          <div style={styles.highlightBox}>
            <strong>🎯 금리인하요구권 {calc.rateCut.cutPercentPoint}%p 효과</strong>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              월 <strong>{Math.round(calc.rateCut.monthlySaving).toLocaleString()}원</strong> 절감 ·
              총 <strong>{Math.round(calc.rateCut.totalInterestSaving / 10000).toLocaleString()}만원</strong> 절감
            </div>
          </div>
        )}
      </Card>

      {/* 슬롯 4 — 왜 신협인가 */}
      <Card title="🏦 왜 신협인가">
        <p style={{ ...styles.paragraph, whiteSpace: "pre-line" }}>
          {fill(report.whyShinhyup)}
        </p>
      </Card>

      {/* 슬롯 5 — 다음 단계 */}
      <Card title="🎯 당신의 다음 단계">
        {report.nextSteps.map((step, i) => (
          <div key={i} style={styles.stepCard}>
            <div style={styles.stepTitle}>{step.title}</div>
            <div style={styles.stepReason}>{step.reason}</div>
          </div>
        ))}
      </Card>

      {/* 슬롯 6 — 교차 전략 */}
      <Card title="💎 교차 전략">
        <p style={styles.paragraph}>{fill(report.crossStrategy)}</p>
      </Card>

      {/* 슬롯 7 — 클로징 */}
      <Card title="💌 마지막 한 마디">
        <p style={{ ...styles.paragraph, fontStyle: "italic", color: "#4b5563" }}>
          {fill(report.closing)}
        </p>
      </Card>

      {/* 카카오 복사 영역 */}
      <section style={styles.kakaoSection}>
        <div style={styles.kakaoLabel}>📱 카카오톡으로 보낼 본문</div>
        <pre style={styles.kakaoBubble}>{fill(report.alimTalkBody)}</pre>
        <button
          onClick={copyAlimTalk}
          style={{
            ...styles.copyButton,
            background: copied ? "#16a34a" : "#fbbf24",
            color: copied ? "white" : "#78350f",
          }}
        >
          {copied ? "✓ 복사됨!" : "📋 본문 복사하기"}
        </button>
        <div style={styles.copyHint}>
          복사 후 업무폰 카카오톡에서 고객에게 직접 붙여넣어 발송하세요.
        </div>
      </section>

      <footer style={styles.footer}>
        본 메시지는 참고용이며 법적·세무 효력이 없습니다.
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────
// 작은 컴포넌트들
// ─────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 스타일 (인라인, 디자인 시스템은 Phase 2 에서)
// ─────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "24px 16px 80px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', system-ui, sans-serif",
    color: "#111827",
    background: "#f9fafb",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 4px 20px",
    fontSize: 12,
  },
  branchTag: {
    color: "#16a34a",
    fontWeight: 600,
  },
  consultantTag: {
    color: "#6b7280",
  },
  errorBox: {
    padding: 20,
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 8,
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: "20px 20px 24px",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
    border: "1px solid #f3f4f6",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 14,
    marginTop: 0,
    letterSpacing: "-0.01em",
  },

  heroCard: {
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    color: "white",
    border: "none",
    padding: "28px 24px",
  },
  heroLabel: {
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 6,
  },
  heroNumber: {
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginBottom: 10,
    lineHeight: 1.1,
  },
  heroHeadline: {
    fontSize: 15,
    opacity: 0.95,
    lineHeight: 1.5,
  },

  chip: {
    display: "inline-block",
    padding: "5px 12px",
    margin: "3px 6px 3px 0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid #dcfce7",
  },

  summaryList: {
    margin: 0,
    paddingLeft: 18,
    color: "#374151",
  },
  summaryItem: {
    marginBottom: 6,
    lineHeight: 1.6,
    fontSize: 14,
  },

  paragraph: {
    lineHeight: 1.7,
    fontSize: 14,
    color: "#374151",
    margin: "8px 0",
  },

  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 12,
  },
  stat: {
    padding: "10px 12px",
    background: "#f9fafb",
    borderRadius: 10,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  },

  chartCaption: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
  },

  details: {
    marginTop: 14,
    padding: "12px 14px",
    background: "#f9fafb",
    borderRadius: 10,
    fontSize: 13,
  },
  detailsSummary: {
    cursor: "pointer",
    fontWeight: 600,
    color: "#16a34a",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "6px 4px",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    fontWeight: 600,
  },
  td: {
    padding: "6px 4px",
    borderBottom: "1px solid #f3f4f6",
    color: "#374151",
  },
  highlightBox: {
    marginTop: 14,
    padding: "12px 14px",
    background: "#fef3c7",
    borderRadius: 10,
    border: "1px solid #fde68a",
    color: "#78350f",
    fontSize: 13,
  },

  stepCard: {
    padding: "12px 14px",
    marginBottom: 10,
    background: "#f9fafb",
    borderRadius: 10,
    borderLeft: "3px solid #16a34a",
  },
  stepTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  stepReason: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },

  kakaoSection: {
    marginTop: 24,
    padding: 20,
    background: "white",
    borderRadius: 16,
    border: "1px solid #fde68a",
  },
  kakaoLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#78350f",
    marginBottom: 10,
  },
  kakaoBubble: {
    background: "#fef9c3",
    padding: 16,
    borderRadius: 12,
    whiteSpace: "pre-wrap",
    fontFamily: "-apple-system, 'Pretendard', system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.7,
    color: "#422006",
    margin: 0,
    border: "1px solid #fde68a",
  },
  copyButton: {
    marginTop: 12,
    width: "100%",
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  copyHint: {
    marginTop: 8,
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },

  footer: {
    marginTop: 24,
    padding: "12px 4px",
    textAlign: "center",
    fontSize: 11,
    color: "#9ca3af",
  },
};
