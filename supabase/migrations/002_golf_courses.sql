-- ============================================================
-- 002_golf_courses.sql
-- 기존 golf_club_courses 테이블에 cc_name 단위 정규화 컬럼 추가
-- ============================================================
--
-- 배경: 기존 golf_clubs는 "스크래퍼 단위"라 1 row = 1 club_id이지만,
-- onetheclub처럼 하나의 스크래퍼가 여러 골프장(파주CC, 신라CC, 듄스코스,
-- 클럽72CC + 8개 제휴 CC)을 묶는 경우 단일 address/lat/lon이 의미가 없다.
--
-- 001 마이그레이션에 이미 정의된 golf_club_courses 테이블에 컬럼을 추가해
-- tee_times.cc_name과 매칭되는 단위로 골프장 정보(주소·좌표·지역·본진/제휴
-- 구분)를 관리한다. golf_clubs는 그대로 유지(스크래퍼 단위)되며,
-- golf_club_courses가 1:N 자식 테이블로 동작한다.

ALTER TABLE golf_club_courses
    ADD COLUMN IF NOT EXISTS cc_name      TEXT,
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS region       TEXT,
    ADD COLUMN IF NOT EXISTS is_partner   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sort_order   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- (club_id, cc_name) 조합 unique — tee_times.cc_name 매칭 키
CREATE UNIQUE INDEX IF NOT EXISTS golf_club_courses_club_cc_uniq
    ON golf_club_courses(club_id, cc_name)
    WHERE cc_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_golf_club_courses_cc_name
    ON golf_club_courses(cc_name) WHERE cc_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_golf_club_courses_region
    ON golf_club_courses(region) WHERE region IS NOT NULL;

-- updated_at 자동 갱신 트리거
DROP TRIGGER IF EXISTS set_updated_at_golf_club_courses ON golf_club_courses;
CREATE TRIGGER set_updated_at_golf_club_courses
    BEFORE UPDATE ON golf_club_courses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
