---
created: 2026-05-28T00:00:00+09:00
project: golf-next
summary: actions/checkout v4 → v5 (scrape-onetheclub workflow CI bump)
---

## Session Digest

1 commit (`f91dd56`), 1 file changed (+1/-1). `.github/workflows/scrape-onetheclub.yml`에서 `actions/checkout@v4` → `@v5`로 업데이트.

## Progress

### Session 2026-05-28
- [x] CI workflow `actions/checkout` v5 업그레이드 (scrape-onetheclub)

### Prior sessions
- 이전 세션 인계 내용은 git history 참조 (`db8f16f` 이전)

## Next Steps

1. 다른 워크플로(있다면)도 동일하게 `actions/checkout@v5` 일괄 적용 검토
2. scrape-onetheclub 다음 실행에서 v5 정상 동작 확인

## Blockers

없음.

## Watch Out

- `actions/checkout@v5`는 Node 24 런타임 사용. 만약 self-hosted runner이거나 구버전 Ubuntu라면 호환성 확인 필요. 현재는 `ubuntu-latest`라 문제 없음.

## Files Touched

- `.github/workflows/scrape-onetheclub.yml`
