"use client";

/**
 * 리포트 페이지 — 새 슬롯 0~5 구조 (2026-04 리팩터링)
 *
 * Zero-PII:
 * - URL fragment(#) 에서 모든 데이터 읽음
 * - 서버는 fragment 를 못 봄
 *
 * 페이지 구성:
 * - 상단: 직원 화면 — 카톡 미리보기 + 복사 버튼 (직원이 카톡 발송용)
 * - 본문: 자세히 보기 페이지 (슬롯 0~5)
 *
 * Phase 1.7 ugly version. Wow 콘텐츠 (인생 이벤트·마이크로 카피·인생 곡선·게이지)
 * 는 Chunk 2 에 추가.
 */

import { useEffect, useState } from "react";
import { RepaymentChart } from "@/components/RepaymentChart";
import type {
  ReportOutput,
  CalculationContext,
  AnonymousProfile,
} from "@/lib/types";

interface ReportPayload {
  report: ReportOutput;
  calc: CalculationContext;
  profile: AnonymousProfile;
  customerName: string;
  consultantName: string;
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
      <main style={S.page}>
        <div style={S.errorBox}>❌ {error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={S.page}>
        <p style={{ textAlign: "center", color: "#9ca3af" }}>로딩 중…</p>
      </main>
    );
  }

  const { report, calc, profile, customerName, consultantName } = data;
  const fill = (s: string) =>
    s
      .replace(/\{고객명\}/g, customerName)
      .replace(/\{담당자\}/g, consultantName)
      .replace(/\{리포트URL\}/g, typeof window !== "undefined" ? window.location.href : "");

  function copyKakao() {
    navigator.clipboard.writeText(fill(report.kakaoMessage));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main style={S.page}>
      {/* 직원용 — 카톡 미리보기 + 복사 버튼 */}
      <section style={S.kakaoSection}>
        <div style={S.kakaoLabel}>📱 카톡 본문 (직원이 복사해서 고객에게 보냄)</div>
        <pre style={S.kakaoBubble}>{fill(report.kakaoMessage)}</pre>
        <button
          onClick={copyKakao}
          style={{
            ...S.copyButton,
            background: copied ? "#16a34a" : "#fbbf24",
            color: copied ? "white" : "#78350f",
          }}
        >
          {copied ? "✓ 복사됨!" : "📋 본문 복사하기"}
        </button>
        <div style={S.copyHint}>
          복사 후 업무폰 카카오톡에서 고객에게 직접 붙여넣어 발송
        </div>
      </section>

      <hr style={S.divider} />

      {/* 자세히 보기 페이지 (고객이 보는 부분) */}
      <div style={S.detailHeader}>
        <div style={S.branchTag}>{profile?.branchName ?? "춘천신협"}</div>
        <div style={S.consultantTag}>담당 {consultantName}</div>
      </div>

      {/* 슬롯 0: 인사 */}
      <section style={S.greetingCard}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
          {fill(report.greeting)}
        </p>
      </section>

      {/* 슬롯 1: 오늘 가입한 상품 */}
      {report.joinedProductsCards && report.joinedProductsCards.length > 0 && (
        <Card title="📌 오늘 가입하신 상품">
          {report.joinedProductsCards.map((card, i) => (
            <div key={i} style={S.productCard}>
              <h4 style={S.productName}>{fill(card.productName)}</h4>
              <p style={S.productSummary}>{fill(card.summary)}</p>
              <div style={S.detailGrid}>
                {card.keyDetails.map((kv, j) => (
                  <div key={j} style={S.detailItem}>
                    <div style={S.detailLabel}>{kv.label}</div>
                    <div style={S.detailValue}>{kv.value}</div>
                  </div>
                ))}
              </div>
              {card.keepInMind && card.keepInMind.length > 0 && (
                <div style={S.keepInMindBox}>
                  <div style={S.keepInMindTitle}>잊지 마세요</div>
                  <ul style={S.keepInMindList}>
                    {card.keepInMind.map((m, k) => (
                      <li key={k} style={S.keepInMindItem}>
                        {fill(m)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* 슬롯 2: 권유 상품 */}
      {report.proposedProductsCards && report.proposedProductsCards.length > 0 && (
        <Card title="💡 상담 중 권유드린 상품">
          {report.proposedProductsCards.map((card, i) => (
            <div key={i} style={S.productCard}>
              <h4 style={S.productName}>{fill(card.productName)}</h4>
              <p style={S.productSummary}>{fill(card.description)}</p>
              <div style={S.reasonBox}>{fill(card.reason)}</div>
            </div>
          ))}
        </Card>
      )}

      {/* 슬롯 3: AI 추천 + 강조 상품 */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Card title="🎯 춘천신협 AI 추천">
          {report.recommendations.map((rec, i) => (
            <div key={i} style={S.recommendCard}>
              <div style={S.recommendHeader}>
                <h4 style={S.recommendName}>
                  {rec.isEmphasized && <span style={S.emphasizedTag}>⭐</span>}
                  {fill(rec.name)}
                </h4>
              </div>
              <p style={S.recommendComment}>{fill(rec.shortComment)}</p>
              {rec.cfpReason && (
                <details style={S.details}>
                  <summary style={S.detailsSummary}>왜 이 분에게?</summary>
                  <p style={S.detailsContent}>{fill(rec.cfpReason)}</p>
                </details>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* 슬롯 3 보조: 대출이 있으면 상환 그래프 */}
      {calc.loan && calc.loan.length > 0 && profile.joinedProducts.some((p) => p.type === "loan") && (
        <Card title="📊 30년 상환 시뮬레이션">
          {profile.joinedProducts
            .filter((p) => p.type === "loan" && p.loanPrincipal && p.loanRate !== undefined && p.loanTermMonths)
            .map((p, i) => (
              <RepaymentChart
                key={i}
                principal={p.loanPrincipal!}
                annualRatePercent={p.loanRate!}
                termMonths={p.loanTermMonths!}
              />
            ))}
        </Card>
      )}

      {/* 슬롯 4: 신협이 안전한 이유 */}
      <Card title="🏦 춘천신협이 안전한 이유">
        <p style={{ ...S.paragraph, whiteSpace: "pre-line" }}>{fill(report.whyShinhyup)}</p>
      </Card>

      {/* 슬롯 5: 클로징 */}
      <Card title="💌 마지막 안내">
        <p style={{ ...S.paragraph, fontStyle: "italic", color: "#4b5563" }}>
          {fill(report.closing)}
        </p>
      </Card>

      <footer style={S.footer}>
        본 안내는 참고용이며 법적·세무 효력이 없습니다.
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────
// Card 헬퍼
// ─────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.card}>
      <h3 style={S.cardTitle}>{title}</h3>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────
// 스타일 (Phase 1.7 — 깔끔한 기본형, Wow 디자인은 Chunk 2)
// ─────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "24px 16px 80px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', system-ui, sans-serif",
    color: "#111827",
    background: "#f9fafb",
    minHeight: "100vh",
  },
  errorBox: {
    padding: 20,
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 8,
  },

  // 카톡 영역 (직원용, 페이지 상단)
  kakaoSection: {
    padding: 20,
    background: "white",
    borderRadius: 16,
    border: "1px solid #fde68a",
    marginBottom: 20,
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

  divider: {
    border: "none",
    borderTop: "2px dashed #e5e7eb",
    margin: "28px 0 20px",
  },

  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 4px 16px",
    fontSize: 12,
  },
  branchTag: {
    color: "#16a34a",
    fontWeight: 700,
  },
  consultantTag: {
    color: "#6b7280",
  },

  greetingCard: {
    padding: 20,
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    color: "white",
    borderRadius: 16,
    marginBottom: 16,
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: "20px 20px 24px",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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

  productCard: {
    padding: 14,
    marginBottom: 12,
    background: "#f9fafb",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
  },
  productName: {
    margin: "0 0 6px 0",
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },
  productSummary: {
    margin: "0 0 12px 0",
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    padding: "8px 10px",
    background: "white",
    borderRadius: 6,
    border: "1px solid #f3f4f6",
  },
  detailLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },
  keepInMindBox: {
    padding: "10px 12px",
    background: "#fef3c7",
    borderRadius: 8,
    border: "1px solid #fde68a",
  },
  keepInMindTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#78350f",
    marginBottom: 6,
  },
  keepInMindList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 12,
    color: "#78350f",
  },
  keepInMindItem: {
    marginBottom: 4,
    lineHeight: 1.5,
  },
  reasonBox: {
    padding: "10px 12px",
    background: "#f0fdf4",
    borderRadius: 8,
    fontSize: 13,
    color: "#166534",
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  recommendCard: {
    padding: 14,
    marginBottom: 10,
    background: "#f9fafb",
    borderRadius: 10,
    borderLeft: "3px solid #16a34a",
  },
  recommendHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: 6,
  },
  recommendName: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },
  emphasizedTag: {
    marginRight: 6,
  },
  recommendComment: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#374151",
    lineHeight: 1.6,
  },
  details: {
    marginTop: 8,
    padding: "8px 10px",
    background: "white",
    borderRadius: 6,
    fontSize: 12,
  },
  detailsSummary: {
    cursor: "pointer",
    fontWeight: 600,
    color: "#16a34a",
  },
  detailsContent: {
    margin: "6px 0 0",
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.5,
  },

  paragraph: {
    lineHeight: 1.7,
    fontSize: 14,
    color: "#374151",
    margin: "8px 0",
  },

  footer: {
    marginTop: 24,
    padding: "12px 4px",
    textAlign: "center",
    fontSize: 11,
    color: "#9ca3af",
  },
};
