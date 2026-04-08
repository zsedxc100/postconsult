/**
 * 원리금균등 상환 계산기
 *
 * 원리금균등이란? — 매달 똑같은 금액을 갚는 방식.
 * 신협 주담대에서 가장 많이 쓰임. 한국 가계대출의 표준.
 *
 * 처음엔 이자 비중이 크고 후반엔 원금 비중이 큼.
 * (왜냐면 잔액이 줄어들수록 이자도 같이 줄어드니까)
 */

// ─────────────────────────────────────────────
// 1. 입력 형태 — "이런 정보를 넣어주세요"
// ─────────────────────────────────────────────
export interface LoanInput {
  principal: number;          // 원금 (원). 예: 250000000
  annualRatePercent: number;  // 연 이율 (%). 예: 4.2
  termMonths: number;         // 총 개월 수. 예: 30년 = 360
}

// ─────────────────────────────────────────────
// 2. 한 달치 결과 형태
// ─────────────────────────────────────────────
export interface MonthlyEntry {
  month: number;             // 몇 개월차인지
  payment: number;           // 이번 달 총 납입액 (원)
  principal: number;         // 그 중 "원금" 부분
  interest: number;          // 그 중 "이자" 부분
  remainingBalance: number;  // 이번 달 갚고 남은 잔액
}

// ─────────────────────────────────────────────
// 3. 전체 결과 형태
// ─────────────────────────────────────────────
export interface RepaymentSchedule {
  monthlyPayment: number;   // 매달 상환액 (균등이라 하나의 값)
  totalPayment: number;     // 만기까지 낸 총금액
  totalInterest: number;    // 그 중 이자만 합친 금액
  schedule: MonthlyEntry[]; // 1~360개월 각각의 상세
}

// ─────────────────────────────────────────────
// 4. 진짜 함수 — 자판기 본체
// ─────────────────────────────────────────────
export function calcEqualPaymentSchedule(input: LoanInput): RepaymentSchedule {
  const { principal, annualRatePercent, termMonths } = input;

  // 연이율을 월이율로 변환. 예: 4.2% → 0.042 / 12 = 0.0035
  const monthlyRate = annualRatePercent / 100 / 12;

  // 안전 장치: 무이자 케이스 (이율 0%인 경우)
  // 거의 없지만 0으로 나누기를 막기 위해 처리
  if (monthlyRate === 0) {
    const monthlyPayment = principal / termMonths;
    const schedule: MonthlyEntry[] = [];
    let balance = principal;
    for (let m = 1; m <= termMonths; m++) {
      balance -= monthlyPayment;
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: monthlyPayment,
        interest: 0,
        remainingBalance: Math.max(0, balance),
      });
    }
    return {
      monthlyPayment,
      totalPayment: principal,
      totalInterest: 0,
      schedule,
    };
  }

  // ───── 핵심 공식 ─────
  // 월 상환액 = P × r × (1+r)^n / ((1+r)^n − 1)
  //   P = 원금, r = 월이율, n = 총 개월
  // 이게 한국 은행 모든 곳에서 쓰는 표준 원리금균등 공식이야.
  const factor = Math.pow(1 + monthlyRate, termMonths); // (1+r)^n
  const monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);

  // 매달 스케줄 생성
  const schedule: MonthlyEntry[] = [];
  let balance = principal; // 처음엔 원금 그대로

  for (let m = 1; m <= termMonths; m++) {
    // 이번 달 이자 = 잔액 × 월이율
    const interest = balance * monthlyRate;
    // 이번 달 원금 = 총 납입액 − 이자
    const principalPaid = monthlyPayment - interest;
    // 잔액 갱신
    balance -= principalPaid;

    schedule.push({
      month: m,
      payment: monthlyPayment,
      principal: principalPaid,
      interest,
      remainingBalance: Math.max(0, balance), // 부동소수점 오차로 음수 방지
    });
  }

  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - principal;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    schedule,
  };
}
