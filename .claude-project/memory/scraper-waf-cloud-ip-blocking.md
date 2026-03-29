---
name: scraper-waf-cloud-ip-blocking
description: bearcreek/bearsbest WAF(_fec_sbu)가 fetch+cheerio 및 클라우드 IP 차단, Railway 등 해외 클라우드 호스팅 불가
type: reference
created: 2026-03-29
---

bearcreek/bearsbest는 _fec_sbu WAF 사용. fetch+cheerio 방식과 클라우드 IP(Railway 싱가포르 등)를 모두 차단.
Playwright stealth 모드(webdriver=false, plugins override)로 로컬 한국 IP에서는 작동 확인 (bearcreek 11건, bearsbest 19건).

Railway 프로젝트 시도 결과: Docker+Playwright 환경 정상 작동하나 WAF가 클라우드 IP 자체를 차단.

**Why:** 스크래퍼 배포 환경 결정 시 핵심 제약 조건
**How to apply:** WAF 차단 골프장 스크래핑은 한국 IP(로컬 Mac, 한국 리전 VPS, residential proxy) 필요
