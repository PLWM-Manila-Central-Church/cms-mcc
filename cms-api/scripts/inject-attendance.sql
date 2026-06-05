-- ============================================================
-- Attendance Data Injection Script for TiDB
-- Run this in TiDB Console to populate attendance history
-- ============================================================

-- STEP 1: Check what exists first
-- Run these SELECT queries to see current data before injecting

-- How many members?
SELECT COUNT(*) AS total_members FROM members WHERE is_deleted = 0;

-- How many services?
SELECT COUNT(*) AS total_services FROM services;

-- Existing attendance?
SELECT COUNT(*) AS total_attendance FROM attendances;

-- Cell groups?
SELECT id, name FROM cell_groups;


-- ============================================================
-- STEP 2: Create completed past services (if you need more)
-- Only run this section if you need additional services
-- ============================================================

INSERT INTO services (title, service_date, service_time, capacity, total_parking_slots, status, created_at, updated_at)
VALUES
  ('Sunday Worship Service', DATE_SUB(CURDATE(), INTERVAL 7 DAY), '09:00:00', 250, 50, 'completed', NOW(), NOW()),
  ('Sunday Worship Service', DATE_SUB(CURDATE(), INTERVAL 14 DAY), '09:00:00', 250, 50, 'completed', NOW(), NOW()),
  ('Sunday Worship Service', DATE_SUB(CURDATE(), INTERVAL 21 DAY), '09:00:00', 250, 50, 'completed', NOW(), NOW()),
  ('Sunday Worship Service', DATE_SUB(CURDATE(), INTERVAL 28 DAY), '09:00:00', 250, 50, 'completed', NOW(), NOW()),
  ('Midweek Prayer Meeting', DATE_SUB(CURDATE(), INTERVAL 10 DAY), '19:00:00', 100, 20, 'completed', NOW(), NOW()),
  ('Midweek Prayer Meeting', DATE_SUB(CURDATE(), INTERVAL 17 DAY), '19:00:00', 100, 20, 'completed', NOW(), NOW());


-- ============================================================
-- STEP 3: Insert attendance records for existing members
-- ~70% of members attend each service, ~30% absent
-- ============================================================

-- Attendance for service 1 week ago (70% attended)
INSERT INTO attendances (service_id, member_id, check_in_method, checked_in_at, recorded_by)
SELECT
  (SELECT id FROM services WHERE service_date = DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status = 'completed' LIMIT 1),
  m.id,
  IF(RAND() < 0.3, 'barcode', 'manual'),
  DATE_SUB(NOW(), INTERVAL 7 DAY),
  (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'Registration Team' LIMIT 1)
FROM members m
WHERE m.is_deleted = 0
  AND RAND() < 0.70
ON DUPLICATE KEY UPDATE check_in_method = VALUES(check_in_method);


-- Attendance for service 2 weeks ago (65% attended)
INSERT INTO attendances (service_id, member_id, check_in_method, checked_in_at, recorded_by)
SELECT
  (SELECT id FROM services WHERE service_date = DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND status = 'completed' LIMIT 1),
  m.id,
  IF(RAND() < 0.25, 'barcode', 'manual'),
  DATE_SUB(NOW(), INTERVAL 14 DAY),
  (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'Registration Team' LIMIT 1)
FROM members m
WHERE m.is_deleted = 0
  AND RAND() < 0.65
ON DUPLICATE KEY UPDATE check_in_method = VALUES(check_in_method);


-- Attendance for service 3 weeks ago (60% attended)
INSERT INTO attendances (service_id, member_id, check_in_method, checked_in_at, recorded_by)
SELECT
  (SELECT id FROM services WHERE service_date = DATE_SUB(CURDATE(), INTERVAL 21 DAY) AND status = 'completed' LIMIT 1),
  m.id,
  'manual',
  DATE_SUB(NOW(), INTERVAL 21 DAY),
  (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'Registration Team' LIMIT 1)
FROM members m
WHERE m.is_deleted = 0
  AND RAND() < 0.60
ON DUPLICATE KEY UPDATE check_in_method = VALUES(check_in_method);


-- Attendance for service 4 weeks ago (55% attended)
INSERT INTO attendances (service_id, member_id, check_in_method, checked_in_at, recorded_by)
SELECT
  (SELECT id FROM services WHERE service_date = DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND status = 'completed' LIMIT 1),
  m.id,
  'manual',
  DATE_SUB(NOW(), INTERVAL 28 DAY),
  (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'Registration Team' LIMIT 1)
