@AGENTS.md

# PostConsult — 신협 상담 후속 케어 AI 시스템

> 이 파일은 모든 Claude Code 세션 시작 시 자동 로드돼. 절대 변경 금지 사항과 핵심 원칙.

## 🎯 북극성 (모든 결정의 기준)

> 직원이 보고 *"오… 장난 아니다. 관리받는 느낌이 든다. 나도 가입해야 되나? 당장 써보고 싶다."*

이 반응이 5명 중 3명 이상 안 나오면 출시 보류. **기능 추가가 아니라 품질을 더 올리는 방향**으로 재작업.

## 📐 절대 규칙 (위반 금지)

1. **Zero-PII Architecture (절대 양보 금지)**
   - **어떤 PII도 외부 서버에 저장·로깅·전송되지 않는다.** 한 글자도.
   - PII (이름·전화·계좌·소득·잔액·주소 등) 정의: "그 정보 단독 또는 조합으로 특정 인물을 식별할 수 있는 모든 정보"
   - 직원이 입력한 PII는 **브라우저 React state에만** 머무름. 페이지 새로고침 시 사라짐. localStorage·sessionStorage·쿠키 사용 금지.
   - Claude API에는 **익명 프로필만** 전송 (연령대·생애이벤트·가입상품·DISC/BIT 등 카테고리 데이터)
   - 모든 Claude 호출 직전 `lib/pii-guard.ts` 통과 필수 (서버 측 + 클라이언트 측 양쪽 다)
   - **발송은 시스템이 하지 않는다.** Claude가 만든 알림톡 본문을 화면에 카카오톡 말풍선 형태로 표시 → 직원이 "복사" 버튼 → 직원의 업무용 폰 카톡에서 직접 붙여넣어 발송. **시스템은 전화번호를 받지도, 알지도, 처리하지도 않는다.**
   - 고객명은 리포트 본문에 `{고객명}` placeholder로 저장 → 카톡 발송 직전 직원의 브라우저에서 치환
   - 리포트 URL은 익명 ID + URL fragment(#)에 고객명: `https://.../r/k7m3x9#김상민` (fragment는 HTTP 표준상 서버에 전송되지 않음)
   - **이 원칙을 어긴 코드는 즉시 제거.** 어떤 편의성도 PII 노출을 정당화할 수 없음.

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
- 발송: **시스템이 발송 안 함** — 카카오톡 말풍선 미리보기 + 복사 버튼 → 직원이 업무폰 카톡에서 직접 붙여넣기
- 호스팅: Vercel Hobby (무료)
- DB: **없음** (Zero-PII 원칙. 직원 PC RAM에만 PII)

## 📂 프로젝트 구조

```
postconsult/
├── app/
│   ├── page.tsx                  # 랜딩
│   ├── new/page.tsx              # 직원 입력 폼 (PII는 React state만)
│   ├── r/[reportId]/page.tsx     # ⭐ 고객 웹리포트 (URL fragment에서 이름 읽기)
│   └── api/
│       └── generate/route.ts     # Claude 호출 (PII 0 검증 후)
├── components/
│   ├── forms/                    # 입력 폼
│   ├── report/                   # 슬롯 7개 컴포넌트
│   └── KakaoPreview.tsx          # ⭐ 카카오톡 말풍선 미리보기 + 복사 버튼
├── lib/
│   ├── calc/                     # 순수 함수 계산 엔진
│   ├── kb/                       # 지식 베이스 Markdown
│   ├── pii-guard.ts              # ⭐ PII 차단 (server + client)
│   └── claude.ts                 # Claude SDK wrapper
└── .env.local                    # ANTHROPIC_API_KEY (gitignore)
# DB 없음. messaging 모듈 없음. send API 없음. ALL PII LIVES IN BROWSER.
```

## 🔧 매 세션 시작 루틴

1. 이 CLAUDE.md 확인 (@AGENTS.md 자동 로드 포함)
2. `git log --oneline -10` 으로 직전 진행 파악
3. 이번 세션 목표 1개 명시 (TodoWrite)
4. 끝나면 git commit + push

## 📚 관련 문서

- 전체 계획: `C:\Users\newba\.claude\plans\zippy-sniffing-eagle.md`
- 백로그: `docs/backlog.md` (필요 시)
