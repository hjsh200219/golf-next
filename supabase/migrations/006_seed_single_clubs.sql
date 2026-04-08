-- ============================================================
-- 006_seed_single_clubs.sql
-- 단일 cc 클럽 + 1:N 클럽(onetheclub 외) 정규화 등록
-- ============================================================
--
-- 003에서는 onetheclub만 cc 단위로 등록했으나, tee_times를 전수조사한 결과
-- ga·laviebell·oakvalley·samsunggolf·sonofelice 5개 club도 1:N 관계임이
-- 확인됐다(예: oakvalley → 성문안CC/오크힐스CC/월송리CC). 또한 midas·ga 등은
-- club.name과 실제 cc_name이 다르다(midas → "마이다스레이크 이천").
--
-- 본 마이그레이션은 onetheclub 외 39개 club을 모두 golf_club_courses에 등록한다.
-- - 데이터 있는 19개 club: 실제 tee_times.cc_name 그대로 사용 (총 28 cc rows)
-- - 데이터 없는 20개 club: cc_name = club.name 추정 (1:1, 총 20 rows)
-- lat/lon은 일단 golf_clubs의 좌표를 그대로 reuse한다(같은 골프장 단지 내 sub
-- 코스이거나 1:1이라 적절). region은 CLUB_REGION_MAP 매핑을 따른다.
-- 사용자 표시명(display_name)도 cc_name과 동일하게 둔다(필요 시 후속 보정).
--
-- 모두 멱등(UPSERT)이며, 정확한 cc 좌표는 후속 작업으로 보정한다.

-- ─── 데이터 있는 1:N 클럽 (5개 club, 14 cc rows) ────────────────────
INSERT INTO golf_club_courses (
    club_id, course_name, lat, lon, address,
    cc_name, display_name, region, is_partner, sort_order, is_active
)
SELECT c.id, sub.cc_name, c.lat, c.lon, c.address,
       sub.cc_name, sub.cc_name, sub.region, FALSE, sub.sort_order, TRUE
  FROM golf_clubs c
  JOIN (VALUES
    -- ga (GA코리아) → 경기남부
    ('ga',          '골드CC',                 '경기남부', 100),
    ('ga',          '코리아CC',               '경기남부', 101),
    -- laviebell (라비에벨CC) → 강원
    ('laviebell',   '라비에벨CC 듄스',         '강원',     110),
    ('laviebell',   '라비에벨CC 올드',         '강원',     111),
    -- oakvalley (오크밸리) → 강원
    ('oakvalley',   '성문안CC',               '강원',     120),
    ('oakvalley',   '오크힐스CC',             '강원',     121),
    ('oakvalley',   '월송리CC',               '강원',     122),
    -- samsunggolf (삼성골프) → 경기남부
    ('samsunggolf', '가평베네스트GC',          '경기북부', 130),
    ('samsunggolf', '글렌로스GC',             '경기남부', 131),
    ('samsunggolf', '동래베네스트GC',          '강원',     132),
    ('samsunggolf', '삼성골프',               '경기남부', 133),
    ('samsunggolf', '안성베네스트GC',          '경기남부', 134),
    -- sonofelice (소노펠리체) → 강원
    ('sonofelice',  '비발디 East',           '강원',     140),
    ('sonofelice',  '소노펠리체CC 델피노',     '강원',     141)
  ) AS sub(club_id, cc_name, region, sort_order)
    ON sub.club_id = c.id
ON CONFLICT (club_id, cc_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  region       = EXCLUDED.region,
  sort_order   = EXCLUDED.sort_order,
  is_active    = EXCLUDED.is_active,
  lat          = EXCLUDED.lat,
  lon          = EXCLUDED.lon,
  address      = EXCLUDED.address,
  updated_at   = NOW();

-- ─── 데이터 있는 단일 cc 클럽 (14 cc rows, cc_name이 club.name과 다른 경우 포함) ──
INSERT INTO golf_club_courses (
    club_id, course_name, lat, lon, address,
    cc_name, display_name, region, is_partner, sort_order, is_active
)
SELECT c.id, sub.cc_name, c.lat, c.lon, c.address,
       sub.cc_name, sub.cc_name, sub.region, FALSE, 200, TRUE
  FROM golf_clubs c
  JOIN (VALUES
    ('cc360',         '360CC',              '경기남부'),
    ('edenblue',      '에덴블루CC',          '경기남부'),
    ('ferrum',        '페럼클럽CC',          '경기남부'),
    ('lakewood',      '레이크우드CC',         '경기북부'),
    ('lassagc',       '라싸GC',              '경기북부'),
    ('midas',         '마이다스레이크 이천',  '경기북부'),
    ('orangedunesyj', '오렌지듄스영종GC',     '인천'),
    ('rainbowhills',  '레인보우힐스CC',       '충청'),
    ('raycastle',     '레이캐슬 골프&리조트', '경기남부'),
    ('seowon',        '서원힐스CC',          '경기북부'),
    ('shinedale',     '샤인데일',            '강원'),
    ('southspring',   '사우스스프링스CC',     '경기남부'),
    ('sunningpoint',  '써닝포인트CC',         '경기남부'),
    ('theplayers',    '더플레이어스',         '강원')
  ) AS sub(club_id, cc_name, region)
    ON sub.club_id = c.id
ON CONFLICT (club_id, cc_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  region       = EXCLUDED.region,
  is_active    = EXCLUDED.is_active,
  lat          = EXCLUDED.lat,
  lon          = EXCLUDED.lon,
  address      = EXCLUDED.address,
  updated_at   = NOW();

-- ─── 데이터 없는 club (20 rows, cc_name = club.name 추정 1:1) ─────────
INSERT INTO golf_club_courses (
    club_id, course_name, lat, lon, address,
    cc_name, display_name, region, is_partner, sort_order, is_active
)
SELECT c.id, c.name, c.lat, c.lon, c.address,
       c.name, c.name, sub.region, FALSE, 300, TRUE
  FROM golf_clubs c
  JOIN (VALUES
    ('bearcreek',         '경기북부'),
    ('bearsbest',         '인천'),
    ('cascadia',          '강원'),
    ('ehscc',             '경기남부'),
    ('fortunehills',      '경기북부'),
    ('golfzoncounty',     '경기남부'),
    ('hilldeloci',        '강원'),
    ('jungbu',            '경기남부'),
    ('lakeside_new',      '경기남부'),
    ('namchuncheon_new',  '강원'),
    ('namyeoju',          '경기남부'),
    ('owners_new',        '강원'),
    ('philosgc',          '경기북부'),
    ('pinestone',         '충청'),
    ('purunsol',          '경기북부'),
    ('skyvalley',         '경기남부'),
    ('taekwang',          '경기남부'),
    ('thecrosby',         '경기남부'),
    ('tpcgolf',           '경기북부'),
    ('yangju',            '경기북부')
  ) AS sub(club_id, region)
    ON sub.club_id = c.id
ON CONFLICT (club_id, cc_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  region       = EXCLUDED.region,
  is_active    = EXCLUDED.is_active,
  lat          = EXCLUDED.lat,
  lon          = EXCLUDED.lon,
  address      = EXCLUDED.address,
  updated_at   = NOW();
