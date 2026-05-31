---
name: scraper-upsert-dedup-encoding-trap
description: scrape success인데 DB 0행 = upsert 배치 내 (club_id,date,teeoff,course) 키 중복으로 전체 실패. 인코딩 깨짐도 가짜 중복 유발
type: reference
created: 2026-06-01
---

scrape 결과 `success` + `count>0`인데 `tee_times` DB에 0행이면, upsert 배치 실패다. `/api/scrape/club`의 `supabase.upsert(rows, {onConflict:'club_id,date,teeoff,course'})`는 **같은 배치에 conflict 키가 중복되면 "ON CONFLICT DO UPDATE command cannot affect row a second time"로 전체 실패**한다.

**두 가지 중복 원인 (실제 사례):**
1. **진짜 중복**: 응답에 테이블이 2번 들어옴. philosgc의 ASP.NET UpdatePanel delta 응답이 그 예 (186행 = 93행 ×2). → `dedupeTeeTimeRows()` (src/lib/utils/tee-time.ts)로 upsert 전 제거.
2. **가짜 중복 (인코딩)**: euc-kr 사이트를 `res.text()`(utf-8)로 읽으면 코스명이 깨진다. yangju의 서(BC AD)/동(B5 BF)이 둘 다 `U+FFFD U+FFFD`로 붕괴 → `(teeoff, ��)` 키가 충돌. → `textWithEncoding(res, 'euc-kr')`로 인코딩 수정하면 진짜 코스명 복원되어 중복 사라짐.

**Why:** 둘 다 "scrape는 성공 보고, DB는 빈" 동일 증상. 원인 분리 안 하면 dedup만 적용해 인코딩 깨진 데이터를 실데이터 손실과 함께 통과시킴.
**How to apply:** scrape success인데 DB 0행이면 → (a) 라이브 scrape 후 course에 `�` 있는지 확인(인코딩), (b) `(teeoff,course)` 중복 개수 확인(테이블 중복). route.ts는 upsert 에러를 status=failed로 표면화하므로 scrape_club_results.error_message 확인. [[scraper-encoding-map]] [[scraper-aspnet-updatepanel-postback]] 참조.
