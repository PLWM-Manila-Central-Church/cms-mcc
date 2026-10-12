# Live TiDB Schema Catalog

Snapshot date: 2026-10-12. Target schema: `qr_attendance_qa`; server: `8.0.11-TiDB-v8.5.3-serverless`.

> Read-only metadata snapshot of the isolated QA schema. It includes schema names, column/index/foreign-key definitions, and exact aggregate row counts only; it does not export row-level member, finance, or credential data. TiDB storage-size estimates are omitted because they vary between reads and are not useful capacity evidence at this QA scale.

- Base tables: 58 (57 Sequelize model tables plus `SequelizeMeta`).
- Live columns: 528. Index definitions: 291. Physical foreign-key constraints: 129.
- Exact aggregate rows: 374; applied migrations recorded in SequelizeMeta: 100.
- Model-only tables: none. Live-only tables excluding SequelizeMeta: none.

## Model/live column differences

No model/live column-name differences were found.

## Model/live type differences

No type differences were detected for the normalized SQL types supported by this comparison.

## Table inventory

| Table | Exact rows | Columns | Indexes | Foreign keys |
| --- | ---: | ---: | ---: | ---: |
| `SequelizeMeta` | 100 | 1 | 2 | 0 |
| `accounts` | 0 | 6 | 3 | 1 |
| `archive_access_logs` | 0 | 5 | 3 | 2 |
| `archive_categories` | 8 | 5 | 2 | 0 |
| `archive_records` | 0 | 18 | 8 | 4 |
| `archive_versions` | 0 | 8 | 3 | 2 |
| `attachments` | 0 | 7 | 4 | 3 |
| `attendance_batch_items` | 0 | 13 | 10 | 7 |
| `attendance_batches` | 0 | 18 | 13 | 6 |
| `attendance_expected_members` | 0 | 7 | 8 | 4 |
| `attendance_sessions` | 0 | 25 | 9 | 4 |
| `attendances` | 0 | 16 | 14 | 8 |
| `audit_logs` | 16 | 9 | 7 | 1 |
| `cell_group_history` | 0 | 7 | 5 | 4 |
| `cell_groups` | 0 | 5 | 2 | 0 |
| `emergency_contacts` | 0 | 7 | 2 | 1 |
| `event_attendances` | 0 | 18 | 13 | 8 |
| `event_categories` | 0 | 5 | 2 | 0 |
| `event_registrations` | 0 | 7 | 7 | 3 |
| `events` | 0 | 20 | 6 | 3 |
| `expense_categories` | 0 | 6 | 3 | 1 |
| `expenses` | 0 | 10 | 5 | 4 |
| `financial_categories` | 8 | 6 | 2 | 0 |
| `financial_records` | 0 | 15 | 10 | 4 |
| `funds` | 0 | 5 | 2 | 0 |
| `inventory_categories` | 0 | 4 | 2 | 0 |
| `inventory_items` | 0 | 11 | 3 | 1 |
| `inventory_requests` | 0 | 14 | 11 | 6 |
| `inventory_transactions` | 0 | 11 | 5 | 2 |
| `inventory_usage` | 0 | 6 | 3 | 2 |
| `invited_members` | 0 | 10 | 4 | 1 |
| `member_notes` | 0 | 7 | 3 | 2 |
| `member_qr_credentials` | 0 | 12 | 7 | 3 |
| `member_status_history` | 0 | 7 | 3 | 2 |
| `members` | 4 | 20 | 15 | 4 |
| `ministries` | 13 | 7 | 4 | 1 |
| `ministry_applications` | 0 | 11 | 7 | 3 |
| `ministry_assignments` | 0 | 8 | 5 | 3 |
| `ministry_event_invites` | 0 | 9 | 6 | 4 |
| `ministry_groups` | 0 | 4 | 2 | 0 |
| `ministry_memberships` | 0 | 5 | 5 | 3 |
| `ministry_positions` | 0 | 7 | 3 | 1 |
| `ministry_roles` | 13 | 4 | 2 | 0 |
| `notifications` | 0 | 9 | 6 | 1 |
| `password_reset_tokens` | 0 | 6 | 3 | 1 |
| `payment_methods` | 3 | 5 | 2 | 0 |
| `permissions` | 72 | 6 | 2 | 0 |
| `refresh_tokens` | 15 | 8 | 4 | 2 |
| `role_permissions` | 78 | 4 | 4 | 2 |
| `roles` | 8 | 6 | 2 | 0 |
| `service_attendance_summary` | 0 | 6 | 2 | 1 |
| `service_responses` | 0 | 10 | 6 | 3 |
| `services` | 0 | 10 | 3 | 0 |
| `substitute_requests` | 0 | 9 | 5 | 4 |
| `system_settings` | 20 | 5 | 3 | 1 |
| `user_leader_assignments` | 0 | 13 | 5 | 2 |
| `user_sessions` | 15 | 6 | 2 | 1 |
| `users` | 1 | 19 | 7 | 3 |

## Live table definitions

### `SequelizeMeta`

Engine: InnoDB; exact rows: 100.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `name` | `varchar(255)` | NO | — | PRI |  |

Indexes
- Unique `PRIMARY` (name); BTREE
- Unique `name_2` (name); BTREE

Foreign keys
- None

