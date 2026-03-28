---
created: 2026-03-28T23:30:00+09:00
project: golf-next
summary: 지역별 필터링 구현 완료 및 배포, 디자인 리뷰 대기
---

## Session Digest

골프 티타임 조회 앱(golfshin.vercel.app)에 지역 기반 필터링 기능을 RALPLAN 합의 → TDD로 구현 완료. 5개 권역(경기북부/남부, 강원, 인천, 충청), 35개 골프장 매핑. 14개 신규 테스트 추가하여 전체 285개 통과. Vercel 배포 완료.

이전 작업: Streamlit→Next.js 마이그레이션, 27개 스크래퍼, Supanova 디자인, 모바일/인코딩 수정 등.

## Progress

- [x] 지역 필터링 (5개 권역, 35개 골프장, regions.ts + RegionFilter.tsx)
- [x] Supanova 디자인 적용 (Pretendard, glassmorphism, spring transitions)
- [x] 한글 인코딩 수정 (EUC-KR 4개 / UTF-8 나머지)
- [x] 모바일 가로 스크롤 수정 (카드 뷰)
- [x] 날씨 대시보드 (48h 시간별 + 8일 일별)
- [x] 새로 수집 기능 (/api/refresh → 실제 스크래핑)
- [x] Vercel Cron 5분 간격 자동 스크래핑
- [x] 285개 테스트 통과
- [x] golfshin.vercel.app 배포 완료
- [ ] Supabase Auth Site URL 변경 (현재 localhost 리다이렉트)
- [ ] /gstack-plan-design-review 디자인 리뷰

## Next Steps

1. **Supabase Auth Site URL 변경** — 대시보드에서 golfshin.vercel.app으로 (프로덕션 로그인 차단 중)
2. **/gstack-plan-design-review** — 디자인 리뷰 실행
3. **골프장 딥링크** — 예약 사이트로 직접 연결
4. **즐겨찾기 필터** — 즐겨찾기한 골프장만 보기
5. **실패 스크래퍼 디버깅** — 3/35 간헐적 실패
6. **SCRAPE_API_KEY 프로덕션 값 변경**
7. **Google OAuth Provider 설정**
8. **커스텀 도메인 연결**

## Blockers

- Supabase Auth Site URL이 localhost로 설정되어 프로덕션 Google 로그인 불가 (대시보드에서 수동 변경 필요)

## Watch Out

- EUC-KR에서 UTF-8로 복원한 스크래퍼 7개 (ferrum, sunningpoint, yangju, laviebell, cc360, philosgc, midas) — 다시 건드리지 말 것
- middleware.ts에 /?code= 리다이렉트 추가됨 — Auth 콜백 라우팅 변경 시 주의
- 에덴블루 가격 이상치 (139만원) — 스크래퍼 파싱 확인 필요
- FilterPanel.tsx에 중복 임포트 2건 (react, useFilters) — 정리 필요

## Files Touched

- `src/lib/constants/regions.ts` (NEW)
- `src/components/search/RegionFilter.tsx` (NEW)
- `src/components/search/FilterPanel.tsx` (MODIFIED)
- `src/components/search/SearchSection.tsx` (MODIFIED)
- `src/components/search/SearchBar.tsx` (MODIFIED)
- `src/hooks/useTeeTimes.ts` (MODIFIED)
- `src/hooks/useWeather.ts` (MODIFIED)
- `src/components/weather/HourlyChart.tsx` (MODIFIED)
- `src/components/weather/WeatherDashboard.tsx` (MODIFIED)
- `src/app/api/refresh/route.ts` (NEW)
- `src/app/api/scrape/club/route.ts` (MODIFIED)
- `src/middleware.ts` (MODIFIED)
- `src/lib/utils/event.ts` (NEW)
- `src/lib/scrapers/base.ts` (MODIFIED)
- `vercel.json` (NEW)
- `CLAUDE.md` (NEW)
