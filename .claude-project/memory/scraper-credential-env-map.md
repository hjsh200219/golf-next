---
name: scraper-credential-env-map
description: 클럽마다 다른 비밀번호 env var 사용 (GOLF_LOGIN_PW*). credentials 객체로 매핑, 소스코드가 authoritative
type: reference
created: 2026-06-01
---

스크래퍼 로그인 자격증명은 `src/app/api/scrape/club/route.ts`에서 env → `credentials` 객체로 매핑되고, 각 스크래퍼가 `this.credentials.{field}`로 필요한 필드를 선택한다. 클럽마다 비밀번호 필드가 다르다.

**env → credentials 매핑** (`route.ts`): `GOLF_LOGIN_ID`→id, `GOLF_LOGIN_MOBILE`→mobile, `GOLF_LOGIN_PW`→pw, `GOLF_LOGIN_PW1`→pw1 … `GOLF_LOGIN_PW6`→pw6.

**검증된 클럽별 필드** (라이브 로그인으로 확인):
- yangju = pw6
- ferrum = pw6
- philosgc = pw6 + **id 대신 mobile** (`ctl00$ContentPlaceHolder1$txtUserID`에 mobile 전달)
- taekwang = pw4
- purunsol = pw1
- golfzoncounty = pw1
- ehscc = pw (라이브에서 pw1은 거부, pw가 정답)
- 그 외 대부분 = pw

**Why:** 로그인 실패 디버깅 시 "어느 PW env를 쓰는지"가 첫 확인 포인트. 클럽마다 달라 헷갈림. ehscc는 pw1로 바꿨다가 라이브 거부로 pw로 되돌린 사례 있음.
**How to apply:** 새 스크래퍼/로그인 디버깅 시 해당 스크래퍼의 `this.credentials.pwN`과 대응 env 확인. 소스코드가 authoritative. [[env-file-unified]] 참조.