FROM members m
WHERE m.is_deleted = 0
  AND RAND() < 0.55
ON DUPLICATE KEY UPDATE check_in_method = VALUES(check_in_method);


-- Attendance for midweek prayer 10 days ago (40% attended - smaller crowd)
INSERT INTO attendances (service_id, member_id, check_in_method, checked_in_at, recorded_by)
SELECT
  (SELECT id FROM services WHERE service_date = DATE_SUB(CURDATE(), INTERVAL 10 DAY) AND status = 'completed' LIMIT 1),
  m.id,
  'manual',
  DATE_SUB(NOW(), INTERVAL 10 DAY),
  (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'Registration Team' LIMIT 1)
FROM members m
WHERE m.is_deleted = 0
  AND RAND() < 0.40
ON DUPLICATE KEY UPDATE check_in_method = VALUES(check_in_method);


-- Attendance for midweek prayer 17 days ago (35% attended)
INSERT INTO attendances (service_id, member_id, check_in_method, checked_in_at, recorded_by)
SELECT
  (SELECT id FROM services WHERE service_date = DATE_SUB(CURDATE(), INTERVAL 17 DAY) AND status = 'completed' LIMIT 1),
  m.id,
  'manual',
  DATE_SUB(NOW(), INTERVAL 17 DAY),
  (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'Registration Team' LIMIT 1)
FROM members m
WHERE m.is_deleted = 0
  AND RAND() < 0.35
ON DUPLICATE KEY UPDATE check_in_method = VALUES(check_in_method);


-- ============================================================
-- STEP 4: Create service responses (pre-registrations)
-- ============================================================

-- Pre-registrations for the upcoming service
INSERT INTO service_responses (service_id, member_id, attendance_status, seat_number, created_at, updated_at)
SELECT
  (SELECT id FROM services WHERE status = 'published' ORDER BY service_date ASC LIMIT 1),
  m.id,
  IF(RAND() < 0.15, 'NOT_ATTENDING', IF(RAND() < 0.05, 'UNDECIDED', 'ATTENDING')),
  CONCAT('S-', FLOOR(1 + RAND() * 200)),
  NOW(),
  NOW()
FROM members m
WHERE m.is_deleted = 0
  AND RAND() < 0.80
ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status);


-- ============================================================
-- STEP 5: Update ServiceAttendanceSummary for all services
-- ============================================================

-- Upsert summary for each service that has attendance records
INSERT INTO service_attendance_summary (service_id, total_expected, total_attended, total_absent, updated_at)
SELECT
  s.id,
  s.capacity,
  (SELECT COUNT(*) FROM attendances a WHERE a.service_id = s.id),
  GREATEST(0, s.capacity - (SELECT COUNT(*) FROM attendances a WHERE a.service_id = s.id)),
  NOW()
FROM services s
WHERE s.status = 'completed'
ON DUPLICATE KEY UPDATE
  total_expected = VALUES(total_expected),
  total_attended = VALUES(total_attended),
  total_absent = VALUES(total_absent),
  updated_at = NOW();


-- ============================================================
-- STEP 6: Verify the injection
-- ============================================================

-- Total attendance records now
SELECT COUNT(*) AS total_attendance FROM attendances;

-- Attendance per service
SELECT
  s.title,
  s.service_date,
  s.capacity,
  sa.total_attended,
  sa.total_absent,
  ROUND((sa.total_attended / s.capacity) * 100, 1) AS attendance_rate_pct
FROM services s
LEFT JOIN service_attendance_summary sa ON sa.service_id = s.id
WHERE s.status = 'completed'
ORDER BY s.service_date DESC;

-- Attendance by check-in method
SELECT check_in_method, COUNT(*) AS count
FROM attendances
GROUP BY check_in_method;

-- Members with most absences (for cell group alerts)
SELECT
  m.first_name,
  m.last_name,
  cg.name AS cell_group,
  COUNT(DISTINCT s.id) AS total_services,
  COUNT(a.id) AS attended,
  COUNT(DISTINCT s.id) - COUNT(a.id) AS absent
FROM members m
CROSS JOIN services s
LEFT JOIN attendances a ON a.member_id = m.id AND a.service_id = s.id
LEFT JOIN cell_groups cg ON cg.id = m.cell_group_id
WHERE s.status = 'completed'
  AND m.is_deleted = 0
GROUP BY m.id, m.first_name, m.last_name, cg.name
HAVING absent > 0
ORDER BY absent DESC
LIMIT 20;
