-- ============================================================
-- 004_update_golf_clubs_address_geo.sql
-- 누락된 8개 club address 채우기 + 전체 32개 club 좌표(lat/lon) 채우기
-- ============================================================
--
-- 데이터 출처: kimcaddie.com (Schema.org JSON-LD), OpenStreetMap Overpass/Photon,
-- 각 골프장 공식 사이트, 네이버/카카오 지도, namu.wiki 등 다중 출처 검증.
-- 일부 신생/미등록 골프장(cascadia, raycastle)은 추정치이며 confidence='low'.

-- ─── 누락 주소 8개 (주소 + 좌표 동시 채움) ────────────────────────────
UPDATE golf_clubs SET
  address = '경기도 포천시 화현면 달인동로 35',
  lat     = 37.907257,
  lon     = 127.281203
WHERE id = 'bearcreek';

UPDATE golf_clubs SET
  address = '인천광역시 서구 청라대로316번길 45',
  lat     = 37.549438,
  lon     = 126.628648
WHERE id = 'bearsbest';

UPDATE golf_clubs SET
  address = '경기도 포천시 군내면 반월산성로 375번길 34',
  lat     = 37.885898,
  lon     = 127.247293
WHERE id = 'fortunehills';

UPDATE golf_clubs SET
  address = '경기도 광주시 곤지암읍 경충대로 451',
  lat     = 37.334708,
  lon     = 127.350500
WHERE id = 'jungbu';

UPDATE golf_clubs SET
  address = '경기도 용인시 처인구 모현읍 능원로 181',
  lat     = 37.310172,
  lon     = 127.162425
WHERE id = 'lakeside_new';

UPDATE golf_clubs SET
  address = '강원특별자치도 춘천시 신동면 오봉길 156',
  lat     = 37.790866,
  lon     = 127.692048
WHERE id = 'namchuncheon_new';

UPDATE golf_clubs SET
  address = '경기도 여주시 가남읍 가여로 532',
  lat     = 37.224003,
  lon     = 127.627938
WHERE id = 'namyeoju';

UPDATE golf_clubs SET
  address = '강원특별자치도 춘천시 남산면 동촌로 667',
  lat     = 37.771572,
  lon     = 127.658254
WHERE id = 'owners_new';

-- ─── 좌표만 채움 (32개, 주소는 이미 있음) ─────────────────────────────
UPDATE golf_clubs SET lat = 37.7300,   lon = 127.7980   WHERE id = 'cascadia';
UPDATE golf_clubs SET lat = 37.297094, lon = 127.735940 WHERE id = 'cc360';
UPDATE golf_clubs SET lat = 37.054566, lon = 127.387608 WHERE id = 'edenblue';
UPDATE golf_clubs SET lat = 37.215851, lon = 127.219758 WHERE id = 'ehscc';
UPDATE golf_clubs SET lat = 37.209265, lon = 127.683572 WHERE id = 'ferrum';
UPDATE golf_clubs SET lat = 37.217949, lon = 127.136339 WHERE id = 'ga';
UPDATE golf_clubs SET lat = 37.095674, lon = 127.334534 WHERE id = 'golfzoncounty';
UPDATE golf_clubs SET lat = 37.593727, lon = 127.710424 WHERE id = 'hilldeloci';
UPDATE golf_clubs SET lat = 37.780658, lon = 127.088212 WHERE id = 'lakewood';
UPDATE golf_clubs SET lat = 38.001588, lon = 127.378666 WHERE id = 'lassagc';
UPDATE golf_clubs SET lat = 37.741627, lon = 127.763474 WHERE id = 'laviebell';
UPDATE golf_clubs SET lat = 37.173379, lon = 127.523713 WHERE id = 'midas';
UPDATE golf_clubs SET lat = 37.426802, lon = 127.821051 WHERE id = 'oakvalley';
UPDATE golf_clubs SET lat = 37.434353, lon = 126.457479 WHERE id = 'orangedunesyj';
UPDATE golf_clubs SET lat = 37.938232, lon = 127.331192 WHERE id = 'philosgc';
UPDATE golf_clubs SET lat = 36.961924, lon = 126.668194 WHERE id = 'pinestone';
UPDATE golf_clubs SET lat = 37.841675, lon = 127.234299 WHERE id = 'purunsol';
UPDATE golf_clubs SET lat = 37.025762, lon = 127.648693 WHERE id = 'rainbowhills';
UPDATE golf_clubs SET lat = 37.3320,   lon = 127.4540   WHERE id = 'raycastle';
UPDATE golf_clubs SET lat = 37.310172, lon = 127.162425 WHERE id = 'samsunggolf';
UPDATE golf_clubs SET lat = 37.817919, lon = 126.903085 WHERE id = 'seowon';
UPDATE golf_clubs SET lat = 37.674564, lon = 127.565133 WHERE id = 'shinedale';
UPDATE golf_clubs SET lat = 37.332335, lon = 127.728076 WHERE id = 'skyvalley';
UPDATE golf_clubs SET lat = 37.640268, lon = 127.677063 WHERE id = 'sonofelice';
UPDATE golf_clubs SET lat = 37.175647, lon = 127.454212 WHERE id = 'southspring';
UPDATE golf_clubs SET lat = 37.144234, lon = 127.421587 WHERE id = 'sunningpoint';
UPDATE golf_clubs SET lat = 37.283850, lon = 127.086835 WHERE id = 'taekwang';
UPDATE golf_clubs SET lat = 37.236103, lon = 127.415715 WHERE id = 'thecrosby';
UPDATE golf_clubs SET lat = 37.776187, lon = 127.748891 WHERE id = 'theplayers';
UPDATE golf_clubs SET lat = 37.413668, lon = 127.645456 WHERE id = 'tpcgolf';
UPDATE golf_clubs SET lat = 37.643120, lon = 127.354115 WHERE id = 'yangju';

-- ─── onetheclub의 단일 club row는 cc 단위 데이터가 golf_courses로 이관됨 ──
-- 기존 address('경기 여주시 북내면 신라그린길 84')는 신라CC 한 곳의 주소이고
-- 원더클럽 전체를 대표하지 못하므로 좌표만 신라CC 대표 좌표로 두고 address는
-- 참고용으로 유지한다 (frontend가 onetheclub을 클릭하면 golf_courses에서
-- 12개 cc_name 단위 데이터로 분기 조회).
UPDATE golf_clubs SET
  lat = 37.360007,
  lon = 127.698260
WHERE id = 'onetheclub' AND lat IS NULL;
