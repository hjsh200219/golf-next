# GolfShin (golf-next)

> 한국 골프장 티타임 예약 정보를 한곳에 모아주는 애그리게이터.
> 34개 골프장 웹사이트를 실시간 크롤링하고, Supabase에 저장해 Next.js 14 프론트엔드로 보여줍니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript 5
- **DB**: Supabase (Postgres + Auth + RLS)
- **Styling**: Tailwind CSS 3.4 + Pretendard
- **State**: SWR (server) + Zustand (client)
- **Testing**: Vitest + Testing Library + MSW
- **Deploy**: Vercel

## 개발

```bash
npm install
npm run dev        # 개발 서버
npm test           # Vitest (~469 tests / 44 files)
npm run build      # 프로덕션 빌드
npm run lint       # 레이어 규칙 포함 린트
npx tsc --noEmit   # 타입 체크
```

## 주요 기능

- 🏌️ **티타임 통합 조회**: 34개 골프장의 빈자리를 지역·날짜·시간대로 필터링
- 🌤️ **날씨**: OpenWeatherMap + geohash 캐싱
- ⭐ **즐겨찾기**: 로그인 사용자 + 익명(기기 UUID) 이중 시스템
- 🔔 **텔레그램 빈자리 알림**: 특정 골프장·날짜·시간대를 등록하면 매시간 빈자리를 확인해 자리가 나면 텔레그램으로 알림

## 🤖 텔레그램 봇

[@golfshinbot](https://t.me/golfshinbot) 에서 빈자리 알림을 등록할 수 있습니다.

### 슬래시 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/watch` | 빈자리 알림 등록 — 골프장 → 날짜 → 시간대를 인라인 버튼으로 선택 |
| `/list` | 등록한 알림 목록 보기 + 버튼으로 개별/전체 삭제 |
| `/stop` | 알림 삭제하기 (`/list` 와 동일한 삭제 화면) |
| `/cancel` | 진행 중인 알림 설정 취소 |
| `/help` | 커맨드 사용 안내 |

### 동작 방식

1. `/watch` → 골프장 선택 → 날짜(내일~14일) 선택 → 시간대 선택 → 등록 완료
2. 매시간 정각(`0 * * * *`)에 전체 골프장을 크롤링하고, 50분(`50 * * * *`)에 등록된 알림을 확인
3. 등록한 조건에 **새로** 빈자리가 잡히면 텔레그램으로 알림 발송
   - 판정 기준: `tee_times.scraped_at >= S` (S = 해당 골프장·날짜의 최신 **성공** 스크랩 시각). 예약돼서 사라진 오래된 슬롯을 빈자리로 오인하지 않도록 설계.
4. 자리가 차면 알림 중단. `/list` 또는 `/stop` 으로 직접 삭제 가능. 지난 날짜 알림은 자동 정리(KST 기준).

> 한 사용자당 최대 20개까지 등록 가능. 배포·운영 설정은 [docs/DEPLOY_CRON_TELEGRAM.md](./docs/DEPLOY_CRON_TELEGRAM.md) 참고.

## 아키텍처 / 문서

| 문서 | 내용 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 프로젝트 규칙·구조 (AI 에이전트용, 사람도 참고) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 시스템 아키텍처와 레이어 규칙 |
| [docs/DEPLOY_CRON_TELEGRAM.md](./docs/DEPLOY_CRON_TELEGRAM.md) | 텔레그램 봇 + Vercel cron 배포 설정 |
| [docs/](./docs/) | 디자인·보안·프론트엔드 등 상세 문서 |

## 알려진 제약

- 빌드 시 `/login` 프리렌더는 Supabase env 없으면 실패(정상 — 무시).
- 스크래퍼는 외부 골프장 사이트에 의존 — 사이트 변경에 취약.
- onetheclub은 Vercel 람다에서 본진 CC 응답이 비어 GitHub Actions runner에서 크롤링(같은 `tee_times`에 저장). 봇은 출처와 무관하게 동작.
