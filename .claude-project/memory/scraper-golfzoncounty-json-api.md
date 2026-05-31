---
name: scraper-golfzoncounty-json-api
description: 골프존카운티 사이트 마이그레이션 — POST /login/userLogin(form) + GET /reserve/multiple/teetime/getList JSON API
type: reference
created: 2026-06-01
---

골프존카운티는 구 ASP/HTML 스크래핑 방식에서 JSON API로 마이그레이션됨. 구 로그인 endpoint `/member/ajax/loginChk`는 404("관리자에 문의해주세요") 반환 — 죽음.

**현재 flow** (라이브 43 rows 검증):
1. 로그인: `POST /login/userLogin` form-urlencoded `{userId, userPw, autoLogin:'Y'}`, 비번 = pw1. 성공 시 `nw_gzFsessionid` 쿠키.
2. 데이터: `GET /reserve/multiple/teetime/getList?selectDate=YYYYMMDD&golfclubSeqArr=64,53,2,68` (anon=401, 로그인 필수).
3. 응답: `data.reserveDayTeetimeList[]` 각 `golfclubName` + `teetime[]`. teetime: `bookgTime`("1207"→12:07), `courseName`, `amt4`/`amt3`/`amt2`, `holeName`, `partName`.

**golfclubSeq**: 64=이글몬트, 53=안성H, 2=안성W, 68=송도.

**Why:** 한국 골프장 사이트 마이그레이션 사례. 구 endpoint가 404라 비번만 바꿔선 안 되고 전면 재작성 필요했음.
**How to apply:** 사이트 또 바뀌면 브라우저로 로그인+getList 캡처 후 갱신. [[scraper-site-migration-fragility]] 참조.
