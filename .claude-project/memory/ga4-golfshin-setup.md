---
name: ga4-golfshin-setup
description: GolfShin GA4 속성 위치·측정ID·서비스계정 접근 미부여 상태
type: project
created: 2026-07-04
---

golfshin.vercel.app GA4 속성은 `accounts/353033332`("SH Consulting" GA 계정, shconsulting.ai/ikeike/thechain와 동일 계정) 아래 `properties/544166567`("GolfShin")로 생성됨. 측정ID `G-XGF7QPQ338`. gtag 스니펫은 `src/app/layout.tsx`에 `next/script`(afterInteractive)로 직접 삽입 — GTM 미경유(golf-next는 GTM 컨테이너 없음, shc/ikeike처럼 GTM 이관 안 함).

**Why:** 사용자가 "GA4 만들어줘, gtag 설치까지"라고 요청. Admin API `properties.create`는 GTM 계정ID(6360767339, gtm.mjs SITES의 `account` 필드)로 시도하면 403 — 그건 Tag Manager 계정이지 GA Admin 계정이 아님. `accounts.list`로 실제 GA 계정(SH Consulting=353033332) 확인 후 재시도해 성공.

**How to apply:**
- `~/.claude/skills/ga/ga-report.mjs`의 `ALIASES.golf` = `544166567` 로 `/ga golf` 조회 가능(SKILL.md 매핑표에도 등록됨).
- **서비스 계정(`ga-reader@marketing-team-484114.iam.gserviceaccount.com`) 뷰어 권한 미부여 상태** — Admin API `accessBindings` 생성은 `analytics.manage.users` 스코프 필요한데 현재 ADC 토큰엔 없어 403. `/ga golf` 실행 시 권한 오류 나면: GA 콘솔 → GolfShin 속성 → 관리 → 속성 액세스 관리 → 사용자 추가 → 위 이메일 → 뷰어. (또는 gcloud ADC를 `analytics.manage.users` 스코프 포함해 재로그인 후 API 재시도)
