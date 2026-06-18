---
name: scrape-dispatch-waituntil
description: 스크랩 cron 504 = cosmetic (데이터는 남음). /api/scrape는 waitUntil로 dispatch만 하고 즉시 201, club 완료 안 기다림
type: project
created: 2026-06-18
---

스크랩 체인 3단: cron(`/api/scrape/cron`, maxDuration=60) → `await fetch('/api/scrape')` → `/api/scrape`가 (club×date)마다 `/api/scrape/club` fetch fan-out → 각 club은 **독립 서버리스 함수**로 동기 스크랩 후 응답.

**핵심 1 — cron 504는 대부분 cosmetic.** club 함수는 독립 invocation이라 cron이 60s에 죽어도 따로 완주·upsert. 504 = cron의 대기 시점이 넘은 것일 뿐 데이터는 남음. 실제 클럽별 성공 여부는 HTTP status 아니라 `scrape_club_results` 테이블이 authoritative.

**핵심 2 — `/api/scrape`는 dispatch만 하고 즉시 반환.** 예전엔 `await Promise.allSettled(pendingFetches)`로 모든 club 응답 대기 → 가장 느린 club이 전체를 bound → Vercel 60s 초과 → 504. 지금은 `waitUntil(Promise.allSettled(...))`(`@vercel/functions`) + 즉시 201. fetch flush 위해 함수는 살려두되 응답은 대기 안 함. cron의 await는 dispatch에서 resolve → 504 소멸. auth/job생성 실패는 여전히 non-201로 빠르게 노출.

**Why:** Vercel 서버리스에서 fan-out trigger fetch는 함수가 반환·freeze되면 미발사될 수 있어 살려둬야 함(기존 `await`가 하던 역할). 하지만 전체 완료까지 await하면 maxDuration에 걸림. waitUntil이 둘을 분리.
**How to apply:** next@14.2엔 `unstable_after` 없음 → `@vercel/functions`의 `waitUntil` 사용. fan-out dispatcher 패턴 어디서든 "함수 살려두되 응답은 즉시"가 필요하면 동일 적용. 관련 [[cron-scraping-interval]], [[scraped-at-upsert-behavior]].
