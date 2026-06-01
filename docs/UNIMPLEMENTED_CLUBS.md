# 미구현 골프장 목록

golf(Python) 프로젝트에 ID/PW가 등록되어 있으나, golf-next에서 스크래핑하지 못하는 골프장 목록.

> 최종 업데이트: 2026-03-29

## WAF 차단 (Playwright 필요)

| ID | 이름 | URL | 상태 |
|---|---|---|---|
| `bearcreek` | 베어크리크 | bearcreek.co.kr | WAF `_fec_sbu` → 406 차단. Playwright 스텔스 모드로 로컬에서는 작동 확인 (11건). 클라우드(Railway) IP에서는 차단됨 |
| `bearsbest` | 베어즈베스트 | bearsbestcheongnagc.com | WAF `_fec_sbu` → 406 차단. Playwright 스텔스 모드로 로컬에서는 작동 확인 (19건). 클라우드 IP에서는 차단됨 |

## 사이트 개편/폐쇄

| ID | 이름 | URL | 상태 |
|---|---|---|---|
| `jungbu` | 중부CC | akdjbcc.co.kr | 사이트 리빌드됨. 로그인 페이지(`/html/member/login.asp`) 404 반환. Python 원본도 stub (미완성) |

## Python → Next.js 미마이그레이션

| ID | 이름 | URL | 비고 |
|---|---|---|---|
| `fortunehills` | 포천힐스CC | fortunehills.co.kr | ASP.NET Forms (Login.aspx / Reservation.aspx) |
| `namchuncheon_new` | 남춘천CC | namchuncheon.co.kr | `/member/login`, `/booking/real-time` |
| `lakeside_new` | 레이크사이드CC | lakeside.kr | `/login/login.do`, `/reservation/real_reservation.do` |
| `namyeoju` | 남여주CC | namyeoju.co.kr | `/login/login.asp`, `/Reservation/Reservation.aspx` |

## 요약

- 전체 등록(Python): 41개
- golf-next 활성: 33개
- 미구현: **7개** (WAF 2 + 사이트 개편 1 + 미마이그레이션 4)
- 제거: `sungmoon`(성문안) — oakvalley S1 코스와 동일 데이터(중복). oakvalley 스크래퍼가 `cc_name='성문안CC'`로 이미 커버. 2026-06-01 레지스트리에서 제거.
