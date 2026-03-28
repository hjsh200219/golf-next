---
name: supabase-auth-redirect-config
description: Supabase Auth Site URL은 대시보드에서만 변경 가능
type: reference
created: 2026-03-28
---

Supabase Auth OAuth 리다이렉트(Site URL)는 Supabase 대시보드 Authentication > URL Configuration에서만 수동 변경 가능. 클라이언트 API나 환경변수로 설정 불가. 프로덕션에서 로그인 후 localhost로 리다이렉트되면 대시보드 Site URL 설정 확인.

**Why:** 배포 후 인증 리다이렉트 오류 디버깅 시간 절약
**How to apply:** Supabase Auth 설정 또는 OAuth 플로우 디버깅 시
