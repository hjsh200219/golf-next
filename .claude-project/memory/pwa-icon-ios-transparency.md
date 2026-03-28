---
name: pwa-icon-ios-transparency
description: iOS PWA 아이콘은 투명 배경 불가, 흰색 배경으로 flatten 필수
type: reference
created: 2026-03-28
---

iOS(Safari/홈 화면)는 PWA 아이콘의 투명 영역을 검은색으로 렌더링. apple-touch-icon.png는 반드시 흰색 배경으로 flatten해서 제공. favicon.webp은 브라우저 탭용이므로 투명 배경 유지 가능.

**Why:** iOS에서 아이콘 모서리가 검정으로 보이는 문제 재발 방지
**How to apply:** 아이콘/로고 교체 시 iOS용은 반드시 배경 flatten
