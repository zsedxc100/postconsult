"use client";

/**
 * 30년 상환 스케줄 그래프 — 원금 vs 이자 구성 변화
 *
 * 계산 엔진에서 받은 데이터로 Recharts 가 예쁘게 그림.
 * 디자인 방침: 기본 스타일 금지, 신협 그린, 부드러운 곡선, 한국어 라벨.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { calcEqualPaymentSchedule } from "@/lib/calc/repayment";

interface Props {
  principal: number;
  annualRatePercent: number;
  termMonths: number;
}

// 원 → "만원" 단위 변환 (그래프 라벨용)
const toManwon = (n: number) => Math.round(n / 10000);

export function RepaymentChart({ principal, annualRatePercent, termMonths }: Props) {
  const schedule = calcEqualPaymentSchedule({
    principal,
    annualRatePercent,
    termMonths,
  }).schedule;

  // 연 단위로 샘플링 (360개월 → 30개 점)
  // 매달 데이터를 다 그리면 점이 너무 많음
  const data = schedule
    .filter((entry, i) => i === 0 || (i + 1) % 12 === 0)
    .map((entry) => {
      const year = Math.ceil(entry.month / 12);
      return {
        year: `${year}년`,
        원금: toManwon(entry.principal),
        이자: toManwon(entry.interest),
        잔액: toManwon(entry.remainingBalance),
      };
    });

  return (
    <div style={{ width: "100%", height: 280, marginTop: 12 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}`}
            label={{
              value: "만원",
              position: "top",
              offset: 10,
              style: { fontSize: 11, fill: "#6b7280" },
            }}
          />
          <Tooltip
            formatter={(value) => `${Number(value).toLocaleString()}만원`}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="원금"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="이자"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
