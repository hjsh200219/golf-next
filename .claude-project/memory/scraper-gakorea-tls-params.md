---
name: scraper-gakorea-tls-params
description: GA Korea SSL 인증서 오류 → TLS 우회 필요, API 파라미터 cos:All/msDivision:21 필수
type: reference
created: 2026-03-29
---

GA Korea(gakorea.com) 스크래핑 시 SSL 인증서 체인 불완전으로 UNABLE_TO_VERIFY_LEAF_SIGNATURE 에러 발생.
BaseScraper의 tlsRejectUnauthorized getter를 false로 override하여 해결.

API 필수 파라미터 (Python 원본 참조):
- cos: 'All', msDivision: '21', msClass: '10', msLevel: '00'
- Referer: /Reservation/ReservationList.asp

**Why:** 파라미터 누락 시 빈 결과 반환, TLS 우회 없이는 연결 실패
**How to apply:** ga-korea 스크래퍼 수정 시 Python golf.py 원본과 대조
