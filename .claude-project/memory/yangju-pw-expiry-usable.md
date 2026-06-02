---
name: yangju-pw-expiry-usable
description: 양주CC 로그인 시 "비밀번호 변경기간 경과"는 실패 아님 — 만료 PW로도 세션 쿠키 발급·조회/예약 가능
type: project
created: 2026-06-02
---

양주CC(yangjucc.co.kr) 로그인 시 `alert("비밀번호 변경기간이 경과되었습니다...")` + 비번변경 페이지 리다이렉트가 떠도 **로그인 실패가 아니다.** 라이브 프로빙 확인: 만료 상태로도 (1) `ASPSESSIONID` 세션 쿠키 발급, (2) 그 세션으로 real_timelist 조회 시 로그인 바운스 없이 실제 슬롯 파싱됨.

`reservation-client.ts` login()은 이를 반영:
- `아이디 또는 비밀번호가 일치하지 않습니다` → throw (진짜 실패)
- `비밀번호 변경기간이 경과` → **통과 + log.warn** (세션 유효)
- `환영합니다` → 통과
- 그 외(셋 다 없음) → throw (미인증 바운스)

**Why:** 한국 사이트 90일 비번 강제변경 정책. 처음엔 login()이 만료를 throw로 막아 봇이 "로그인 실패" 응답 → 정상 동작 차단. 만료 PW도 예약 가능하다는 사용자 확인 + 라이브 프로빙으로 통과 처리로 수정(커밋 d45fbf8).

**How to apply:** 양주 봇 로그인 디버깅 시 "password expired" 에러를 자격증명 오류로 오인 말 것 — 세션은 유효. 단 **만료 PW 세션이 real_resOk(실예약)까지 받는지는 첫 실예약 전까지 미확정**. 첫 실예약 실패 시 PW 로테이션 필요할 수 있음. 관련: [[euckr-post-body-encoding]](~/.claude memory).
