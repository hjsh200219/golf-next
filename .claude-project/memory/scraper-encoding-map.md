---
name: scraper-encoding-map
description: 골프장별 EUC-KR/UTF-8 인코딩 매핑 (4개만 EUC-KR)
type: reference
created: 2026-03-28
---

스크래퍼 문자 인코딩:
- EUC-KR (4개): edenblue, pinestone, rainbowhills, tpcgolf
- UTF-8: 나머지 전부
- EUC-KR로 잘못 분류했다가 복원한 사이트 (7개): ferrum, sunningpoint, yangju, laviebell, cc360, philosgc, midas

새 스크래퍼 추가 시 기본 UTF-8, 한글 깨짐 발생 시에만 EUC-KR 전환.

**Why:** 잘못된 인코딩 적용 시 스크래핑 결과에서 한글이 깨짐
**How to apply:** 새 골프장 스크래퍼 추가 또는 한글 깨짐 디버깅 시
