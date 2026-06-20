---
name: geo-seo-assets
description: GolfShin GEO/SEO 자산 4종 위치 + 콘텐츠 변경 시 동기화 규칙 + 메인 봇 공개 여부
type: project
created: 2026-06-20
---

GolfShin의 GEO(AI 엔진)/SEO 자산은 4곳. 콘텐츠/기능 추가 시 함께 갱신해야 AI·검색엔진이 인식한다.

- `public/llms.txt` — 정적. AI/LLM용 서비스 설명. 기능·골프장·이용안내 섹션.
- `src/lib/schema.ts` — JSON-LD 동적 생성(WebSite·WebApplication·FAQPage). `JsonLdSchema.tsx`가 layout에서 전 페이지 렌더. `getScraperCount()` 등으로 골프장 수 자동 반영. FAQ `mainEntity`는 position 필드 없음.
- `src/app/sitemap.ts` — 동적 `/sitemap.xml`. 색인 대상만(/, /weather, /chatbot). `/settings`·`/login`·`/_offline` 제외.
- `src/app/robots.ts` — 동적 `/robots.txt`. production은 전체 allow(AI 크롤러 미차단=GEO 핵심)+`/api/` disallow+sitemap 참조, `VERCEL_ENV!=='production'`(preview)은 전체 disallow로 *.vercel.app 색인 차단.

메인 텔레그램 봇 `@golfshinbot`은 **allowlist 없이 전체 공개**(webhook `/api/telegram/webhook`에 게이팅 없음). `/chatbot` 안내 페이지가 이 봇을 소개·링크. (allowlist 게이팅은 양주봇만 — [[yangju-bot-allowlist]] 참고.)

**Why:** AI 답변 노출은 robots가 크롤러를 막지 않아야 가능. sitemap/robots 부재 시 신규 페이지 발견성 저하.
**How to apply:** 새 페이지/기능 추가 시 llms.txt + schema.ts(필요시 FAQ) 동기화하고, 공개 색인 페이지면 sitemap.ts에 추가. `/sh:geo-update`로 자동 동기화 가능.
