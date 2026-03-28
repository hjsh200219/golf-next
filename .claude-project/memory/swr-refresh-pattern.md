---
name: swr-refresh-pattern
description: SWR 새로고침 시 isValidating 사용, dedupingInterval 5s
type: project
created: 2026-03-28
---

SWR dedupingInterval을 60s에서 5s로 줄여야 수동 새로고침이 작동. UI 로딩 표시에는 isLoading이 아닌 isValidating 사용. isLoading은 초기 로드만, isValidating은 초기 로드 + revalidation(수동 새로고침 포함) 모두 커버.

**Why:** isLoading만 사용하면 새로고침 중 로딩 인디케이터가 표시되지 않아 UX 문제
**How to apply:** SWR 훅으로 로딩/새로고침 상태 구현 시
