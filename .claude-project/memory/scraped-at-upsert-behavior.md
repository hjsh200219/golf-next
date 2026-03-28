---
name: scraped-at-upsert-behavior
description: UPSERT 시 scraped_at 타임스탬프 명시적 포함 필수
type: project
created: 2026-03-28
---

스크래핑 데이터 Supabase UPSERT 시 scraped_at을 반드시 페이로드에 포함. Supabase UPSERT(ON CONFLICT DO UPDATE)는 SET 절에 포함된 컬럼만 업데이트. scraped_at 누락 시 최초 INSERT 값 유지되어 데이터 갱신 시점 확인 불가.

**Why:** 타임스탬프 미갱신 시 오래된 데이터가 최신처럼 보이는 문제
**How to apply:** 스크래퍼 데이터 저장 또는 새로운 UPSERT 로직 추가 시
