---
created: 2026-03-28T16:30:00+09:00
project: golf-next
summary: 클럽 그룹 뷰, 스마트 이벤트 표시, UI/UX 개선, 날짜 탭 변경, 운영 최적화
---

## Session Digest

13개 커밋, 19개 파일 변경 (+500/-67 lines). 클럽 그룹 뷰 추가, 스마트 이벤트 표시 (할인/정보 분류), UI/UX 개선 (시간 배지, 가격 정렬, zebra stripe), 날짜 탭 내일/모레/글피 변경, 앱 아이콘 수정, cron 1시간 간격, .env 통일, 하네스 GC.

## Progress

### Session 2 (2026-03-28)
- [x] Pack 스킬: .claude-project/ 구조 생성 (memory + HANDOFF.md)
- [x] Harness GC: 중복 import, 데드코드 제거, 문서 업데이트
- [x] Cron 스케줄: 5분 → 1시간 간격
- [x] 앱 아이콘: 흰색 배경 flatten (iOS), favicon → logo.webp
- [x] .env.local → .env 통일, .env.vercel 삭제
- [x] 클럽 그룹 뷰: groupByClub + ClubGroupView + useUIPreferences + 뷰 토글
- [x] 스마트 이벤트: formatEventDisplay (할인/정보/쓰레기 분류)
- [x] 날짜 탭: 오늘/내일/모레 → 내일/모레/글피, 기본 내일
- [x] UI/UX: 시간 배지, 가격 우측 정렬, zebra stripe, 그룹 기본 접힘
- [x] CLAUDE.md 7건 업데이트
- [ ] Supabase Auth Site URL 변경 (localhost 문제)

### Session 1 (2026-03-27) — 이전 세션
- [x] Streamlit → Next.js 마이그레이션, 27개 스크래퍼
- [x] 지역 필터링, Supanova 디자인, 날씨 대시보드
- [x] 새로 수집 기능, 285개 테스트 통과, Vercel 배포

## Next Steps

1. **Supabase Auth Site URL** → golfshin.vercel.app
2. **골프장 딥링크** — 예약 사이트 연결
3. **즐겨찾기 필터** — 즐겨찾기 골프장만 보기
4. **실패 스크래퍼 디버깅** (3/35)
5. **SCRAPE_API_KEY 프로덕션 값** 변경
6. **Google OAuth Provider** 설정
7. **abortRef 미사용 코드** 정리

## Blockers

- Supabase Auth Site URL이 localhost → 프로덕션 로그인 불가

## Watch Out

- EUC-KR 복원 스크래퍼 7개 — 건드리지 말 것
- 에덴블루 가격 이상치 (139만원)
- SearchSection.tsx에 abortRef/useRef 미사용 코드 잔류
- cron 5분→1시간 변경 — 데이터 신선도 트레이드오프

## Files Touched

- `src/lib/utils/group.ts` (NEW), `src/components/results/ClubGroupView.tsx` (NEW)
- `src/hooks/useFilters.ts`, `src/components/results/TeeTimeTable.tsx`
- `src/components/search/SearchSection.tsx`, `src/components/search/SearchBar.tsx`
- `src/lib/utils/event.ts`, `agent.md`, `ARCHITECTURE.md`, `vercel.json`
- `public/favicon.webp` (NEW), `public/icon-*.png`, `public/apple-touch-icon.png`
