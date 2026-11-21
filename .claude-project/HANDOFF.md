---
created: 2026-11-21T19:40:00+09:00
project: golf-next
summary: 모바일 예약 조회를 지도 + 바텀시트로 개편(0825f79·86d0ac3 운영 배포·화면 확인), 지역 필터 cc 표기 차이 버그 수정. 앞서 스크래퍼 5곳 수리(0c523f9·ddf175b·c1b9b4a).
---

## Session Digest

모바일 기본 보기를 지도(골프장별 최저가 핀) + 바텀시트(접힘·절반·전체)로 바꿨다. 데스크톱은 기존 목록 유지. 지역 필터가 코스 행 cc_name 과 티타임 cc_name 을 글자 그대로 비교해 골프존카운티 4곳·클럽72·크리스밸리·하이원·해피니스가 지역 선택 때 빠지던 버그를 토큰 비교(`lib/utils/ccFilter`)로 고쳤다.

## Progress

**완료**
- `components/map/{MapExplorer,TeeTimeMap,BottomSheet}`, `lib/maps/{pinIcon,declutter,loadGoogleMaps}`, `lib/utils/{mapPins,sheetSnap,ccFilter}`, `hooks/useMediaQuery`
- 겹치는 가격 핀은 점으로(더 싼 곳·선택 핀 우선). 핀↔점 전환 때 마커 재생성(Google 이 옛 클릭 영역을 유지함)
- `useMediaQuery` 는 SSR·하이드레이션 중 null → 데스크톱 하이드레이션 오류·지도 로드 없음
- 테스트 746 통과, lint·tsc·build 통과, 운영 golfshin.vercel.app 모바일(핀·점 탭, 인천 필터 57건, 접힘 상태 날짜 선택)·데스크톱(1280, 지도 요청 0) 확인
- 19시 운영 수집: owners_new·skyvalley·shinedale·pinestone·namchuncheon_new 7/7

## Next Steps

1. 데스크톱 지도 보기(이번 범위 밖)
2. 골프존카운티 코스 행이 「골프존카운티」(경기남부) 하나뿐 — 송도(인천)·안성·이글몬트 행을 좌표·지역과 함께 넣으면 지도 핀·지역 필터가 정확해진다(운영 DB 쓰기라 사용자 확인 필요)

## Blockers

- 태광CC: `TAEKWANG_PW` env 미등록(open-loops `golf-next-taekwang-pw`)
- 더 시에나 서울CC(옛 중부): Cloudflare 관리형 챌린지 + 로그인 — 브라우저 수집기 여부 사용자 결정(open-loops `golf-next-jungbu-siena`)

## Watch Out

- `npm run build` 를 dev 서버와 같은 폴더에서 돌리면 `.next` 를 덮어써 dev 서버가 `Cannot find module './NNN.js'` 로 깨진다 — dev 서버를 끄고 빌드
- Google Maps 키는 golfshin.vercel.app·localhost:3000 만 허용 — Vercel 미리보기 URL 에서는 지도가 안 뜬다(목록은 동작)
- 지도 틀은 `overflow-clip` — `overflow-hidden` 이면 포커스·scrollIntoView 가 시트를 밀어 올린다

## Files Touched

src/components/map/*, src/components/search/{SearchSection,SearchBar}.tsx, src/components/results/ResultSummary.tsx, src/hooks/{useMediaQuery,useFilters}.ts, src/lib/maps/*, src/lib/utils/{mapPins,sheetSnap,ccFilter,date}.ts, docs/FRONTEND.md