### `accounts`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `fund_id` | `int unsigned` | NO | — |  |  |
| `description` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (fund_id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- `fk_1`: (fund_id) → (funds.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `archive_access_logs`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `record_id` | `int unsigned` | NO | — |  |  |
| `accessed_by` | `int unsigned` | NO | — |  |  |
| `action` | `enum('view','download')` | NO | — |  |  |
| `accessed_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (record_id); BTREE
- Non-unique `fk_2` (accessed_by); BTREE

Foreign keys
- `fk_1`: (record_id) → (archive_records.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (accessed_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `archive_categories`

Engine: InnoDB; exact rows: 8.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `description` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `archive_records`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `category_id` | `int unsigned` | NO | — | MUL |  |
| `title` | `varchar(255)` | NO | — |  |  |
| `description` | `text` | YES | — |  |  |
| `file_url` | `varchar(500)` | NO | — |  |  |
| `file_type` | `enum('pdf','docx','xlsx','jpg','png','mp4','mp3')` | NO | — |  |  |
| `file_size` | `int unsigned` | YES | — |  |  |
| `document_date` | `date` | YES | — |  |  |
| `visibility` | `enum('public','restricted','confidential')` | NO | public |  |  |
| `status` | `enum('pending','approved','deleted')` | NO | pending | MUL |  |
| `uploaded_by` | `int unsigned` | NO | — |  |  |
| `approved_by` | `int unsigned` | YES | — |  |  |
| `is_deleted` | `tinyint` | NO | 0 |  |  |
| `deleted_at` | `datetime` | YES | — |  |  |
| `deleted_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |
| `current_version_id` | `int unsigned` | YES | — | MUL |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (category_id); BTREE
- Non-unique `fk_2` (uploaded_by); BTREE
- Non-unique `fk_3` (approved_by); BTREE
- Non-unique `fk_4` (deleted_by); BTREE
- Non-unique `idx_archive_records_category_deleted` (category_id, is_deleted); BTREE
- Non-unique `idx_archive_records_current_version` (current_version_id); BTREE
- Non-unique `idx_archive_records_status_deleted` (status, is_deleted); BTREE

Foreign keys
- `fk_1`: (category_id) → (archive_categories.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (uploaded_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (approved_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_4`: (deleted_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `archive_versions`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `record_id` | `int unsigned` | NO | — |  |  |
| `file_url` | `varchar(500)` | NO | — |  |  |
| `file_type` | `varchar(50)` | NO | — |  |  |
| `version_number` | `int unsigned` | NO | — |  |  |
| `uploaded_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `file_size` | `int unsigned` | YES | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (record_id); BTREE
- Non-unique `fk_2` (uploaded_by); BTREE

Foreign keys
- `fk_1`: (record_id) → (archive_records.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (uploaded_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `attachments`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `income_id` | `int unsigned` | YES | — |  |  |
| `expense_id` | `int unsigned` | YES | — |  |  |
| `file_name` | `varchar(255)` | NO | — |  |  |
| `file_path` | `varchar(500)` | NO | — |  |  |
| `uploaded_by` | `int unsigned` | NO | — |  |  |
| `uploaded_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (income_id); BTREE
- Non-unique `fk_2` (expense_id); BTREE
- Non-unique `fk_3` (uploaded_by); BTREE

Foreign keys
- `fk_1`: (income_id) → (financial_records.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_2`: (expense_id) → (expenses.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_3`: (uploaded_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `attendance_batch_items`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `batch_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `captured_by` | `int unsigned` | NO | — |  |  |
| `capture_method` | `enum('qr','manual')` | NO | — |  |  |
| `captured_at` | `datetime` | NO | — |  |  |
| `cell_group_id_at_capture` | `int unsigned` | YES | — |  |  |
| `group_id_at_capture` | `int unsigned` | YES | — |  |  |
| `outcome` | `enum('pending','confirmed','already_confirmed')` | NO | pending |  |  |
| `service_attendance_id` | `int unsigned` | YES | — |  |  |
| `event_attendance_id` | `int unsigned` | YES | — | MUL |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (batch_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (captured_by); BTREE
- Non-unique `fk_4` (cell_group_id_at_capture); BTREE
- Non-unique `fk_5` (group_id_at_capture); BTREE
- Non-unique `fk_6` (service_attendance_id); BTREE
- Non-unique `fk_qr_batch_item_event_attendance` (event_attendance_id); BTREE
- Non-unique `idx_qr_batch_item_outcome` (batch_id, outcome); BTREE
- Unique `unique_qr_batch_item_member` (batch_id, member_id); BTREE

Foreign keys
- `fk_1`: (batch_id) → (attendance_batches.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (captured_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_4`: (cell_group_id_at_capture) → (cell_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_5`: (group_id_at_capture) → (ministry_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_6`: (service_attendance_id) → (attendances.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_qr_batch_item_event_attendance`: (event_attendance_id) → (event_attendances.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `attendance_batches`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `session_id` | `int unsigned` | NO | — | MUL |  |
| `public_id` | `char(36)` | NO | — | UNI |  |
| `submitted_by` | `int unsigned` | NO | — | MUL |  |
| `cell_group_id` | `int unsigned` | YES | — | MUL |  |
| `group_id` | `int unsigned` | YES | — | MUL |  |
| `state` | `enum('draft','submitted','approved','rejected','withdrawn')` | NO | draft |  |  |
| `revision` | `int unsigned` | NO | 1 |  |  |
| `content_digest` | `varchar(64)` | YES | — |  |  |
| `idempotency_key` | `char(36)` | NO | — |  |  |
| `supersedes_batch_id` | `int unsigned` | YES | — |  |  |
| `submitted_at` | `datetime` | YES | — |  |  |
| `approval_deadline` | `datetime` | NO | — |  |  |
| `reviewed_by` | `int unsigned` | YES | — |  |  |
| `reviewed_at` | `datetime` | YES | — |  |  |
| `decision_reason` | `varchar(500)` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (session_id); BTREE
- Non-unique `fk_2` (submitted_by); BTREE
- Non-unique `fk_3` (cell_group_id); BTREE
- Non-unique `fk_4` (group_id); BTREE
- Non-unique `fk_5` (supersedes_batch_id); BTREE
- Non-unique `fk_6` (reviewed_by); BTREE
- Non-unique `idx_qr_batch_cell_scope` (cell_group_id, session_id, state); BTREE
- Non-unique `idx_qr_batch_group_scope` (group_id, session_id, state); BTREE
- Non-unique `idx_qr_batch_owner_state` (submitted_by, session_id, state); BTREE
- Non-unique `idx_qr_batch_session_state` (session_id, state, submitted_at); BTREE
- Unique `public_id` (public_id); BTREE
- Unique `unique_qr_batch_idempotency` (submitted_by, idempotency_key); BTREE

Foreign keys
- `fk_1`: (session_id) → (attendance_sessions.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (submitted_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (cell_group_id) → (cell_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_4`: (group_id) → (ministry_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_5`: (supersedes_batch_id) → (attendance_batches.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_6`: (reviewed_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `attendance_expected_members`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `session_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `source` | `enum('event_registration','service_rsvp','staff_added')` | NO | — |  |  |
| `cell_group_id_at_freeze` | `int unsigned` | YES | — |  |  |
| `group_id_at_freeze` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (session_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (cell_group_id_at_freeze); BTREE
- Non-unique `fk_4` (group_id_at_freeze); BTREE
- Non-unique `idx_qr_expected_cell_group` (session_id, cell_group_id_at_freeze); BTREE
- Non-unique `idx_qr_expected_group` (session_id, group_id_at_freeze); BTREE
- Unique `unique_qr_expected_session_member` (session_id, member_id); BTREE

Foreign keys
- `fk_1`: (session_id) → (attendance_sessions.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (cell_group_id_at_freeze) → (cell_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_4`: (group_id_at_freeze) → (ministry_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `attendance_sessions`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `service_id` | `int unsigned` | YES | — | UNI |  |
| `event_id` | `int unsigned` | YES | — | MUL |  |
| `session_key` | `varchar(80)` | NO | primary |  |  |
| `title` | `varchar(150)` | NO | — |  |  |
| `starts_at` | `datetime` | NO | — |  |  |
| `ends_at` | `datetime` | NO | — |  |  |
| `check_in_opens_at` | `datetime` | NO | — |  |  |
| `check_in_closes_at` | `datetime` | NO | — |  |  |
| `approval_deadline` | `datetime` | NO | — |  |  |
| `time_zone` | `varchar(64)` | NO | Asia/Manila |  |  |
| `status` | `enum('draft','open','closed','cancelled')` | NO | draft | MUL |  |
| `expected_basis` | `enum('none','registrations','explicit_roster')` | NO | none |  |  |
| `registration_required` | `tinyint` | NO | 0 |  |  |
| `leader_confirmation_mode` | `enum('direct','batch_review')` | NO | batch_review |  |  |
| `expected_roster_frozen_at` | `datetime` | YES | — |  |  |
| `created_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |
| `config_revision` | `int unsigned` | NO | 1 |  |  |
| `activity_revision` | `int unsigned` | NO | 1 |  |  |
| `capture_closed_at` | `datetime` | YES | — |  |  |
| `finalized_at` | `datetime` | YES | — | MUL |  |
| `finalized_by` | `int unsigned` | YES | — | MUL |  |
| `finalized_revision` | `int unsigned` | YES | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (service_id); BTREE
- Non-unique `fk_2` (event_id); BTREE
- Non-unique `fk_3` (created_by); BTREE
- Non-unique `fk_attendance_sessions_finalized_by` (finalized_by); BTREE
- Non-unique `idx_attendance_sessions_finalized_status` (finalized_at, status); BTREE
- Non-unique `idx_qr_session_status_start` (status, starts_at); BTREE
- Unique `unique_qr_event_session_key` (event_id, session_key); BTREE
- Unique `unique_qr_service_session` (service_id); BTREE

Foreign keys
- `fk_1`: (service_id) → (services.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (event_id) → (events.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (created_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_attendance_sessions_finalized_by`: (finalized_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `attendances`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `service_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `check_in_method` | `enum('barcode','manual','pre-reg')` | NO | — |  |  |
| `checked_in_at` | `datetime` | NO | — | MUL |  |
| `recorded_by` | `int unsigned` | YES | — |  |  |
| `entry_source` | `enum('legacy','direct','leader_batch')` | NO | legacy |  |  |
| `source_batch_id` | `int unsigned` | YES | — | MUL |  |
| `confirmed_by` | `int unsigned` | YES | — | MUL |  |
| `confirmed_at` | `datetime` | YES | — |  |  |
| `cell_group_id_at_check_in` | `int unsigned` | YES | — | MUL |  |
| `group_id_at_check_in` | `int unsigned` | YES | — | MUL |  |
| `voided_by` | `int unsigned` | YES | — | MUL |  |
| `voided_at` | `datetime` | YES | — |  |  |
| `void_reason` | `varchar(500)` | YES | — |  |  |
| `qr_revision` | `int unsigned` | NO | 0 |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (service_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (recorded_by); BTREE
- Non-unique `fk_attendance_qr_cell_group_snapshot` (cell_group_id_at_check_in); BTREE
- Non-unique `fk_attendance_qr_confirmed_by` (confirmed_by); BTREE
- Non-unique `fk_attendance_qr_group_snapshot` (group_id_at_check_in); BTREE
- Non-unique `fk_attendance_qr_source_batch` (source_batch_id); BTREE
- Non-unique `fk_attendance_qr_voided_by` (voided_by); BTREE
- Non-unique `idx_attendance_confirmed_service_time` (service_id, voided_at, checked_in_at); BTREE
- Non-unique `idx_attendance_qr_batch` (source_batch_id); BTREE
- Non-unique `idx_attendances_checked_in_at` (checked_in_at); BTREE
- Non-unique `idx_attendances_service_method` (service_id, check_in_method); BTREE
- Unique `unique_service_member_attendance` (service_id, member_id); BTREE

Foreign keys
- `fk_1`: (service_id) → (services.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_3`: (recorded_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_attendance_qr_cell_group_snapshot`: (cell_group_id_at_check_in) → (cell_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_attendance_qr_confirmed_by`: (confirmed_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_attendance_qr_group_snapshot`: (group_id_at_check_in) → (ministry_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_attendance_qr_source_batch`: (source_batch_id) → (attendance_batches.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_attendance_qr_voided_by`: (voided_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `audit_logs`

Engine: InnoDB; exact rows: 16.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `user_id` | `int unsigned` | YES | — | MUL |  |
| `action` | `varchar(100)` | NO | — | MUL |  |
| `target_table` | `varchar(100)` | YES | — | MUL |  |
| `target_id` | `int unsigned` | YES | — |  |  |
| `old_values` | `json` | YES | — |  |  |
| `new_values` | `json` | YES | — |  |  |
| `ip_address` | `varchar(45)` | YES | — |  |  |
| `created_at` | `datetime` | NO | — | MUL |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (user_id); BTREE
- Non-unique `idx_audit_created` (created_at); BTREE
- Non-unique `idx_audit_logs_action` (action); BTREE
- Non-unique `idx_audit_logs_created_at` (created_at); BTREE
- Non-unique `idx_audit_logs_target` (target_table, target_id); BTREE
- Non-unique `idx_audit_logs_user_date` (user_id, created_at); BTREE

Foreign keys
- `fk_1`: (user_id) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `cell_group_history`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `member_id` | `int unsigned` | NO | — |  |  |
| `old_cell_group_id` | `int unsigned` | YES | — |  |  |
| `new_cell_group_id` | `int unsigned` | YES | — |  |  |
| `changed_by` | `int unsigned` | YES | — |  |  |
| `reason` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (member_id); BTREE
- Non-unique `fk_2` (old_cell_group_id); BTREE
- Non-unique `fk_3` (new_cell_group_id); BTREE
- Non-unique `fk_4` (changed_by); BTREE

Foreign keys
- `fk_1`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (old_cell_group_id) → (cell_groups.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_3`: (new_cell_group_id) → (cell_groups.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_4`: (changed_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `cell_groups`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `area` | `varchar(100)` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `emergency_contacts`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `member_id` | `int unsigned` | NO | — |  |  |
| `name` | `varchar(100)` | NO | — |  |  |
| `relationship` | `varchar(50)` | NO | — |  |  |
| `phone` | `varchar(30)` | NO | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (member_id); BTREE

Foreign keys
- `fk_1`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `event_attendances`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `version` | `int unsigned` | NO | 0 |  |  |
| `session_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `check_in_method` | `enum('qr','manual','leader_batch')` | NO | — |  |  |
| `entry_source` | `enum('direct','leader_batch')` | NO | — |  |  |
| `checked_in_at` | `datetime` | NO | — |  |  |
| `recorded_by` | `int unsigned` | YES | — |  |  |
| `confirmed_by` | `int unsigned` | YES | — |  |  |
| `confirmed_at` | `datetime` | NO | — |  |  |
| `source_batch_id` | `int unsigned` | YES | — |  |  |
| `cell_group_id_at_check_in` | `int unsigned` | YES | — |  |  |
| `group_id_at_check_in` | `int unsigned` | YES | — |  |  |
| `voided_by` | `int unsigned` | YES | — |  |  |
| `voided_at` | `datetime` | YES | — |  |  |
| `void_reason` | `varchar(500)` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (session_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (recorded_by); BTREE
- Non-unique `fk_4` (confirmed_by); BTREE
- Non-unique `fk_5` (source_batch_id); BTREE
- Non-unique `fk_6` (cell_group_id_at_check_in); BTREE
- Non-unique `fk_7` (group_id_at_check_in); BTREE
- Non-unique `fk_8` (voided_by); BTREE
- Non-unique `idx_qr_event_attendance_cell` (session_id, cell_group_id_at_check_in); BTREE
- Non-unique `idx_qr_event_attendance_group` (session_id, group_id_at_check_in); BTREE
- Non-unique `idx_qr_event_attendance_time` (session_id, checked_in_at); BTREE
- Unique `unique_qr_event_session_member` (session_id, member_id); BTREE

Foreign keys
- `fk_1`: (session_id) → (attendance_sessions.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (recorded_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_4`: (confirmed_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_5`: (source_batch_id) → (attendance_batches.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_6`: (cell_group_id_at_check_in) → (cell_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_7`: (group_id_at_check_in) → (ministry_groups.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_8`: (voided_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `event_categories`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `description` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `event_registrations`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `event_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `registered_at` | `datetime` | NO | — |  |  |
| `registered_by` | `int unsigned` | YES | — | MUL |  |
| `seat_number` | `int unsigned` | YES | — |  |  |
| `parking_slot` | `int unsigned` | YES | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (event_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_event_registrations_registered_by` (registered_by); BTREE
- Unique `unique_event_member_registration` (event_id, member_id); BTREE
- Unique `unique_event_registration_parking` (event_id, parking_slot); BTREE
- Unique `unique_event_registration_seat` (event_id, seat_number); BTREE

Foreign keys
- `fk_1`: (event_id) → (events.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_event_registrations_registered_by`: (registered_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `events`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `category_id` | `int unsigned` | YES | — |  |  |
| `title` | `varchar(150)` | NO | — |  |  |
| `description` | `text` | YES | — |  |  |
| `start_date` | `date` | NO | — | MUL |  |
| `end_date` | `date` | YES | — |  |  |
| `start_time` | `time` | YES | — |  |  |
| `location` | `varchar(255)` | YES | — |  |  |
| `capacity` | `int unsigned` | YES | — |  |  |
| `registration_deadline` | `datetime` | YES | — |  |  |
| `status` | `enum('Upcoming','Ongoing','Completed','Cancelled')` | NO | Upcoming | MUL |  |
| `is_deleted` | `tinyint` | NO | 0 |  |  |
| `deleted_at` | `datetime` | YES | — |  |  |
| `deleted_by` | `int unsigned` | YES | — |  |  |
| `created_by` | `int unsigned` | NO | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |
| `image_url` | `varchar(1000)` | YES | — |  |  |
| `image_key` | `varchar(255)` | YES | — |  |  |
| `total_parking_slots` | `int unsigned` | NO | 0 |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (category_id); BTREE
- Non-unique `fk_2` (deleted_by); BTREE
- Non-unique `fk_3` (created_by); BTREE
- Non-unique `idx_events_start_date` (start_date); BTREE
- Non-unique `idx_events_status_deleted` (status, is_deleted); BTREE

Foreign keys
- `fk_1`: (category_id) → (event_categories.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_2`: (deleted_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_3`: (created_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `expense_categories`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `account_id` | `int unsigned` | NO | — |  |  |
| `category_name` | `varchar(100)` | NO | — | UNI |  |
| `description` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `category_name` (category_name); BTREE
- Non-unique `fk_1` (account_id); BTREE

Foreign keys
- `fk_1`: (account_id) → (accounts.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `expenses`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `account_id` | `int unsigned` | NO | — |  |  |
| `category_id` | `int unsigned` | NO | — |  |  |
| `date` | `date` | NO | — |  |  |
| `amount` | `decimal(10,2)` | NO | — |  |  |
| `description` | `text` | YES | — |  |  |
| `payment_method_id` | `int unsigned` | NO | — |  |  |
| `created_by` | `int unsigned` | NO | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (account_id); BTREE
- Non-unique `fk_2` (category_id); BTREE
- Non-unique `fk_3` (payment_method_id); BTREE
- Non-unique `fk_4` (created_by); BTREE

Foreign keys
- `fk_1`: (account_id) → (accounts.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (category_id) → (expense_categories.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (payment_method_id) → (payment_methods.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_4`: (created_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `financial_categories`

Engine: InnoDB; exact rows: 8.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `description` | `text` | YES | — |  |  |
| `is_active` | `tinyint` | NO | 1 |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `financial_records`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `member_id` | `int unsigned` | YES | — | MUL |  |
| `category_id` | `int unsigned` | NO | — | MUL |  |
| `receipt_number` | `varchar(100)` | YES | — | UNI |  |
| `amount` | `decimal(10,2)` | NO | — |  |  |
| `payment_method` | `enum('cash','gcash','bank_transfer')` | YES | cash |  |  |
| `transaction_date` | `date` | NO | — | MUL |  |
| `recorded_by` | `int unsigned` | NO | — |  |  |
| `notes` | `text` | YES | — |  |  |
| `is_deleted` | `tinyint` | NO | 0 | MUL |  |
| `deleted_at` | `datetime` | YES | — |  |  |
| `deleted_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |
| `is_anonymous` | `tinyint` | NO | 0 |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (member_id); BTREE
- Non-unique `fk_2` (category_id); BTREE
- Non-unique `fk_3` (recorded_by); BTREE
- Non-unique `fk_4` (deleted_by); BTREE
- Non-unique `idx_finance_date` (is_deleted, transaction_date); BTREE
- Non-unique `idx_financial_records_category_deleted` (category_id, is_deleted); BTREE
- Non-unique `idx_financial_records_date_deleted` (transaction_date, is_deleted); BTREE
- Non-unique `idx_financial_records_member_deleted_date` (member_id, is_deleted, transaction_date); BTREE
- Unique `receipt_number` (receipt_number); BTREE

Foreign keys
- `fk_1`: (member_id) → (members.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (category_id) → (financial_categories.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (recorded_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_4`: (deleted_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `funds`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `description` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `inventory_categories`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `inventory_items`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(150)` | NO | — |  |  |
| `category_id` | `int unsigned` | YES | — | MUL |  |
| `quantity` | `int unsigned` | NO | 0 |  |  |
| `unit` | `varchar(50)` | YES | — |  |  |
| `condition` | `enum('Good','Fair','Poor','For Disposal')` | YES | — |  |  |
| `low_stock_threshold` | `int unsigned` | YES | — |  |  |
| `notes` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |
| `status` | `enum('Available','Low Stock','Out of Stock','Under Repair')` | NO | Available |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (category_id); BTREE
- Non-unique `idx_inventory_items_category` (category_id); BTREE

Foreign keys
- `fk_1`: (category_id) → (inventory_categories.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `inventory_requests`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `item_id` | `int unsigned` | NO | — |  |  |
| `requested_by` | `int unsigned` | NO | — | MUL |  |
| `quantity` | `int unsigned` | NO | — |  |  |
| `purpose` | `varchar(255)` | YES | — |  |  |
| `status` | `enum('pending','approved','rejected')` | NO | pending |  |  |
| `reviewed_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |
| `event_id` | `int unsigned` | YES | — | MUL |  |
| `service_id` | `int unsigned` | YES | — | MUL |  |
| `ministry_role_id` | `int unsigned` | YES | — | MUL |  |
| `review_note` | `text` | YES | — |  |  |
| `request_key` | `varchar(64)` | YES | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (item_id); BTREE
- Non-unique `fk_2` (requested_by); BTREE
- Non-unique `fk_3` (reviewed_by); BTREE
- Non-unique `fk_inventory_requests_event_id` (event_id); BTREE
- Non-unique `fk_inventory_requests_ministry_role_id` (ministry_role_id); BTREE
- Non-unique `fk_inventory_requests_service_id` (service_id); BTREE
- Non-unique `idx_inventory_request_event_id` (event_id); BTREE
- Non-unique `idx_inventory_request_ministry_role_id` (ministry_role_id); BTREE
- Non-unique `idx_inventory_request_service_id` (service_id); BTREE
- Unique `uq_inventory_requests_requester_key` (requested_by, request_key); BTREE

Foreign keys
- `fk_1`: (item_id) → (inventory_items.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (requested_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (reviewed_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_inventory_requests_event_id`: (event_id) → (events.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_inventory_requests_ministry_role_id`: (ministry_role_id) → (ministry_roles.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_inventory_requests_service_id`: (service_id) → (services.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `inventory_transactions`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `item_id` | `int unsigned` | NO | — | MUL |  |
| `transaction_type` | `enum('initial','adjustment','usage','request_fulfillment','return')` | NO | — |  |  |
| `quantity_delta` | `int` | NO | — |  |  |
| `source_type` | `varchar(80)` | YES | — | MUL |  |
| `source_id` | `int unsigned` | YES | — |  |  |
| `notes` | `text` | YES | — |  |  |
| `recorded_by` | `int unsigned` | YES | — |  |  |
| `occurred_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |
| `created_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |
| `updated_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (item_id); BTREE
- Non-unique `fk_2` (recorded_by); BTREE
- Non-unique `idx_inventory_transactions_item_date` (item_id, occurred_at); BTREE
- Non-unique `idx_inventory_transactions_source` (source_type, source_id); BTREE

Foreign keys
- `fk_1`: (item_id) → (inventory_items.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (recorded_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `inventory_usage`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `item_id` | `int unsigned` | NO | — |  |  |
| `quantity_used` | `int unsigned` | NO | — |  |  |
| `used_by` | `int unsigned` | NO | — |  |  |
| `used_for` | `varchar(255)` | YES | — |  |  |
| `used_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (item_id); BTREE
- Non-unique `fk_2` (used_by); BTREE

Foreign keys
- `fk_1`: (item_id) → (inventory_items.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (used_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `invited_members`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `email` | `varchar(150)` | NO | — | UNI |  |
| `first_name` | `varchar(100)` | NO | — |  |  |
| `last_name` | `varchar(100)` | NO | — |  |  |
| `invite_token` | `varchar(255)` | NO | — | UNI |  |
| `invited_by` | `int unsigned` | YES | — | MUL |  |
| `expires_at` | `datetime` | NO | — |  |  |
| `accepted_at` | `datetime` | YES | — |  |  |
| `status` | `enum('pending','accepted','expired')` | NO | pending |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `email` (email); BTREE
- Non-unique `fk_im_invited_by` (invited_by); BTREE
- Unique `invite_token` (invite_token); BTREE

Foreign keys
- `fk_im_invited_by`: (invited_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `member_notes`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `member_id` | `int unsigned` | NO | — |  |  |
| `note` | `text` | NO | — |  |  |
| `is_confidential` | `tinyint` | NO | 1 |  |  |
| `created_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (member_id); BTREE
- Non-unique `fk_2` (created_by); BTREE

Foreign keys
- `fk_1`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (created_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `member_qr_credentials`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `member_id` | `int unsigned` | NO | — | MUL |  |
| `public_id` | `char(36)` | NO | — | UNI |  |
| `version` | `int unsigned` | NO | — |  |  |
| `status` | `enum('active','revoked')` | NO | active |  |  |
| `issued_by` | `int unsigned` | YES | — |  |  |
| `issued_at` | `datetime` | NO | — |  |  |
| `revoked_by` | `int unsigned` | YES | — |  |  |
| `revoked_at` | `datetime` | YES | — |  |  |
| `revoke_reason` | `varchar(500)` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (member_id); BTREE
- Non-unique `fk_2` (issued_by); BTREE
- Non-unique `fk_3` (revoked_by); BTREE
- Non-unique `idx_member_qr_status` (member_id, status); BTREE
- Unique `public_id` (public_id); BTREE
- Unique `unique_member_qr_version` (member_id, version); BTREE

Foreign keys
- `fk_1`: (member_id) → (members.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (issued_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_3`: (revoked_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `member_status_history`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `member_id` | `int unsigned` | NO | — |  |  |
| `old_status` | `enum('New','Active','Semi-Active','Inactive','Visitor')` | NO | — |  |  |
| `new_status` | `enum('New','Active','Semi-Active','Inactive','Visitor')` | NO | — |  |  |
| `changed_by` | `int unsigned` | YES | — |  |  |
| `reason` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (member_id); BTREE
- Non-unique `fk_2` (changed_by); BTREE

Foreign keys
- `fk_1`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (changed_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `members`

Engine: InnoDB; exact rows: 4.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `first_name` | `varchar(100)` | NO | — |  |  |
| `last_name` | `varchar(100)` | NO | — |  |  |
| `email` | `varchar(150)` | YES | — | UNI |  |
| `phone` | `varchar(30)` | YES | — |  |  |
| `birthdate` | `date` | YES | — | MUL |  |
| `spiritual_birthday` | `date` | YES | — |  |  |
| `address` | `text` | YES | — |  |  |
| `gender` | `enum('Male','Female')` | YES | — | MUL |  |
| `status` | `enum('Active','Inactive')` | NO | Active | MUL |  |
| `is_deleted` | `tinyint` | NO | 0 | MUL |  |
| `deleted_at` | `datetime` | YES | — |  |  |
| `deleted_by` | `int unsigned` | YES | — | MUL |  |
| `cell_group_id` | `int unsigned` | YES | — | MUL |  |
| `group_id` | `int unsigned` | YES | — | MUL |  |
| `referred_by` | `int unsigned` | YES | — |  |  |
| `profile_photo_url` | `varchar(255)` | YES | — |  |  |
| `barcode` | `varchar(100)` | YES | — | UNI |  |
| `created_at` | `datetime` | NO | — | MUL |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `barcode` (barcode); BTREE
- Unique `email` (email); BTREE
- Non-unique `fk_1` (cell_group_id); BTREE
- Non-unique `fk_2` (group_id); BTREE
- Non-unique `fk_3` (referred_by); BTREE
- Non-unique `fk_members_deleted_by` (deleted_by); BTREE
- Non-unique `idx_member_birthdate` (birthdate); BTREE
- Non-unique `idx_member_created_at` (created_at); BTREE
- Non-unique `idx_member_gender` (gender); BTREE
- Non-unique `idx_member_group` (group_id); BTREE
- Non-unique `idx_members_cell_group_deleted` (cell_group_id, is_deleted); BTREE
- Non-unique `idx_members_group_deleted` (group_id, is_deleted); BTREE
- Non-unique `idx_members_search` (is_deleted, last_name, first_name); BTREE
- Non-unique `idx_members_status_deleted` (status, is_deleted); BTREE

Foreign keys
- `fk_1`: (cell_group_id) → (cell_groups.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_2`: (group_id) → (ministry_groups.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_3`: (referred_by) → (members.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_members_deleted_by`: (deleted_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `ministries`

Engine: InnoDB; exact rows: 13.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `legacy_ministry_role_id` | `int unsigned` | YES | — | UNI |  |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `description` | `text` | YES | — |  |  |
| `is_active` | `tinyint` | NO | 1 |  |  |
| `created_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |
| `updated_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (legacy_ministry_role_id); BTREE
- Unique `uq_ministries_legacy_ministry_role` (legacy_ministry_role_id); BTREE
- Unique `uq_ministries_name` (name); BTREE

Foreign keys
- `fk_1`: (legacy_ministry_role_id) → (ministry_roles.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `ministry_applications`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `application_key` | `varchar(100)` | YES | — | UNI |  |
| `member_id` | `int unsigned` | NO | — | MUL |  |
| `ministry_role_id` | `int unsigned` | NO | — | MUL |  |
| `status` | `enum('pending','approved','rejected','withdrawn')` | NO | pending |  |  |
| `message` | `text` | YES | — |  |  |
| `review_note` | `text` | YES | — |  |  |
| `reviewed_by` | `int unsigned` | YES | — |  |  |
| `reviewed_at` | `datetime` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `application_key` (application_key); BTREE
- Non-unique `fk_1` (member_id); BTREE
- Non-unique `fk_2` (ministry_role_id); BTREE
- Non-unique `fk_3` (reviewed_by); BTREE
- Non-unique `idx_ministry_app_member_status` (member_id, status); BTREE
- Non-unique `idx_ministry_app_role_status` (ministry_role_id, status); BTREE

Foreign keys
- `fk_1`: (member_id) → (members.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (ministry_role_id) → (ministry_roles.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (reviewed_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `ministry_assignments`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `service_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `ministry_role_id` | `int unsigned` | NO | — |  |  |
| `confirmed` | `tinyint` | NO | 0 |  |  |
| `substitute_requested` | `tinyint` | NO | 0 |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (service_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (ministry_role_id); BTREE
- Unique `unique_service_member_assignment` (service_id, member_id); BTREE

Foreign keys
- `fk_1`: (service_id) → (services.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_3`: (ministry_role_id) → (ministry_roles.id); ON DELETE RESTRICT, ON UPDATE CASCADE

### `ministry_event_invites`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `event_id` | `int unsigned` | NO | — | MUL |  |
| `ministry_role_id` | `int unsigned` | NO | — |  |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `invited_by` | `int unsigned` | YES | — |  |  |
| `response_status` | `enum('pending','attending','not_attending')` | NO | pending |  |  |
| `response_deadline` | `datetime` | YES | — |  |  |
| `responded_at` | `datetime` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (event_id); BTREE
- Non-unique `fk_2` (ministry_role_id); BTREE
- Non-unique `fk_3` (member_id); BTREE
- Non-unique `fk_4` (invited_by); BTREE
- Unique `uq_mei_event_role_member` (event_id, ministry_role_id, member_id); BTREE

Foreign keys
- `fk_1`: (event_id) → (events.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (ministry_role_id) → (ministry_roles.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_4`: (invited_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `ministry_groups`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `ministry_memberships`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `ministry_role_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `added_by` | `int unsigned` | NO | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (ministry_role_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (added_by); BTREE
- Unique `uq_mm_role_member` (ministry_role_id, member_id); BTREE

Foreign keys
- `fk_1`: (ministry_role_id) → (ministry_roles.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_3`: (added_by) → (users.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `ministry_positions`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `ministry_id` | `int unsigned` | YES | — | MUL |  |
| `name` | `varchar(100)` | NO | — |  |  |
| `description` | `text` | YES | — |  |  |
| `is_active` | `tinyint` | NO | 1 |  |  |
| `created_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |
| `updated_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (ministry_id); BTREE
- Unique `uq_ministry_positions_ministry_name` (ministry_id, name); BTREE

Foreign keys
- `fk_1`: (ministry_id) → (ministries.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `ministry_roles`

Engine: InnoDB; exact rows: 13.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `name` | `varchar(100)` | NO | — | UNI |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `name` (name); BTREE

Foreign keys
- None

### `notifications`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `user_id` | `int unsigned` | NO | — | MUL |  |
| `type` | `varchar(100)` | NO | — |  |  |
| `message` | `text` | NO | — |  |  |
| `reference_id` | `int unsigned` | YES | — |  |  |
| `reference_type` | `varchar(50)` | YES | — |  |  |
| `is_read` | `tinyint` | NO | 0 |  |  |
| `read_at` | `datetime` | YES | — |  |  |
| `created_at` | `datetime` | NO | — | MUL |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (user_id); BTREE
- Non-unique `idx_notif_user_read` (user_id, is_read); BTREE
- Non-unique `idx_notifications_created_at` (created_at); BTREE
- Non-unique `idx_notifications_user_created` (user_id, created_at); BTREE
- Non-unique `idx_notifications_user_read` (user_id, is_read); BTREE

Foreign keys
- `fk_1`: (user_id) → (users.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `password_reset_tokens`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `user_id` | `int unsigned` | NO | — |  |  |
| `token` | `varchar(255)` | NO | — | UNI |  |
| `expires_at` | `datetime` | NO | — |  |  |
| `used` | `tinyint` | NO | 0 |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (user_id); BTREE
- Unique `token` (token); BTREE

Foreign keys
- `fk_1`: (user_id) → (users.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `payment_methods`

Engine: InnoDB; exact rows: 3.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `method_name` | `varchar(100)` | NO | — | UNI |  |
| `description` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `method_name` (method_name); BTREE

Foreign keys
- None

### `permissions`

Engine: InnoDB; exact rows: 72.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `module` | `varchar(100)` | NO | — | MUL |  |
| `action` | `varchar(100)` | NO | — |  |  |
| `description` | `varchar(255)` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `unique_module_action` (module, action); BTREE

Foreign keys
- None

### `refresh_tokens`

Engine: InnoDB; exact rows: 15.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `user_id` | `int unsigned` | NO | — |  |  |
| `token` | `text` | NO | — | MUL |  |
| `expires_at` | `datetime` | NO | — |  |  |
| `revoked` | `tinyint` | NO | 0 |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `revoked_at` | `datetime` | YES | — |  |  |
| `user_session_id` | `int unsigned` | YES | — | MUL |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (user_id); BTREE
- Non-unique `idx_refresh_tokens_token_hash` (token(64)); BTREE
- Non-unique `idx_refresh_tokens_user_session_id` (user_session_id); BTREE

Foreign keys
- `fk_1`: (user_id) → (users.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_refresh_tokens_user_session`: (user_session_id) → (user_sessions.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `role_permissions`

Engine: InnoDB; exact rows: 78.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `role_id` | `int unsigned` | NO | — | MUL |  |
| `permission_id` | `int unsigned` | NO | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (role_id); BTREE
- Non-unique `fk_2` (permission_id); BTREE
- Unique `unique_role_permission` (role_id, permission_id); BTREE

Foreign keys
- `fk_1`: (role_id) → (roles.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (permission_id) → (permissions.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `roles`

Engine: InnoDB; exact rows: 8.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `role_name` | `varchar(50)` | NO | — | UNI |  |
| `description` | `varchar(255)` | YES | — |  |  |
| `is_system` | `tinyint` | NO | 0 |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `role_name` (role_name); BTREE

Foreign keys
- None

### `service_attendance_summary`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `service_id` | `int unsigned` | NO | — | UNI |  |
| `total_expected` | `int unsigned` | NO | 0 |  |  |
| `total_attended` | `int unsigned` | NO | 0 |  |  |
| `total_absent` | `int unsigned` | NO | 0 |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `service_id` (service_id); BTREE

Foreign keys
- `fk_1`: (service_id) → (services.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `service_responses`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `service_id` | `int unsigned` | NO | — | MUL |  |
| `member_id` | `int unsigned` | NO | — |  |  |
| `attendance_status` | `enum('ATTENDING','NOT_ATTENDING','UNDECIDED')` | NO | — |  |  |
| `seat_number` | `varchar(10)` | YES | — |  |  |
| `parking_slot` | `varchar(10)` | YES | — |  |  |
| `override_by` | `int unsigned` | YES | — |  |  |
| `override_reason` | `text` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (service_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (override_by); BTREE
- Unique `unique_service_member_response` (service_id, member_id); BTREE
- Unique `unique_service_seat` (service_id, seat_number); BTREE

Foreign keys
- `fk_1`: (service_id) → (services.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_3`: (override_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `services`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `title` | `varchar(150)` | NO | — |  |  |
| `service_date` | `date` | NO | — | MUL |  |
| `service_time` | `time` | NO | — |  |  |
| `capacity` | `int unsigned` | NO | — |  |  |
| `total_parking_slots` | `int unsigned` | NO | — |  |  |
| `response_deadline` | `datetime` | YES | — |  |  |
| `status` | `enum('draft','published','cancelled','completed')` | NO | draft | MUL |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `idx_services_date` (service_date); BTREE
- Non-unique `idx_services_status` (status); BTREE

Foreign keys
- None

### `substitute_requests`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `assignment_id` | `int unsigned` | NO | — |  |  |
| `requested_by` | `int unsigned` | NO | — |  |  |
| `proposed_substitute` | `int unsigned` | YES | — |  |  |
| `reason` | `text` | YES | — |  |  |
| `status` | `enum('pending','approved','rejected')` | NO | pending |  |  |
| `resolved_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (assignment_id); BTREE
- Non-unique `fk_2` (requested_by); BTREE
- Non-unique `fk_3` (proposed_substitute); BTREE
- Non-unique `fk_4` (resolved_by); BTREE

Foreign keys
- `fk_1`: (assignment_id) → (ministry_assignments.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (requested_by) → (users.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_3`: (proposed_substitute) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_4`: (resolved_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `system_settings`

Engine: InnoDB; exact rows: 20.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `key` | `varchar(100)` | NO | — | UNI |  |
| `value` | `text` | YES | — |  |  |
| `updated_by` | `int unsigned` | YES | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (updated_by); BTREE
- Unique `key` (key); BTREE

Foreign keys
- `fk_1`: (updated_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `user_leader_assignments`

Engine: InnoDB; exact rows: 0.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `user_id` | `int unsigned` | NO | — | MUL |  |
| `scope_type` | `enum('ministry','cell_group','member_group')` | NO | — | MUL |  |
| `scope_id` | `int unsigned` | NO | — |  |  |
| `legacy_column` | `varchar(64)` | YES | — |  |  |
| `assigned_by` | `int unsigned` | YES | — |  |  |
| `created_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |
| `updated_at` | `datetime` | NO | CURRENT_TIMESTAMP |  |  |
| `is_active` | `tinyint(1)` | NO | 1 |  |  |
| `version` | `int unsigned` | NO | 1 |  |  |
| `revoked_by` | `int unsigned` | YES | — |  |  |
| `revoked_at` | `datetime` | YES | — |  |  |
| `revocation_reason` | `varchar(500)` | YES | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (user_id); BTREE
- Non-unique `fk_2` (assigned_by); BTREE
- Non-unique `idx_user_leader_assignments_scope` (scope_type, scope_id); BTREE
- Unique `uq_user_leader_assignments_user_scope` (user_id, scope_type, scope_id); BTREE

Foreign keys
- `fk_1`: (user_id) → (users.id); ON DELETE CASCADE, ON UPDATE CASCADE
- `fk_2`: (assigned_by) → (users.id); ON DELETE SET NULL, ON UPDATE CASCADE

### `user_sessions`

Engine: InnoDB; exact rows: 15.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `user_id` | `int unsigned` | NO | — |  |  |
| `ip_address` | `varchar(45)` | YES | — |  |  |
| `device` | `varchar(255)` | YES | — |  |  |
| `login_at` | `datetime` | NO | — |  |  |
| `logout_at` | `datetime` | YES | — |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Non-unique `fk_1` (user_id); BTREE

Foreign keys
- `fk_1`: (user_id) → (users.id); ON DELETE CASCADE, ON UPDATE CASCADE

### `users`

Engine: InnoDB; exact rows: 1.

| Column | Live SQL type | Nullable | Default | Key | Extra |
| --- | --- | --- | --- | --- | --- |
| `id` | `int unsigned` | NO | — | PRI | auto_increment |
| `role_id` | `int unsigned` | NO | — |  |  |
| `member_id` | `int unsigned` | YES | — |  |  |
| `leads_cell_group_id` | `int unsigned` | YES | — |  |  |
| `leads_group_id` | `int unsigned` | YES | — |  |  |
| `leads_ministry_id` | `int unsigned` | YES | — |  |  |
| `invited_member_id` | `int unsigned` | YES | — |  |  |
| `email` | `varchar(150)` | NO | — | UNI |  |
| `password_hash` | `varchar(255)` | NO | — |  |  |
| `is_active` | `tinyint` | NO | 1 | MUL |  |
| `force_password_change` | `tinyint` | NO | 1 |  |  |
| `last_login_at` | `datetime` | YES | — |  |  |
| `created_at` | `datetime` | NO | — |  |  |
| `updated_at` | `datetime` | NO | — |  |  |
| `failed_login_attempts` | `int` | NO | 0 |  |  |
| `locked_until` | `datetime` | YES | — |  |  |
| `is_deleted` | `tinyint` | NO | 0 | MUL |  |
| `deleted_at` | `datetime` | YES | — |  |  |
| `leadership_revision` | `int unsigned` | NO | 0 |  |  |

Indexes
- Unique `PRIMARY` (id); BTREE
- Unique `email` (email); BTREE
- Non-unique `fk_1` (role_id); BTREE
- Non-unique `fk_2` (member_id); BTREE
- Non-unique `fk_3` (invited_member_id); BTREE
- Non-unique `idx_users_is_active` (is_active); BTREE
- Non-unique `idx_users_is_deleted` (is_deleted); BTREE

Foreign keys
- `fk_1`: (role_id) → (roles.id); ON DELETE RESTRICT, ON UPDATE CASCADE
- `fk_2`: (member_id) → (members.id); ON DELETE SET NULL, ON UPDATE CASCADE
- `fk_3`: (invited_member_id) → (invited_members.id); ON DELETE SET NULL, ON UPDATE CASCADE
