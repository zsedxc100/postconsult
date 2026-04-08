# PostConsult — 신협 상담 후속 케어 AI

상담 종료 직후, 고객에게 카카오 알림톡으로 **짧은 요약 + 타이트한 웹리포트**를 보내는 시스템.
상담사가 1:1로 못 해주는 시뮬레이션·금리 시나리오·CFP 기반 추천을 AI가 자동 생성.

> **북극성:** 직원이 보고 *"오… 장난 아니다. 나도 가입하고 싶다"* 가 5명 중 3명 이상 나오는 품질.

자세한 원칙·구조·결정사항은 [`CLAUDE.md`](./CLAUDE.md)를 참고. 전체 계획은 별도 plan 파일에 있어.

## 빠른 시작

```bash
# 1. 환경변수 설정
cp .env.example .env.local
# .env.local 열어서 ANTHROPIC_API_KEY 채우기

# 2. 의존성 설치 (이미 했으면 건너뛰기)
npm install

# 3. 개발 서버
npm run dev
```

http://localhost:3000

## 절대 규칙 (요약)

1. **PII Zero to Claude** — 이름/전화/계좌/소득은 Claude API에 절대 포함 금지
2. **슬롯 7개 구조 유지** — Hero / 상담 / 분석 / 신협 / 다음단계 / 교차전략 / 클로징
3. **계산은 AI 밖에서** — 순수 함수가 숫자, Claude는 해석·서술·추천만
4. **단일 호출 원칙** — 리포트 1건 = Claude API 1번

전체 규칙은 `CLAUDE.md` 참고.

## 1주차 골든 페르소나

40대 자녀교육기 가장, 주담대 약정 완료, DISC S + Pompian Preserver.
이 1개 시나리오를 100% 완성한 후 다른 케이스 확장.
