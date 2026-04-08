@AGENTS.md

# PostConsult — 신협 상담 후속 케어 AI 시스템

> 이 파일은 모든 Claude Code 세션 시작 시 자동 로드돼. 절대 변경 금지 사항과 핵심 원칙.

## 🎯 북극성 (모든 결정의 기준)

> 직원이 보고 *"오… 장난 아니다. 관리받는 느낌이 든다. 나도 가입해야 되나? 당장 써보고 싶다."*

이 반응이 5명 중 3명 이상 안 나오면 출시 보류. **기능 추가가 아니라 품질을 더 올리는 방향**으로 재작업.

## 📐 절대 규칙 (위반 금지)

1. **PII Zero to Claude**
   - 이름·전화·계좌·소득·잔액은 Claude API 프롬프트에 절대 포함 금지
   - 모든 Claude 호출 직전 `lib/pii-guard.ts` 통과 필수
   - 익명 프로필(연령대·생애이벤트·가입상품 등)만 Claude에 전달
   - PII는 외부 서비스 로컬 DB에만, 알림톡 발송 직전에만 결합

2. **슬롯 7개 구조 변경 금지**
   - Hero / 오늘의 상담 / 분석·시뮬 / 왜 신협인가 / 다음 단계 / 교차 전략 / 클로징
   - 새 슬롯 추가 X
   - 정보가 많아지면 슬롯 5 안의 미니 카드 + Disclosure 토글

3. **계산은 AI 밖에서**
   - 상환 스케줄·금리 시나리오·중도상환은 순수 함수(`lib/calc/`)
   - Claude는 결과를 받아 해석·서술·추천만
   - Claude에게 계산 시키지 말 것

4. **단일 호출 원칙**
   - 리포트 1건 = Claude API 1번 호출
   - 체인·에이전트 루프 없음 (LangChain 안 씀)
   - 도구 필요하면 Anthropic SDK native tool use

## ✍️ 카피 톤

❌ 금지:
- "고객님께서는…" "본 상품은…" "유의하시기 바랍니다"
- 사무적·관청 톤

✅ 지향:
- "오늘 이야기 나눈 부분, 잊지 마시라고 정리해드려요"
- "이 부분은 6개월 뒤에 한 번 더 볼게요"
- 따뜻한 존댓말, 사람이 쓴 메모처럼

## 🎨 디자인 토큰

- **메인 컬러**: 신협 그린 (정확한 hex는 사용자 제공 예정)
- **액센트**: 1색만, 잡색 금지
- **폰트**: Pretendard
- **그래프**: Recharts 기본 스타일 절대 금지 — 신협 그린 그라데이션, 얇은 그리드, 한국어 라벨, 부드러운 곡선
- **애니메이션**: Framer Motion, 진입 시 부드럽게, 카운트업, 핀 펄스

## 🎬 골든 페르소나 D — 1주차에 100% 완성할 단 하나

**김상민 씨 (가명)**
- 44세 남성, 기혼 자녀 2명 (초등·중등)
- 자가 소유, 회사원, 신협 첫 거래
- 주담대 2.5억 / 30년 / 변동 4.2% / 원리금균등
- 월 상환 약 122만원, 총 이자 약 1.8억
- DISC: S 안정형 / BIT: Preserver

이 1개를 **포트폴리오 수준으로** 완성한 후 다른 케이스 확장. 절대 4개 케이스 동시 진행 금지.

## 🚫 1주차 기능 욕심 금지

새 아이디어는 백로그로. **기능 5개 70% << 기능 3개 100%**.

## 🛠 기술 스택 (확정)

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- Claude SDK: `@anthropic-ai/sdk` (claude-sonnet-4-6 기본)
- Framer Motion (애니메이션)
- Recharts (그래프 — 기본 스타일 금지, 풀 커스텀)
- Vitest (단위 테스트, 계산 엔진용)
- 발송: 1주차는 모킹, 추후 Aligo or 엠피인터랙티브
- 호스팅: Vercel Hobby (무료)

## 📂 프로젝트 구조

```
postconsult/
├── app/
│   ├── page.tsx                  # 직원 대시보드
│   ├── new/page.tsx              # D 케이스 입력 폼
│   ├── r/[reportId]/page.tsx     # ⭐ 고객 웹리포트 (슬롯 7개)
│   └── api/
│       ├── generate/route.ts     # Claude 호출 (PII 가드 후)
│       └── send/route.ts         # 발송 (모킹/실제)
├── components/
│   ├── forms/                    # 폼 컴포넌트
│   └── report/                   # 슬롯 컴포넌트들
├── lib/
│   ├── calc/                     # 순수 함수 계산 엔진
│   ├── messaging/                # 발송 추상화 (mock/aligo)
│   ├── kb/                       # 지식 베이스 Markdown
│   ├── pii-guard.ts              # ⭐ PII 차단
│   └── claude.ts                 # Claude SDK wrapper
└── .env.local                    # ANTHROPIC_API_KEY (gitignore)
```

## 🔧 매 세션 시작 루틴

1. 이 CLAUDE.md 확인 (@AGENTS.md 자동 로드 포함)
2. `git log --oneline -10` 으로 직전 진행 파악
3. 이번 세션 목표 1개 명시 (TodoWrite)
4. 끝나면 git commit + push

## 📚 관련 문서

- 전체 계획: `C:\Users\newba\.claude\plans\zippy-sniffing-eagle.md`
- 백로그: `docs/backlog.md` (필요 시)
