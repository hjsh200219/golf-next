-- ============================================================
-- 003_seed_golf_courses.sql
-- onetheclub 16개 cc_name 시드 데이터 (본진 4곳/7코스 + 제휴 9곳)
-- ============================================================
--
-- 주: 단일 cc 클럽(40개 중 39개)은 golf_clubs와 1:1 매핑이라 별도 등록이
-- 필요하지 않다. 1:N 관계가 있는 onetheclub만 golf_club_courses에 등록한다.
-- 향후 단일 cc 클럽도 통합하려면 별도 마이그레이션에서 추가.
--
-- region: 기존 RegionKey('경기북부','경기남부','강원','인천','충청')에
-- 매핑되지 않는 호남/제주 지역은 NULL로 두고 후속 region 확장 시 채운다.
--
-- course_name 컬럼은 001 마이그레이션의 NOT NULL 컬럼이므로 cc_name과
-- 동일한 값을 채운다. (사용자 표시는 display_name 사용 권장)

-- 002에서 만든 partial unique index는 ON CONFLICT가 인식하지 못하므로
-- 일반 unique index로 교체한다. NULL은 PostgreSQL이 unique하게 취급
-- 하지 않으므로 cc_name=NULL인 기존 row가 여러 개여도 충돌 없음.
DROP INDEX IF EXISTS golf_club_courses_club_cc_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS golf_club_courses_club_cc_uniq
    ON golf_club_courses(club_id, cc_name);

INSERT INTO golf_club_courses (
    club_id, course_name, course_code, lat, lon, address,
    cc_name, display_name, region, is_partner, sort_order, is_active
) VALUES
  -- ─── 본진 (자체 운영 4곳, 클럽72CC는 4개 코스로 분리) ─────────────
  ('onetheclub', '파주CC',                'J54', 37.849298, 126.903291,
    '경기도 파주시 법원읍 화합로 306',
    '파주CC', '파주CC', '경기북부', FALSE, 10, TRUE),

  ('onetheclub', '신라CC',                'J53', 37.360007, 127.698260,
    '경기도 여주시 북내면 신라그린길 84',
    '신라CC', '신라CC', '경기남부', FALSE, 11, TRUE),

  ('onetheclub', '듄스',                  'J5A', 37.494637, 126.457048,
    '인천광역시 중구 영종해안북로847번길 42',
    '듄스', '듄스코스', '인천', FALSE, 12, TRUE),

  ('onetheclub', '클럽72CC 바다 레이크',  'D01-LAKE', 37.439597, 126.462440,
    '인천광역시 중구 공항동로 392',
    '클럽72CC 바다 레이크', '클럽72CC 바다 레이크', '인천', FALSE, 13, TRUE),

  ('onetheclub', '클럽72CC 바다 클래식',  'D01-CLASSIC', 37.439597, 126.462440,
    '인천광역시 중구 공항동로 392',
    '클럽72CC 바다 클래식', '클럽72CC 바다 클래식', '인천', FALSE, 14, TRUE),

  ('onetheclub', '클럽72CC 바다 오션',    'D01-OCEAN', 37.439597, 126.462440,
    '인천광역시 중구 공항동로 392',
    '클럽72CC 바다 오션', '클럽72CC 바다 오션', '인천', FALSE, 15, TRUE),

  ('onetheclub', '클럽72CC 하늘+연습장',  'D01-SKY', 37.439597, 126.462440,
    '인천광역시 중구 공항동로 392',
    '클럽72CC 하늘+연습장', '클럽72CC 하늘+연습장', '인천', FALSE, 16, TRUE),

  -- ─── 제휴 (9곳, 호남/제주는 region NULL) ─────────────────────────
  ('onetheclub', '[제휴]제주아덴힐',          'P01', 33.346272, 126.364411,
    '제주특별자치도 제주시 한림읍 화전길 82',
    '[제휴]제주아덴힐', '제주아덴힐', NULL, TRUE, 20, TRUE),

  ('onetheclub', '[제휴]해피니스CC(회원제)', 'P08', 34.995687, 126.839681,
    '전라남도 나주시 다도면 다도로 171-60',
    '[제휴]해피니스CC(회원제)', '해피니스CC (회원제)', NULL, TRUE, 21, TRUE),

  ('onetheclub', '[제휴]해피니스CC',          'P09', 34.995687, 126.839681,
    '전라남도 나주시 다도면 다도로 171-60',
    '[제휴]해피니스CC', '해피니스CC', NULL, TRUE, 22, TRUE),

  ('onetheclub', '[제휴]하이원CC',            'P10', 37.211536, 128.818212,
    '강원특별자치도 정선군 사북읍 하이원길 265',
    '[제휴]하이원CC', '하이원CC', '강원', TRUE, 23, TRUE),

  ('onetheclub', '[제휴]세이지우드 홍천',     'P11', 37.886990, 128.115978,
    '강원특별자치도 홍천군 두촌면 광석로 898-160',
    '[제휴]세이지우드 홍천', '세이지우드 홍천', '강원', TRUE, 24, TRUE),

  ('onetheclub', '[제휴]세이지우드 여수',     'P12', 34.713430, 127.724814,
    '전라남도 여수시 대경도길 111',
    '[제휴]세이지우드 여수', '세이지우드 여수경도', NULL, TRUE, 25, TRUE),

  ('onetheclub', '[제휴]파인힐스',            'P13', 35.039443, 127.270506,
    '전라남도 순천시 주암면 송광사길 99',
    '[제휴]파인힐스', '파인힐스', NULL, TRUE, 26, TRUE),

  ('onetheclub', '[제휴]사우스스프링스',      'P14', 37.175647, 127.454212,
    '경기도 이천시 모가면 공원로 64',
    '[제휴]사우스스프링스', '사우스스프링스', '경기남부', TRUE, 27, TRUE),

  ('onetheclub', '[제휴]크리스밸리',          'P15', 37.072000, 127.510000,
    '경기도 안성시 일죽면 일생로 212-41',
    '[제휴]크리스밸리', '크리스밸리CC', '경기남부', TRUE, 28, TRUE)
ON CONFLICT (club_id, cc_name) DO UPDATE SET
  course_name  = EXCLUDED.course_name,
  course_code  = EXCLUDED.course_code,
  lat          = EXCLUDED.lat,
  lon          = EXCLUDED.lon,
  address      = EXCLUDED.address,
  display_name = EXCLUDED.display_name,
  region       = EXCLUDED.region,
  is_partner   = EXCLUDED.is_partner,
  sort_order   = EXCLUDED.sort_order,
  is_active    = EXCLUDED.is_active,
  updated_at   = NOW();
