-- ============================================================
-- 007_cleanup_null_cc_courses.sql
-- cc_name=NULL인 stub course row 정리
-- ============================================================
--
-- 003 이전부터 golf_club_courses에 존재하던 1:1 stub row들 (cc_name=NULL,
-- region=NULL)을 삭제한다. 이 stub들은 cc 단위 정규화 이전 시기에 1:1
-- 가정으로 생성되었으며, 003/006 마이그레이션이 정규화된 cc-level row를
-- 추가했지만 ON CONFLICT (club_id, cc_name)가 NULL과는 충돌하지 않아
-- 잔존하게 되었다.
--
-- 새 정규화 모델에서는 cc_name이 cc 식별자 역할을 하므로 NULL row는
-- 의미가 없고, /api/clubs 응답에 노이즈로 포함되어 ClubFilter 카운트와
-- ccRestrictions 동작에 잠재 영향을 준다.
--
-- 안전성: golf_club_courses는 다른 테이블에서 FK로 참조되지 않는다.
-- tee_times.club_id는 golf_clubs(id)를 참조하고 cc_name은 텍스트 컬럼이라
-- cascade 영향 없음.
--
-- 영향 row 수 (확인 시점): 전체 116 중 52개 (active 클럽 45 + inactive 7)

DELETE FROM golf_club_courses WHERE cc_name IS NULL;

-- 검증: NULL row가 모두 제거되었는지 확인
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining FROM golf_club_courses WHERE cc_name IS NULL;
  IF remaining > 0 THEN
    RAISE EXCEPTION 'cleanup 실패: cc_name=NULL row가 % 개 남아있음', remaining;
  END IF;
END $$;
