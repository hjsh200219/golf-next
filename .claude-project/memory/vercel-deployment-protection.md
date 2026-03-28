---
name: vercel-deployment-protection
description: Vercel SSO 보호가 내부 API 호출 차단, 안정 alias URL 사용 필수
type: project
created: 2026-03-28
---

Vercel Deployment Protection(SSO/비밀번호)이 동일 배포 내 서버리스 함수 간 API 호출을 차단할 수 있음. NEXT_PUBLIC_APP_URL은 안정적인 배포 alias(golfshin.vercel.app)로 설정해야 하며, 빌드별 URL(golf-next-abc123.vercel.app)은 사용 금지.

**Why:** 빌드별 URL은 보호 규칙이 다를 수 있어 배포 후 API 실패 발생
**How to apply:** Vercel 환경변수 설정 또는 배포된 서버리스 함수 API 실패 디버깅 시
