---
name: supabase-browser-client-singleton
description: 브라우저 Supabase client는 싱글톤 필수 — createBrowserClient 매번 호출 시 auth-token navigator lock 경합
type: project
created: 2026-07-04
---

`@/lib/supabase/client`의 `createClient()`는 모듈 레벨 캐시로 **문서당 1개 인스턴스**만 만든다. `createBrowserClient`를 호출마다 새로 만들면 각 인스턴스가 자체 GoTrueClient로 같은 `lock:sb-<ref>-auth-token` navigator lock을 획득하려다 서로 뺏어 런타임 에러 발생:

```
Lock "lock:sb-...-auth-token" was released because another request stole it
```

`useAuth`(LoginButton 등 mount마다) + `signOut` + login page가 동시에 client를 만들면 재현됨. server client(`@/lib/supabase/server`)는 요청별 생성이 정상이라 건드리지 않음.

**Why:** 여러 GoTrueClient 인스턴스가 auth 락을 경합하면 세션 조회가 간헐 실패
**How to apply:** 브라우저 client는 항상 `createClient()`(싱글톤) 경유. 새 `createBrowserClient` 직접 호출 금지. dev에서 이미 뜬 에러는 hot-reload로 안 사라짐 → 하드 리프레시. 관련 [[postgrest-partial-index-upsert-trap]]
