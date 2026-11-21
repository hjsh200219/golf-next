# 미구현 골프장 목록

golf(Python) 프로젝트에 ID/PW가 등록되어 있으나, golf-next에서 스크래핑하지 못하는 골프장 목록.

> 최종 업데이트: 2026-11-21

## WAF 차단 (Playwright 필요)

| ID | 이름 | URL | 상태 |
|---|---|---|---|
| `bearcreek` | 베어크리크 | bearcreek.co.kr | WAF `_fec_sbu` → 406 차단. Playwright 스텔스 모드로 로컬에서는 작동 확인 (11건). 클라우드(Railway) IP에서는 차단됨 |
| `bearsbest` | 베어즈베스트 | bearsbestcheongnagc.com | WAF `_fec_sbu` → 406 차단. Playwright 스텔스 모드로 로컬에서는 작동 확인 (19건). 클라우드 IP에서는 차단됨 |

## 사이트 개편/폐쇄

| ID | 이름 | URL | 상태 |
|---|---|---|---|
| `jungbu` | 중부CC → **더 시에나 서울CC** | thesiena.co.kr (옛 akdjbcc.co.kr) | 2026-11-21 확인: 옛 도메인은 Cloudflare 530/1016(원본 없음). 골프장이 「더 시에나 서울CC」(회원제)로 개명·이전. 새 사이트와 API(`/api/v2/golf/reservation-times/alt`)는 서버 요청에 **Cloudflare 관리형 챌린지**(403 `cf-mitigated: challenge`) + 예약은 로그인 필요. 서버 fetch 스크래퍼로는 불가(포천힐스와 같은 유형). 실제 크롬은 챌린지를 통과하므로 막힘은 계정 — 시에나 계정이 없어 보류(11-21) |

## 봇 차단 / 로그인 차단 (Playwright로도 클라우드 불가)

> 2026-06-05 라이브 프로브로 재검증. 회원 여부: inter349는 fortunehills·lakeside·남춘천 회원 (남여주 비회원).

| ID | 이름 | URL | 상태 |
|---|---|---|---|
| `fortunehills` | 포천힐스CC | fortunehills.co.kr | **Cloudflare 챌린지**(`cf_clearance`). 로그인은 `Member/Login.aspx`(standalone), 데이터는 ASP.NET postback뿐(무로그인 XHR 없음). 로컬서 풀어도 Vercel IP 차단 위험(bearcreek 전례). |
| `lakeside_new` | 레이크사이드CC | lakeside.kr | **reCAPTCHA + Imperva 봇차단**. 로그인 폼 `recaptchaToken`, 데이터 `.do`는 로그인으로 바운스(`<script defer src='/<uuid>/'>` JS 챌린지). 무로그인 경로 없음. |
| `namyeoju` | 남여주CC | namyeoju.co.kr | **비회원** + 사이트 빈 껍데기(홈 1.7KB, 예약 링크 없음). Python 원본도 미완성 stub. |

## 구현 완료 (미구현 → 활성)

| ID | 이름 | 방식 | 일자 |
|---|---|---|---|
| `namchuncheon_new` | 남춘천CC | holeinonecloud.com REST API (JWT). `POST /api/v1/auth/login` → `GET /api/v1/booking/list/token?bookingDate=YYYY.MM.DD&bookingQueryType=ALL`, 헤더 `golfclubid:2`. 할인가(`greenFeeDiscountAmt`). | 2026-06-05 |
| `owners_new` | 오너스GC | seed부터 `playwright_inactive`·비활성이라 한 번도 수집되지 않았고, 코드 키(`owners`)도 행 id와 달랐다. 키를 `owners_new`로 맞추고 TLS 중간 인증서 누락 우회·로그인 `_csrf`·로그인/세션 실패 throw·표 머리 기반 코스 매핑·UTF-8. 지역 경기북부→강원(춘천) | 2026-11-21 |

## 요약

- 전체 등록(Python): 41개
- golf-next 활성: 34개 (2026-11-21 운영 `golf_clubs` is_active 33 + 오너스. 40행 중 비활성 6)
- 미구현: **6개** (WAF 2 + 사이트 개편·봇 차단 1(중부→더 시에나 서울) + 봇/로그인 차단 3)
- 제거: `sungmoon`(성문안) — oakvalley S1 코스와 동일 데이터(중복). oakvalley 스크래퍼가 `cc_name='성문안CC'`로 이미 커버. 2026-06-01 레지스트리에서 제거.
