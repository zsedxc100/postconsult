"use client";

/**
 * 직원 입력 폼 — 새 구조 (2026-04 리팩터링)
 *
 * Zero-PII 원칙:
 * - 고객명·담당자명 = React state 만 (서버 X)
 * - 익명 프로필만 서버 전송
 * - URL fragment(#) 에 리포트 + PII 박아 리포트 페이지로 이동
 *
 * 새 폼:
 * - 나이 필수 (생애주기 자동 매핑)
 * - 옵션 정교화 (가족·자녀·부양·소득 구간)
 * - 가입한 상품 / 권유한 상품 / 강조 상품 — 동적 추가/제거
 * - 성향 3종 (DISC, Klontz, 자유 메모) 다 옵션
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AnonymousProfile,
  Product,
  ProductType,
  ReportOutput,
  CalculationContext,
  DiscType,
  KlontzType,
} from "@/lib/types";

// ─────────────────────────────────────────────
// 빈 상품 만들기
// ─────────────────────────────────────────────
function makeEmptyProduct(type: ProductType = "savings"): Product {
  return { type, name: "" };
}

// ─────────────────────────────────────────────
// 메인 폼 컴포넌트
// ─────────────────────────────────────────────
export default function NewReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PII (브라우저 메모리, 서버 X)
  const [customerName, setCustomerName] = useState("");
  const [consultantName, setConsultantName] = useState("");

  // 익명 프로필
  const [profile, setProfile] = useState<AnonymousProfile>({
    ageGroup: "20대",
    familyStatus: "",
    branchName: "춘천신협",
    joinedProducts: [],
    proposedProducts: [],
    emphasizedProducts: [],
    topics: [],
  });

  // ─── 핸들러 ───
  function updateProfile<K extends keyof AnonymousProfile>(
    key: K,
    value: AnonymousProfile[K]
  ) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function addProduct(target: "joined" | "proposed") {
    const newProduct = makeEmptyProduct();
    if (target === "joined") {
      setProfile((p) => ({
        ...p,
        joinedProducts: [...p.joinedProducts, newProduct],
      }));
    } else {
      setProfile((p) => ({
        ...p,
        proposedProducts: [...p.proposedProducts, newProduct],
      }));
    }
  }

  function removeProduct(target: "joined" | "proposed", index: number) {
    if (target === "joined") {
      setProfile((p) => ({
        ...p,
        joinedProducts: p.joinedProducts.filter((_, i) => i !== index),
      }));
    } else {
      setProfile((p) => ({
        ...p,
        proposedProducts: p.proposedProducts.filter((_, i) => i !== index),
      }));
    }
  }

  function updateProduct(
    target: "joined" | "proposed",
    index: number,
    field: keyof Product,
    value: unknown
  ) {
    setProfile((p) => {
      const list = target === "joined" ? p.joinedProducts : p.proposedProducts;
      const updated = list.map((prod, i) =>
        i === index ? { ...prod, [field]: value } : prod
      );
      return target === "joined"
        ? { ...p, joinedProducts: updated }
        : { ...p, proposedProducts: updated };
    });
  }

  function addEmphasized() {
    setProfile((p) => ({
      ...p,
      emphasizedProducts: [...(p.emphasizedProducts ?? []), { name: "" }],
    }));
  }

  function removeEmphasized(index: number) {
    setProfile((p) => ({
      ...p,
      emphasizedProducts: (p.emphasizedProducts ?? []).filter((_, i) => i !== index),
    }));
  }

  function updateEmphasized(index: number, field: "name" | "reason", value: string) {
    setProfile((p) => ({
      ...p,
      emphasizedProducts: (p.emphasizedProducts ?? []).map((e, i) =>
        i === index ? { ...e, [field]: value } : e
      ),
    }));
  }

  // ─── 제출 ───
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
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
        profile: AnonymousProfile;
      };

      // 리포트 + PII 정보를 URL fragment 에 박기
      const payload = {
        report: data.report,
        calc: data.calc,
        profile: data.profile,
        customerName,
        consultantName,
      };
      const encoded = encodeURIComponent(
        btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      );

      const reportId = Math.random().toString(36).slice(2, 10);
      router.push(`/r/${reportId}#${encoded}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main style={S.page}>
      <h1 style={S.title}>춘천신협 AI 어시스턴트 — 새 안내 만들기</h1>
      <p style={S.subtitle}>
        Zero-PII. 고객명·담당자명은 브라우저에만 머무름.
      </p>

      <form onSubmit={handleSubmit}>
        {/* PII 박스 */}
        <Section title="👤 PII (브라우저에만)" color="orange">
          <Field label="고객명">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="예: 이서연"
              style={S.input}
              required
            />
          </Field>
          <Field label="담당자명">
            <input
              type="text"
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
              placeholder="예: 박지영"
              style={S.input}
              required
            />
          </Field>
        </Section>

        {/* 고객 상황 */}
        <Section title="📋 고객 상황 (나이 필수, 나머지 옵션)" color="green">
          <Field label="연령대 *">
            <select
              value={profile.ageGroup}
              onChange={(e) => updateProfile("ageGroup", e.target.value)}
              style={S.input}
            >
              <option value="20대">20대 — 사회초년생 (청약·종잣돈)</option>
              <option value="30대">30대 — 가정 형성기 (결혼·출산·주택)</option>
              <option value="40대">40대 — 자녀 양육기 (교육·주담대·보장)</option>
              <option value="50대">50대 — 자녀 독립기 (노후 가속)</option>
              <option value="60대">60대 — 은퇴 준비기 (현금흐름)</option>
              <option value="70대+">70대+ — 은퇴 생활기 (자산 보존)</option>
            </select>
          </Field>

          <Field label="가족 형태 (옵션)">
            <select
              value={profile.familyStatus ?? ""}
              onChange={(e) => updateProfile("familyStatus", e.target.value || undefined)}
              style={S.input}
            >
              <option value="">선택 안 함</option>
              <option value="미혼">미혼</option>
              <option value="기혼_무자녀">기혼 (자녀 없음)</option>
              <option value="기혼_자녀">기혼 (자녀 있음)</option>
              <option value="1인가구">1인 가구</option>
            </select>
          </Field>

          <Field label="자녀 수 (옵션)">
            <input
              type="number"
              min={0}
              value={profile.childrenCount ?? ""}
              onChange={(e) =>
                updateProfile(
                  "childrenCount",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              style={S.input}
            />
          </Field>

          <Field label="부양가족 수 (옵션)">
            <input
              type="number"
              min={0}
              value={profile.dependentsCount ?? ""}
              onChange={(e) =>
                updateProfile(
                  "dependentsCount",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              style={S.input}
            />
          </Field>

          <Field label="소득 구간 (옵션)">
            <input
              type="text"
              value={profile.incomeRange ?? ""}
              onChange={(e) => updateProfile("incomeRange", e.target.value || undefined)}
              placeholder="예: 월 250-300만 (구체 금액 X)"
              style={S.input}
            />
          </Field>
        </Section>

        {/* 가입한 상품 */}
        <ProductListSection
          title="✅ 오늘 가입한 상품"
          products={profile.joinedProducts}
          onAdd={() => addProduct("joined")}
          onRemove={(i) => removeProduct("joined", i)}
          onUpdate={(i, f, v) => updateProduct("joined", i, f, v)}
        />

        {/* 권유한 상품 */}
        <ProductListSection
          title="💡 상담 중 권유한 상품"
          products={profile.proposedProducts}
          onAdd={() => addProduct("proposed")}
          onRemove={(i) => removeProduct("proposed", i)}
          onUpdate={(i, f, v) => updateProduct("proposed", i, f, v)}
        />

        {/* 강조 상품 (영업) */}
        <Section title="⭐ 강조 상품 (선택, 최대 3개)" color="yellow">
          <p style={S.helper}>
            춘천신협 주력 상품·캠페인 상품을 입력하면 AI가 재무설계에 자연스럽게 녹여줍니다.
            명백히 부적합하면 자동 제외.
          </p>
          {(profile.emphasizedProducts ?? []).map((emp, i) => (
            <div key={i} style={S.subCard}>
              <Field label="상품명">
                <input
                  type="text"
                  value={emp.name}
                  onChange={(e) => updateEmphasized(i, "name", e.target.value)}
                  placeholder="예: 청약종합저축"
                  style={S.input}
                />
              </Field>
              <Field label="이유 (직원 메모, 옵션)">
                <input
                  type="text"
                  value={emp.reason ?? ""}
                  onChange={(e) => updateEmphasized(i, "reason", e.target.value)}
                  placeholder="예: 사회초년생 주력"
                  style={S.input}
                />
              </Field>
              <button
                type="button"
                onClick={() => removeEmphasized(i)}
                style={S.removeButton}
              >
                삭제
              </button>
            </div>
          ))}
          {(profile.emphasizedProducts ?? []).length < 3 && (
            <button type="button" onClick={addEmphasized} style={S.addButton}>
              + 강조 상품 추가
            </button>
          )}
        </Section>

        {/* 상담 토픽 */}
        <Section title="🏷 상담 토픽 (자유 입력, 쉼표로 구분)" color="green">
          <Field label="">
            <input
              type="text"
              value={profile.topics.join(", ")}
              onChange={(e) =>
                updateProfile(
                  "topics",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="예: 사회초년생, 청약, 비상자금"
              style={S.input}
            />
          </Field>
        </Section>

        {/* 성향 분석 (3종 옵션) */}
        <Section title="🧠 고객 성향 (옵션, 모두 비워도 OK)" color="green">
          <Field label="대화 톤 (DISC)">
            <select
              value={profile.discType ?? ""}
              onChange={(e) =>
                updateProfile("discType", (e.target.value || undefined) as DiscType | undefined)
              }
              style={S.input}
            >
              <option value="">선택 안 함</option>
              <option value="D">👔 D — 결론부터 좋아하시는 분 (직설·빠름)</option>
              <option value="I">😊 I — 친근하게 이야기 나누시는 분 (밝고 표현)</option>
              <option value="S">🌿 S — 천천히 차근차근 보시는 분 (신중·안전)</option>
              <option value="C">📊 C — 숫자·근거 보고 결정하시는 분 (분석)</option>
            </select>
          </Field>

          <Field label="돈 가치관 (Klontz Money Scripts)">
            <select
              value={profile.klontzType ?? ""}
              onChange={(e) =>
                updateProfile(
                  "klontzType",
                  (e.target.value || undefined) as KlontzType | undefined
                )
              }
              style={S.input}
            >
              <option value="">선택 안 함</option>
              <option value="avoidance">💸 회피형 — 돈 얘기 부담 (단순·자동화)</option>
              <option value="worship">🌟 숭배형 — 더 많이 모으기 (수익·세제)</option>
              <option value="status">👑 지위형 — 체면·VIP 중시 (우대 강조)</option>
              <option value="vigilance">🛡 경계형 — 안전 최우선 (원금보장)</option>
            </select>
          </Field>

          <Field label="자유 메모 (한 줄, 옵션)">
            <input
              type="text"
              value={profile.freeNote ?? ""}
              onChange={(e) => updateProfile("freeNote", e.target.value || undefined)}
              placeholder="예: 꼼꼼하게 다 물어보심, 자료 원함"
              style={S.input}
            />
          </Field>
        </Section>

        {error && <div style={S.errorBox}>❌ {error}</div>}

        <button type="submit" disabled={loading} style={S.submitButton(loading)}>
          {loading ? "AI 어시스턴트 작업 중... (1~3초)" : "안내 만들기"}
        </button>
      </form>
    </main>
  );
}

// ─────────────────────────────────────────────
// 상품 리스트 섹션 컴포넌트
// ─────────────────────────────────────────────
function ProductListSection({
  title,
  products,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string;
  products: Product[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, f: keyof Product, v: unknown) => void;
}) {
  return (
    <Section title={title} color="green">
      {products.length === 0 && (
        <p style={S.helper}>아직 추가된 상품 없음 (없어도 OK)</p>
      )}
      {products.map((prod, i) => (
        <div key={i} style={S.subCard}>
          <Field label="상품 종류">
            <select
              value={prod.type}
              onChange={(e) => onUpdate(i, "type", e.target.value)}
              style={S.input}
            >
              <option value="savings">수신 (적금·예금·청약)</option>
              <option value="loan">여신 (대출)</option>
              <option value="mutualAid">공제 (대출금상환·화재·종신 등)</option>
              <option value="insurance">보험</option>
              <option value="pension">연금형 (노란우산 등)</option>
            </select>
          </Field>

          <Field label="상품명">
            <input
              type="text"
              value={prod.name}
              onChange={(e) => onUpdate(i, "name", e.target.value)}
              placeholder="예: 정기적금 12개월"
              style={S.input}
            />
          </Field>

          {/* 수신·연금 필드 */}
          {(prod.type === "savings" || prod.type === "pension") && (
            <>
              <Field label="월 납입액 (원, 적금일 때)">
                <input
                  type="number"
                  value={prod.monthlyDeposit ?? ""}
                  onChange={(e) =>
                    onUpdate(i, "monthlyDeposit", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="예: 300000"
                  style={S.input}
                />
              </Field>
              <Field label="원금 (원, 정기예금일 때)">
                <input
                  type="number"
                  value={prod.principal ?? ""}
                  onChange={(e) =>
                    onUpdate(i, "principal", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="예: 50000000"
                  style={S.input}
                />
              </Field>
              <Field label="적용 금리 (%)">
                <input
                  type="number"
                  step="0.01"
                  value={prod.ratePercent ?? ""}
                  onChange={(e) =>
                    onUpdate(i, "ratePercent", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="예: 3.7"
                  style={S.input}
                />
              </Field>
              <Field label="기간 (개월)">
                <input
                  type="number"
                  value={prod.termMonths ?? ""}
                  onChange={(e) =>
                    onUpdate(i, "termMonths", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="예: 12"
                  style={S.input}
                />
              </Field>
              <Field label="비과세종합저축 적용?">
                <select
                  value={prod.isTaxFree ? "yes" : "no"}
                  onChange={(e) => onUpdate(i, "isTaxFree", e.target.value === "yes")}
                  style={S.input}
                >
                  <option value="no">아니오</option>
                  <option value="yes">예 (비과세)</option>
                </select>
              </Field>
              <Field label="중도해지 시 이율 (자유 입력)">
                <input
                  type="text"
                  value={prod.midwayRate ?? ""}
                  onChange={(e) => onUpdate(i, "midwayRate", e.target.value || undefined)}
                  placeholder="예: 6개월 이내 0.5%, 6개월~만기 1.5%"
                  style={S.input}
                />
              </Field>
            </>
          )}

          {/* 여신 필드 */}
          {prod.type === "loan" && (
            <>
              <Field label="대출 원금 (원)">
                <input
                  type="number"
                  value={prod.loanPrincipal ?? ""}
                  onChange={(e) =>
                    onUpdate(i, "loanPrincipal", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="예: 250000000"
                  style={S.input}
                />
              </Field>
              <Field label="연 이율 (%)">
                <input
                  type="number"
                  step="0.01"
                  value={prod.loanRate ?? ""}
                  onChange={(e) =>
                    onUpdate(i, "loanRate", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="예: 4.2"
                  style={S.input}
                />
              </Field>
              <Field label="기간 (개월)">
                <input
                  type="number"
                  value={prod.loanTermMonths ?? ""}
                  onChange={(e) =>
                    onUpdate(i, "loanTermMonths", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="예: 360"
                  style={S.input}
                />
              </Field>
              <Field label="상환 방식">
                <select
                  value={prod.repayMethod ?? "원리금균등"}
                  onChange={(e) => onUpdate(i, "repayMethod", e.target.value)}
                  style={S.input}
                >
                  <option value="원리금균등">원리금균등</option>
                  <option value="원금균등">원금균등</option>
                  <option value="만기일시">만기일시</option>
                </select>
              </Field>
            </>
          )}

          <Field label="우대조건 (쉼표로 구분, 옵션)">
            <input
              type="text"
              value={(prod.preferentialConditions ?? []).join(", ")}
              onChange={(e) =>
                onUpdate(
                  i,
                  "preferentialConditions",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="예: 조합원 +0.2%p, 급여이체 +0.1%p"
              style={S.input}
            />
          </Field>

          <Field label="특이사항 (옵션)">
            <input
              type="text"
              value={prod.specialNotes ?? ""}
              onChange={(e) => onUpdate(i, "specialNotes", e.target.value || undefined)}
              style={S.input}
            />
          </Field>

          <button type="button" onClick={() => onRemove(i)} style={S.removeButton}>
            삭제
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} style={S.addButton}>
        + 상품 추가
      </button>
    </Section>
  );
}

// ─────────────────────────────────────────────
// 작은 컴포넌트들
// ─────────────────────────────────────────────
function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: "orange" | "green" | "yellow";
  children: React.ReactNode;
}) {
  const colorStyles = {
    orange: { border: "#fdba74", bg: "#fff7ed", legend: "#9a3412" },
    green: { border: "#86efac", bg: "#f0fdf4", legend: "#166534" },
    yellow: { border: "#fde68a", bg: "#fefce8", legend: "#854d0e" },
  };
  const c = colorStyles[color];
  return (
    <fieldset
      style={{
        marginBottom: 20,
        padding: 16,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        background: c.bg,
      }}
    >
      <legend style={{ padding: "0 8px", color: c.legend, fontWeight: 600 }}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      {label && (
        <div style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>
          {label}
        </div>
      )}
      {children}
    </label>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const S = {
  page: {
    maxWidth: 760,
    margin: "40px auto",
    padding: "0 24px 80px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: {
    fontSize: 24,
    marginBottom: 6,
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 28,
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    background: "white",
    boxSizing: "border-box" as const,
  },
  helper: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  subCard: {
    padding: 12,
    marginBottom: 12,
    background: "white",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  addButton: {
    padding: "8px 14px",
    background: "white",
    color: "#16a34a",
    border: "1px dashed #86efac",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  removeButton: {
    padding: "4px 10px",
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    marginTop: 4,
  },
  errorBox: {
    padding: 12,
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 8,
    marginBottom: 16,
  },
  submitButton: (loading: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px 24px",
    background: loading ? "#9ca3af" : "#16a34a",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: loading ? "wait" : "pointer",
    marginTop: 8,
  }),
};
