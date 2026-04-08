-- ============================================================
-- 005_region_expand_and_geo_fix.sql
-- 1) 호남/제주 region 추가에 따라 onetheclub 제휴 5개 cc의 region 채움
-- 2) 저신뢰 좌표 3곳(cascadia, raycastle, crisvalley) 정확 좌표로 보정
-- ============================================================
--
-- 1) src/lib/constants/regions.ts에 호남(전남)·제주가 추가됨에 따라 003 시드에서
--    NULL로 두었던 5개 cc의 region을 채운다. 모두 onetheclub 제휴 cc로 위치는
--    이미 003 마이그레이션에서 확정됨.
--
-- 2) 003에서 confidence='low'로 표시한 3곳을 OpenStreetMap Nominatim API로
--    재조회한 정확 좌표(도로명까지 매칭)로 update.
--    - cascadia:   37.7300, 127.7980 → 37.738278, 127.814742
--    - raycastle:  37.3320, 127.4540 → 37.322827, 127.433586
--    - crisvalley: 37.072000, 127.510000 → 37.077129, 127.478812 (golf_courses)

-- ─── (1) onetheclub 제휴 5 cc region 채움 ────────────────────────────
UPDATE golf_club_courses SET region = '제주'
  WHERE club_id = 'onetheclub' AND cc_name = '[제휴]제주아덴힐';

UPDATE golf_club_courses SET region = '호남'
  WHERE club_id = 'onetheclub' AND cc_name = '[제휴]해피니스CC(회원제)';

UPDATE golf_club_courses SET region = '호남'
  WHERE club_id = 'onetheclub' AND cc_name = '[제휴]해피니스CC';

UPDATE golf_club_courses SET region = '호남'
  WHERE club_id = 'onetheclub' AND cc_name = '[제휴]세이지우드 여수';

UPDATE golf_club_courses SET region = '호남'
  WHERE club_id = 'onetheclub' AND cc_name = '[제휴]파인힐스';

-- ─── (2) 저신뢰 좌표 3곳 정확 좌표로 보정 ──────────────────────────
-- golf_clubs (스크래퍼 단위)
UPDATE golf_clubs SET lat = 37.738278, lon = 127.814742 WHERE id = 'cascadia';
UPDATE golf_clubs SET lat = 37.322827, lon = 127.433586 WHERE id = 'raycastle';

-- golf_club_courses의 onetheclub 크리스밸리 cc (003에서 추정값으로 등록됨)
UPDATE golf_club_courses
   SET lat = 37.077129, lon = 127.478812
 WHERE club_id = 'onetheclub' AND cc_name = '[제휴]크리스밸리';
