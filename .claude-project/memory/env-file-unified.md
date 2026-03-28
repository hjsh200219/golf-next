---
name: env-file-unified
description: .env.local 대신 .env 단일 파일 사용 (workspace 전체 통일)
type: project
created: 2026-03-28
---

환경변수 파일은 .env 하나만 사용 (.env.local 미사용). workspace 내 모든 프로젝트가 동일 규칙.

**Why:** 여러 프로젝트 간 일관성 유지, 환경변수 파일 중복/혼동 방지
**How to apply:** 환경변수 추가 시 .env에 작성, .env.local 생성하지 말 것
