---
name: postgrest-adhoc-query-traps
description: 진단용 PostgREST 직접 조회 함정 — limit=10000도 1000행에서 잘려 "데이터 구멍"으로 위장, URL 한글은 quote() 필요
type: project
created: 2026-08-07
---

앱 코드가 아니라 **일회성 진단 스크립트**로 Supabase REST(`/rest/v1/...`)를 때릴 때 걸리는 두 함정.

## 1. `limit` 파라미터로는 1000행 상한을 못 넘는다

`&limit=10000`을 붙여도 서버 `max_rows`(기본 1000)가 이긴다 → **정확히 1000행** 반환. 조용히 잘린다.

시간 버킷 집계에서 이게 **"크론이 안 돈 시간대"처럼 위장**한다. 실제로 `scrape_club_results`를 시간별로 버킷팅했을 때 11:00시가 통째로 비어 보였으나, 크론 누락이 아니라 잘림이었다. 그대로 믿었으면 "Vercel 크론 불안정하니 GitHub Actions 유지"라는 정반대 결론이 나올 뻔했다.

- **판별 sanity check:** 버킷별 카운트 합이 **정확히 1000**이면 실데이터가 아니라 상한이다.
- **해법:** 시간 범위를 좁게 쪼개 여러 번 질의하고(`scraped_at=gte.X&scraped_at=lt.Y`) 클라이언트에서 머지.
- 앱 코드 쪽 정식 해법(=`.range()` 페이지 순회)은 [[teetimes-maxrows-pagination]].

## 2. URL에 한글이 들어가면 `UnicodeEncodeError`

`cc_name=like.*듄스*` 같은 한글 필터를 URL에 그대로 넣으면 `urllib.request`가 터진다:
`UnicodeEncodeError: 'ascii' codec can't encode characters`

해법 — path+query를 통째로 quote하되 PostgREST 문법 문자는 살린다:

    from urllib.parse import quote
    path = quote(path, safe='?&=.*,')

**Why:** 진단 쿼리의 잘림은 에러가 아니라 "그럴듯한 빈 구간"으로 나타나서, 잘못된 아키텍처 결정(중복 크론 유지 등)까지 유도한다. 조용한 실패가 가장 비싸다.
**How to apply:** 스크립트로 DB를 직접 조회해 집계·검증할 때마다. 시간 버킷 결과에 구멍이 보이면 결론 내리기 전에 (a) 합이 1000인지, (b) 범위를 쪼개면 채워지는지 먼저 확인. 관련 [[scrape-scheduler-attribution]]
