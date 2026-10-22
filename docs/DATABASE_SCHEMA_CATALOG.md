# Application Schema Catalog

> Generated from the runtime Sequelize models, including the separate QR attendance model module. This describes the application contract, not verified live TiDB DDL. Migrations define the database schema; compare this catalog with the isolated live schema before relying on constraints, indexes, or columns.

Models: 58

## `accounts`

Model: `Account`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `fund_id` | INTEGER UNSIGNED | No | No | — |
| `description` | TEXT | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `fund` → `funds` via `fund_id`
- HasMany `ExpenseCategories` → `expense_categories` via `account_id`
- HasMany `Expenses` → `expenses` via `account_id`
## `archive_access_logs`

Model: `ArchiveAccessLog`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `record_id` | INTEGER UNSIGNED | No | No | — |
| `accessed_by` | INTEGER UNSIGNED | No | No | — |
| `action` | ENUM("view", "download") | No | No | — |
| `accessed_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `ArchiveRecord` → `archive_records` via `record_id`
- BelongsTo `accessedByUser` → `users` via `accessed_by`
## `archive_categories`

Model: `ArchiveCategory`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `ArchiveRecords` → `archive_records` via `category_id`
## `archive_records`

Model: `ArchiveRecord`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `category_id` | INTEGER UNSIGNED | No | No | — |
| `title` | STRING(255) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `file_url` | STRING(500) | No | No | — |
| `current_version_id` | INTEGER UNSIGNED | Yes | No | — |
| `file_type` | ENUM("pdf", "docx", "xlsx", "jpg", "png", "mp4", "mp3") | No | No | — |
| `file_size` | INTEGER UNSIGNED | Yes | No | — |
| `document_date` | DATEONLY | Yes | No | — |
| `visibility` | ENUM("public", "restricted", "confidential") | No | No | "public" |
| `status` | ENUM("pending", "approved", "deleted") | No | No | "pending" |
| `uploaded_by` | INTEGER UNSIGNED | No | No | — |
| `approved_by` | INTEGER UNSIGNED | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- Index `idx_archive_status`: status

Associations
- BelongsTo `approvedByUser` → `users` via `approved_by`
- BelongsTo `category` → `archive_categories` via `category_id`
- BelongsTo `currentVersion` → `archive_versions` via `current_version_id`
- BelongsTo `deletedByUser` → `users` via `deleted_by`
- BelongsTo `uploadedByUser` → `users` via `uploaded_by`
- HasMany `ArchiveAccessLogs` → `archive_access_logs` via `record_id`
- HasMany `ArchiveVersions` → `archive_versions` via `record_id`
## `archive_versions`

Model: `ArchiveVersion`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `record_id` | INTEGER UNSIGNED | No | No | — |
| `file_url` | STRING(500) | No | No | — |
| `file_type` | STRING(50) | No | No | — |
| `file_size` | INTEGER UNSIGNED | Yes | No | — |
| `version_number` | INTEGER UNSIGNED | No | No | — |
| `uploaded_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `ArchiveRecord` → `archive_records` via `record_id`
- BelongsTo `uploadedByUser` → `users` via `uploaded_by`
## `attachments`

Model: `Attachment`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `income_id` | INTEGER UNSIGNED | Yes | No | — |
| `expense_id` | INTEGER UNSIGNED | Yes | No | — |
| `file_name` | STRING(255) | No | No | — |
| `file_path` | STRING(500) | No | No | — |
| `uploaded_by` | INTEGER UNSIGNED | No | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `uploaded_at` | DATE | No | No | NOW |

Indexes
- None declared in the model

Associations
- BelongsTo `expenseRecord` → `expenses` via `expense_id`
- BelongsTo `incomeRecord` → `financial_records` via `income_id`
- BelongsTo `uploader` → `users` via `uploaded_by`
## `attendance_batch_items`

Model: `AttendanceBatchItem`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `batch_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `captured_by` | INTEGER UNSIGNED | No | No | — |
| `capture_method` | ENUM("qr", "manual") | No | No | — |
| `captured_at` | DATE | No | No | — |
| `cell_group_id_at_capture` | INTEGER UNSIGNED | Yes | No | — |
| `group_id_at_capture` | INTEGER UNSIGNED | Yes | No | — |
| `outcome` | ENUM("pending", "confirmed", "already_confirmed") | No | No | "pending" |
| `service_attendance_id` | INTEGER UNSIGNED | Yes | No | — |
| `event_attendance_id` | INTEGER UNSIGNED | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `batch` → `attendance_batches` via `batch_id`
- BelongsTo `capturedBy` → `users` via `captured_by`
- BelongsTo `cellGroupAtCapture` → `cell_groups` via `cell_group_id_at_capture`
- BelongsTo `eventAttendance` → `event_attendances` via `event_attendance_id`
- BelongsTo `groupAtCapture` → `ministry_groups` via `group_id_at_capture`
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `serviceAttendance` → `attendances` via `service_attendance_id`
## `attendance_batches`

Model: `AttendanceBatch`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `session_id` | INTEGER UNSIGNED | No | No | — |
| `public_id` | UUID | No | No | — |
| `submitted_by` | INTEGER UNSIGNED | No | No | — |
| `cell_group_id` | INTEGER UNSIGNED | Yes | No | — |
| `group_id` | INTEGER UNSIGNED | Yes | No | — |
| `state` | ENUM("draft", "submitted", "approved", "rejected", "withdrawn") | No | No | "draft" |
| `revision` | INTEGER UNSIGNED | No | No | 1 |
| `content_digest` | STRING(64) | Yes | No | — |
| `idempotency_key` | UUID | No | No | — |
| `supersedes_batch_id` | INTEGER UNSIGNED | Yes | No | — |
| `submitted_at` | DATE | Yes | No | — |
| `approval_deadline` | DATE | No | No | — |
| `reviewed_by` | INTEGER UNSIGNED | Yes | No | — |
| `reviewed_at` | DATE | Yes | No | — |
| `decision_reason` | STRING(500) | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `cellGroup` → `cell_groups` via `cell_group_id`
- BelongsTo `group` → `ministry_groups` via `group_id`
- BelongsTo `reviewer` → `users` via `reviewed_by`
- BelongsTo `session` → `attendance_sessions` via `session_id`
- BelongsTo `submitter` → `users` via `submitted_by`
- BelongsTo `supersedesBatch` → `attendance_batches` via `supersedes_batch_id`
- HasMany `items` → `attendance_batch_items` via `batch_id`
## `attendance_expected_members`

Model: `AttendanceExpectedMember`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `session_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `source` | ENUM("event_registration", "service_rsvp", "staff_added") | No | No | — |
| `cell_group_id_at_freeze` | INTEGER UNSIGNED | Yes | No | — |
| `group_id_at_freeze` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `cellGroupAtFreeze` → `cell_groups` via `cell_group_id_at_freeze`
- BelongsTo `groupAtFreeze` → `ministry_groups` via `group_id_at_freeze`
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `session` → `attendance_sessions` via `session_id`
## `attendance_sessions`

Model: `QrAttendanceSession`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `service_id` | INTEGER UNSIGNED | Yes | No | — |
| `event_id` | INTEGER UNSIGNED | Yes | No | — |
| `session_key` | STRING(80) | No | No | "primary" |
| `title` | STRING(150) | No | No | — |
| `starts_at` | DATE | No | No | — |
| `ends_at` | DATE | No | No | — |
| `check_in_opens_at` | DATE | No | No | — |
| `check_in_closes_at` | DATE | No | No | — |
| `approval_deadline` | DATE | No | No | — |
| `time_zone` | STRING(64) | No | No | "Asia/Manila" |
| `status` | ENUM("draft", "open", "closed", "cancelled") | No | No | "draft" |
| `expected_basis` | ENUM("none", "registrations", "explicit_roster") | No | No | "none" |
| `registration_required` | BOOLEAN | No | No | false |
| `leader_confirmation_mode` | ENUM("direct", "batch_review") | No | No | "batch_review" |
| `expected_roster_frozen_at` | DATE | Yes | No | — |
| `config_revision` | INTEGER UNSIGNED | No | No | 1 |
| `activity_revision` | INTEGER UNSIGNED | No | No | 1 |
| `capture_closed_at` | DATE | Yes | No | — |
| `finalized_at` | DATE | Yes | No | — |
| `finalized_by` | INTEGER UNSIGNED | Yes | No | — |
| `finalized_revision` | INTEGER UNSIGNED | Yes | No | — |
| `created_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `creator` → `users` via `created_by`
- BelongsTo `event` → `events` via `event_id`
- BelongsTo `service` → `services` via `service_id`
- HasMany `batches` → `attendance_batches` via `session_id`
- HasMany `eventAttendances` → `event_attendances` via `session_id`
## `attendances`

Model: `QrServiceAttendance`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `service_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `check_in_method` | ENUM("barcode", "manual", "pre-reg") | No | No | — |
| `checked_in_at` | DATE | No | No | — |
| `recorded_by` | INTEGER UNSIGNED | Yes | No | — |
| `entry_source` | ENUM("legacy", "direct", "leader_batch") | No | No | "legacy" |
| `source_batch_id` | INTEGER UNSIGNED | Yes | No | — |
| `cell_group_id_at_check_in` | INTEGER UNSIGNED | Yes | No | — |
| `group_id_at_check_in` | INTEGER UNSIGNED | Yes | No | — |
| `confirmed_by` | INTEGER UNSIGNED | Yes | No | — |
| `confirmed_at` | DATE | Yes | No | — |
| `qr_revision` | INTEGER UNSIGNED | No | No | 0 |
| `voided_by` | INTEGER UNSIGNED | Yes | No | — |
| `voided_at` | DATE | Yes | No | — |
| `void_reason` | STRING(500) | Yes | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Member` → `members` via `member_id`
- BelongsTo `Service` → `services` via `service_id`
- BelongsTo `cellGroupAtCheckIn` → `cell_groups` via `cell_group_id_at_check_in`
- BelongsTo `confirmer` → `users` via `confirmed_by`
- BelongsTo `groupAtCheckIn` → `ministry_groups` via `group_id_at_check_in`
- BelongsTo `recorder` → `users` via `recorded_by`
- BelongsTo `sourceBatch` → `attendance_batches` via `source_batch_id`
- BelongsTo `voidedBy` → `users` via `voided_by`
- HasMany `qrBatchItems` → `attendance_batch_items` via `service_attendance_id`
## `audit_logs`

Model: `AuditLog`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `user_id` | INTEGER UNSIGNED | Yes | No | — |
| `action` | STRING(100) | No | No | — |
| `target_table` | STRING(100) | Yes | No | — |
| `target_id` | INTEGER UNSIGNED | Yes | No | — |
| `old_values` | JSON | Yes | No | — |
| `new_values` | JSON | Yes | No | — |
| `ip_address` | STRING(45) | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- Index `idx_audit_user_id`: user_id
- Index `idx_audit_created_at`: created_at
- Index `idx_audit_target`: target_table, target_id

Associations
- BelongsTo `User` → `users` via `user_id`
## `cell_group_history`

Model: `CellGroupHistory`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `old_cell_group_id` | INTEGER UNSIGNED | Yes | No | — |
| `new_cell_group_id` | INTEGER UNSIGNED | Yes | No | — |
| `changed_by` | INTEGER UNSIGNED | Yes | No | — |
| `reason` | TEXT | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Member` → `members` via `member_id`
- BelongsTo `changedByUser` → `users` via `changed_by`
- BelongsTo `newCellGroup` → `cell_groups` via `new_cell_group_id`
- BelongsTo `oldCellGroup` → `cell_groups` via `old_cell_group_id`
## `cell_groups`

Model: `CellGroup`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `area` | STRING(100) | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `Members` → `members` via `cell_group_id`
## `emergency_contacts`

Model: `EmergencyContact`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `name` | STRING(100) | No | No | — |
| `relationship` | STRING(50) | No | No | — |
| `phone` | STRING(30) | No | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `member` → `members` via `member_id`
## `event_attendances`

Model: `EventAttendance`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `version` | INTEGER UNSIGNED | No | No | 0 |
| `session_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `check_in_method` | ENUM("qr", "manual", "leader_batch") | No | No | — |
| `entry_source` | ENUM("direct", "leader_batch") | No | No | — |
| `checked_in_at` | DATE | No | No | — |
| `recorded_by` | INTEGER UNSIGNED | Yes | No | — |
| `confirmed_by` | INTEGER UNSIGNED | Yes | No | — |
| `confirmed_at` | DATE | No | No | — |
| `source_batch_id` | INTEGER UNSIGNED | Yes | No | — |
| `cell_group_id_at_check_in` | INTEGER UNSIGNED | Yes | No | — |
| `group_id_at_check_in` | INTEGER UNSIGNED | Yes | No | — |
| `voided_by` | INTEGER UNSIGNED | Yes | No | — |
| `voided_at` | DATE | Yes | No | — |
| `void_reason` | STRING(500) | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `cellGroupAtCheckIn` → `cell_groups` via `cell_group_id_at_check_in`
- BelongsTo `confirmer` → `users` via `confirmed_by`
- BelongsTo `groupAtCheckIn` → `ministry_groups` via `group_id_at_check_in`
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `recorder` → `users` via `recorded_by`
- BelongsTo `session` → `attendance_sessions` via `session_id`
- BelongsTo `sourceBatch` → `attendance_batches` via `source_batch_id`
- BelongsTo `voidedBy` → `users` via `voided_by`
- HasMany `qrBatchItems` → `attendance_batch_items` via `event_attendance_id`
## `event_categories`

Model: `EventCategory`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `Events` → `events` via `category_id`
## `event_image_archives`

Model: `EventImageArchive`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `event_id` | INTEGER UNSIGNED | No | No | — |
| `image_key` | STRING(500) | Yes | No | — |
| `image_url` | STRING(1000) | No | No | — |
| `created_by` | INTEGER UNSIGNED | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 1 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `event` → `events` via `event_id`
## `event_registrations`

Model: `EventRegistration`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `event_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `registered_at` | DATE | No | No | — |
| `registered_by` | INTEGER UNSIGNED | Yes | No | — |
| `seat_number` | INTEGER UNSIGNED | Yes | No | — |
| `parking_slot` | INTEGER UNSIGNED | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |

Indexes
- Unique `unique_event_member_registration`: event_id, member_id
- Unique `unique_event_registration_seat`: event_id, seat_number
- Unique `unique_event_registration_parking`: event_id, parking_slot

Associations
- BelongsTo `Event` → `events` via `event_id`
- BelongsTo `member` → `members` via `member_id`
## `events`

Model: `Event`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `category_id` | INTEGER UNSIGNED | Yes | No | — |
| `title` | STRING(150) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `image_url` | STRING(1000) | Yes | No | — |
| `image_key` | STRING(255) | Yes | No | — |
| `start_date` | DATEONLY | No | No | — |
| `end_date` | DATEONLY | Yes | No | — |
| `start_time` | TIME | Yes | No | — |
| `location` | STRING(255) | Yes | No | — |
| `capacity` | INTEGER UNSIGNED | Yes | No | — |
| `total_parking_slots` | INTEGER UNSIGNED | Yes | No | null |
| `registration_deadline` | DATE | Yes | No | — |
| `status` | ENUM("Upcoming", "Ongoing", "Completed", "Cancelled") | No | No | "Upcoming" |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_by` | INTEGER UNSIGNED | No | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- Index `idx_event_date_status`: start_date, status
- Index `idx_event_status`: status

Associations
- BelongsTo `category` → `event_categories` via `category_id`
- BelongsTo `creator` → `users` via `created_by`
- BelongsTo `deletedByUser` → `users` via `deleted_by`
- HasMany `EventRegistrations` → `event_registrations` via `event_id`
- HasMany `MinistryEventInvites` → `ministry_event_invites` via `event_id`
- HasMany `archivedImages` → `event_image_archives` via `event_id`
- HasOne `attendanceService` → `services` via `event_id`
## `expense_categories`

Model: `ExpenseCategory`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `account_id` | INTEGER UNSIGNED | Yes | No | — |
| `category_name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `account` → `accounts` via `account_id`
- HasMany `Expenses` → `expenses` via `category_id`
## `expenses`

Model: `Expense`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `account_id` | INTEGER UNSIGNED | Yes | No | — |
| `category_id` | INTEGER UNSIGNED | No | No | — |
| `date` | DATEONLY | No | No | — |
| `amount` | DECIMAL(10, 2) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `payment_method_id` | INTEGER UNSIGNED | No | No | — |
| `created_by` | INTEGER UNSIGNED | No | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `account` → `accounts` via `account_id`
- BelongsTo `category` → `expense_categories` via `category_id`
- BelongsTo `creator` → `users` via `created_by`
- BelongsTo `paymentMethod` → `payment_methods` via `payment_method_id`
- HasMany `attachments` → `attachments` via `expense_id`
## `financial_categories`

Model: `FinancialCategory`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `is_active` | TINYINT | No | No | 1 |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `FinancialRecords` → `financial_records` via `category_id`
## `financial_records`

Model: `FinancialRecord`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `member_id` | INTEGER UNSIGNED | Yes | No | — |
| `is_anonymous` | TINYINT | No | No | 0 |
| `category_id` | INTEGER UNSIGNED | No | No | — |
| `receipt_number` | STRING(100) | Yes | No | — |
| `amount` | DECIMAL(10, 2) | No | No | — |
| `payment_method` | ENUM("cash", "gcash", "bank_transfer") | Yes | No | — |
| `transaction_date` | DATEONLY | No | No | — |
| `recorded_by` | INTEGER UNSIGNED | No | No | — |
| `notes` | TEXT | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- Index `idx_financial_records_date_deleted`: transaction_date, is_deleted
- Index `idx_financial_records_member_deleted_date`: member_id, is_deleted, transaction_date
- Index `idx_financial_records_category_deleted`: category_id, is_deleted
- Index `idx_finance_date`: is_deleted, transaction_date

Associations
- BelongsTo `Member` → `members` via `member_id`
- BelongsTo `category` → `financial_categories` via `category_id`
- BelongsTo `deletedByUser` → `users` via `deleted_by`
- BelongsTo `recorder` → `users` via `recorded_by`
- HasMany `attachments` → `attachments` via `income_id`
## `funds`

Model: `Fund`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `Accounts` → `accounts` via `fund_id`
## `inventory_categories`

Model: `InventoryCategory`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `InventoryItems` → `inventory_items` via `category_id`
## `inventory_items`

Model: `InventoryItem`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(150) | No | No | — |
| `category_id` | INTEGER UNSIGNED | Yes | No | — |
| `quantity` | INTEGER UNSIGNED | No | No | 0 |
| `unit` | STRING(50) | Yes | No | — |
| `condition` | ENUM("Good", "Fair", "Poor", "For Disposal") | Yes | No | — |
| `status` | ENUM("Available", "Low Stock", "Out of Stock", "Under Repair") | No | No | "Available" |
| `low_stock_threshold` | INTEGER UNSIGNED | Yes | No | — |
| `notes` | TEXT | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `category` → `inventory_categories` via `category_id`
- HasMany `InventoryRequests` → `inventory_requests` via `item_id`
- HasMany `InventoryUsages` → `inventory_usage` via `item_id`
- HasMany `transactions` → `inventory_transactions` via `item_id`
## `inventory_requests`

Model: `InventoryRequest`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `item_id` | INTEGER UNSIGNED | No | No | — |
| `event_id` | INTEGER UNSIGNED | Yes | No | — |
| `service_id` | INTEGER UNSIGNED | Yes | No | — |
| `ministry_role_id` | INTEGER UNSIGNED | Yes | No | — |
| `requested_by` | INTEGER UNSIGNED | No | No | — |
| `request_key` | STRING(64) | Yes | No | — |
| `quantity` | INTEGER UNSIGNED | No | No | — |
| `purpose` | STRING(255) | Yes | No | — |
| `status` | ENUM("pending", "approved", "rejected") | No | No | "pending" |
| `reviewed_by` | INTEGER UNSIGNED | Yes | No | — |
| `review_note` | TEXT | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- Index `idx_ir_requester_status`: requested_by, status
- Unique `uq_inventory_requests_requester_key`: requested_by, request_key

Associations
- BelongsTo `event` → `events` via `event_id`
- BelongsTo `item` → `inventory_items` via `item_id`
- BelongsTo `ministryRole` → `ministry_roles` via `ministry_role_id`
- BelongsTo `requestedByUser` → `users` via `requested_by`
- BelongsTo `reviewedByUser` → `users` via `reviewed_by`
- BelongsTo `service` → `services` via `service_id`
## `inventory_transactions`

Model: `InventoryTransaction`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `item_id` | INTEGER UNSIGNED | No | No | — |
| `transaction_type` | ENUM("initial", "adjustment", "usage", "request_fulfillment", "return") | No | No | — |
| `quantity_delta` | INTEGER | No | No | — |
| `source_type` | STRING(80) | Yes | No | — |
| `source_id` | INTEGER UNSIGNED | Yes | No | — |
| `notes` | TEXT | Yes | No | — |
| `recorded_by` | INTEGER UNSIGNED | Yes | No | — |
| `occurred_at` | DATE | No | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `item` → `inventory_items` via `item_id`
- BelongsTo `recordedByUser` → `users` via `recorded_by`
## `inventory_usage`

Model: `InventoryUsage`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `item_id` | INTEGER UNSIGNED | No | No | — |
| `quantity_used` | INTEGER UNSIGNED | No | No | — |
| `used_by` | INTEGER UNSIGNED | No | No | — |
| `used_for` | STRING(255) | Yes | No | — |
| `used_at` | DATE | No | No | — |
| `is_reversed` | TINYINT | No | No | 0 |
| `reversed_at` | DATE | Yes | No | — |
| `reversed_by` | INTEGER UNSIGNED | Yes | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `item` → `inventory_items` via `item_id`
- BelongsTo `usedByUser` → `users` via `used_by`
## `invited_members`

Model: `InvitedMember`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `email` | STRING(150) | No | No | — |
| `first_name` | STRING(100) | No | No | — |
| `last_name` | STRING(100) | No | No | — |
| `invite_token` | STRING(255) | No | No | — |
| `invited_by` | INTEGER UNSIGNED | Yes | No | — |
| `expires_at` | DATE | No | No | — |
| `accepted_at` | DATE | Yes | No | — |
| `status` | ENUM("pending", "accepted", "expired") | No | No | "pending" |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `invitedByUser` → `users` via `invited_by`
- HasOne `User` → `users` via `invited_member_id`
## `member_notes`

Model: `MemberNote`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `note` | TEXT | No | No | — |
| `is_confidential` | TINYINT | No | No | 1 |
| `created_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Member` → `members` via `member_id`
- BelongsTo `createdByUser` → `users` via `created_by`
## `member_qr_credentials`

Model: `MemberQrCredential`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `public_id` | UUID | No | No | — |
| `version` | INTEGER UNSIGNED | No | No | — |
| `status` | ENUM("active", "revoked") | No | No | "active" |
| `issued_by` | INTEGER UNSIGNED | Yes | No | — |
| `issued_at` | DATE | No | No | — |
| `revoked_by` | INTEGER UNSIGNED | Yes | No | — |
| `revoked_at` | DATE | Yes | No | — |
| `revoke_reason` | STRING(500) | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `issuer` → `users` via `issued_by`
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `revoker` → `users` via `revoked_by`
## `member_status_history`

Model: `MemberStatusHistory`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `old_status` | ENUM("New", "Active", "Semi-Active", "Inactive", "Visitor") | No | No | — |
| `new_status` | ENUM("New", "Active", "Semi-Active", "Inactive", "Visitor") | No | No | — |
| `changed_by` | INTEGER UNSIGNED | Yes | No | — |
| `reason` | TEXT | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Member` → `members` via `member_id`
- BelongsTo `changedByUser` → `users` via `changed_by`
## `members`

Model: `Member`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `first_name` | STRING(100) | No | No | — |
| `last_name` | STRING(100) | No | No | — |
| `email` | STRING(150) | Yes | No | — |
| `phone` | STRING(30) | Yes | No | — |
| `birthdate` | DATEONLY | Yes | No | — |
| `spiritual_birthday` | DATEONLY | Yes | No | — |
| `address` | TEXT | Yes | No | — |
| `gender` | ENUM("Male", "Female") | Yes | No | — |
| `status` | ENUM("Active", "Inactive") | No | No | "Active" |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `archived_linked_user_active` | TINYINT | Yes | No | — |
| `cell_group_id` | INTEGER UNSIGNED | Yes | No | — |
| `group_id` | INTEGER UNSIGNED | Yes | No | — |
| `referred_by` | INTEGER UNSIGNED | Yes | No | — |
| `profile_photo_url` | STRING(255) | Yes | No | — |
| `barcode` | STRING(100) | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- Index `idx_member_status`: status
- Index `idx_member_cell_group`: cell_group_id
- Index `idx_member_group`: group_id
- Index `idx_member_email`: email

Associations
- BelongsTo `cellGroup` → `cell_groups` via `cell_group_id`
- BelongsTo `deletedByUser` → `users` via `deleted_by`
- BelongsTo `group` → `ministry_groups` via `group_id`
- BelongsTo `referredByMember` → `members` via `referred_by`
- HasMany `Attendances` → `attendances` via `member_id`
- HasMany `CellGroupHistories` → `cell_group_history` via `member_id`
- HasMany `EventRegistrations` → `event_registrations` via `member_id`
- HasMany `FinancialRecords` → `financial_records` via `member_id`
- HasMany `MemberNotes` → `member_notes` via `member_id`
- HasMany `MemberStatusHistories` → `member_status_history` via `member_id`
- HasMany `MinistryAssignments` → `ministry_assignments` via `member_id`
- HasMany `MinistryEventInvites` → `ministry_event_invites` via `member_id`
- HasMany `MinistryMemberships` → `ministry_memberships` via `member_id`
- HasMany `ServiceResponses` → `service_responses` via `member_id`
- HasMany `emergencyContacts` → `emergency_contacts` via `member_id`
- HasMany `ministryApplications` → `ministry_applications` via `member_id`
- HasMany `referrals` → `members` via `referred_by`
- HasOne `User` → `users` via `member_id`
## `ministries`

Model: `Ministry`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `legacy_ministry_role_id` | INTEGER UNSIGNED | Yes | No | — |
| `name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `is_active` | TINYINT | No | No | 1 |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `legacyMinistryRole` → `ministry_roles` via `legacy_ministry_role_id`
- HasMany `positions` → `ministry_positions` via `ministry_id`
## `ministry_applications`

Model: `MinistryApplication`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `application_key` | STRING(100) | Yes | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `ministry_role_id` | INTEGER UNSIGNED | No | No | — |
| `status` | ENUM("pending", "approved", "rejected", "withdrawn") | No | No | "pending" |
| `message` | TEXT | Yes | No | — |
| `review_note` | TEXT | Yes | No | — |
| `reviewed_by` | INTEGER UNSIGNED | Yes | No | — |
| `reviewed_at` | DATE | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- Index `idx_ministry_app_member_status`: member_id, status
- Index `idx_ministry_app_role_status`: ministry_role_id, status

Associations
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `ministryRole` → `ministry_roles` via `ministry_role_id`
- BelongsTo `reviewedByUser` → `users` via `reviewed_by`
## `ministry_assignments`

Model: `MinistryAssignment`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `service_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `ministry_role_id` | INTEGER UNSIGNED | No | No | — |
| `confirmed` | TINYINT | No | No | 0 |
| `substitute_requested` | TINYINT | No | No | 0 |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Member` → `members` via `member_id`
- BelongsTo `Service` → `services` via `service_id`
- BelongsTo `ministryRole` → `ministry_roles` via `ministry_role_id`
- HasMany `SubstituteRequests` → `substitute_requests` via `assignment_id`
## `ministry_event_invites`

Model: `MinistryEventInvite`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `event_id` | INTEGER UNSIGNED | No | No | — |
| `ministry_role_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `invited_by` | INTEGER UNSIGNED | Yes | No | — |
| `response_status` | ENUM("pending", "attending", "not_attending") | No | No | "pending" |
| `response_deadline` | DATE | Yes | No | — |
| `responded_at` | DATE | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- Index `idx_mei_role_status`: ministry_role_id, response_status

Associations
- BelongsTo `Event` → `events` via `event_id`
- BelongsTo `invitedByUser` → `users` via `invited_by`
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `ministryRole` → `ministry_roles` via `ministry_role_id`
## `ministry_groups`

Model: `MinistryGroup`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `Members` → `members` via `group_id`
## `ministry_memberships`

Model: `MinistryMembership`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `ministry_role_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `added_by` | INTEGER UNSIGNED | No | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- Index `idx_mm_ministry_role`: ministry_role_id

Associations
- BelongsTo `addedByUser` → `users` via `added_by`
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `ministryRole` → `ministry_roles` via `ministry_role_id`
## `ministry_positions`

Model: `MinistryPosition`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `ministry_id` | INTEGER UNSIGNED | Yes | No | — |
| `name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `is_active` | TINYINT | No | No | 1 |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `ministry` → `ministries` via `ministry_id`
## `ministry_roles`

Model: `MinistryRole`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `name` | STRING(100) | No | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `MinistryAssignments` → `ministry_assignments` via `ministry_role_id`
- HasMany `MinistryMemberships` → `ministry_memberships` via `ministry_role_id`
- HasMany `applications` → `ministry_applications` via `ministry_role_id`
- HasOne `normalizedMinistry` → `ministries` via `legacy_ministry_role_id`
## `notifications`

Model: `Notification`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `user_id` | INTEGER UNSIGNED | No | No | — |
| `type` | STRING(100) | No | No | — |
| `message` | TEXT | No | No | — |
| `reference_id` | INTEGER UNSIGNED | Yes | No | null |
| `reference_type` | STRING(50) | Yes | No | null |
| `is_read` | TINYINT | No | No | 0 |
| `read_at` | DATE | Yes | No | — |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- Index `idx_notif_user_read`: user_id, is_read
- Index `idx_notifications_user_created`: user_id, createdAt

Associations
- BelongsTo `User` → `users` via `user_id`
## `password_reset_tokens`

Model: `PasswordResetToken`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `user_id` | INTEGER UNSIGNED | No | No | — |
| `token` | STRING(255) | No | No | — |
| `expires_at` | DATE | No | No | — |
| `used` | TINYINT | No | No | 0 |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `User` → `users` via `user_id`
## `payment_methods`

Model: `PaymentMethod`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `method_name` | STRING(100) | No | No | — |
| `description` | TEXT | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- HasMany `Expenses` → `expenses` via `payment_method_id`
## `permissions`

Model: `Permission`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `module` | STRING(100) | No | No | — |
| `action` | STRING(100) | No | No | — |
| `description` | STRING(255) | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsToMany `roles` → `roles` via `permission_id`
## `refresh_tokens`

Model: `RefreshToken`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `user_id` | INTEGER UNSIGNED | No | No | — |
| `user_session_id` | INTEGER UNSIGNED | Yes | No | — |
| `token` | TEXT | No | No | — |
| `expires_at` | DATE | No | No | — |
| `revoked` | TINYINT | No | No | 0 |
| `revoked_at` | DATE | Yes | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `User` → `users` via `user_id`
- BelongsTo `userSession` → `user_sessions` via `user_session_id`
## `role_permissions`

Model: `RolePermission`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `role_id` | INTEGER UNSIGNED | No | No | — |
| `permission_id` | INTEGER UNSIGNED | No | No | — |
| `created_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Permission` → `permissions` via `permission_id`
- BelongsTo `Role` → `roles` via `role_id`
## `roles`

Model: `Role`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `role_name` | STRING(50) | No | No | — |
| `description` | STRING(255) | Yes | No | — |
| `is_system` | TINYINT | No | No | 0 |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsToMany `permissions` → `permissions` via `role_id`
- HasMany `RolePermissions` → `role_permissions` via `role_id`
- HasMany `Users` → `users` via `role_id`
## `service_attendance_summary`

Model: `ServiceAttendanceSummary`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `service_id` | INTEGER UNSIGNED | No | No | — |
| `total_expected` | INTEGER UNSIGNED | No | No | 0 |
| `total_attended` | INTEGER UNSIGNED | No | No | 0 |
| `total_absent` | INTEGER UNSIGNED | No | No | 0 |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Service` → `services` via `service_id`
## `service_responses`

Model: `ServiceResponse`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `service_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | No | No | — |
| `attendance_status` | ENUM("ATTENDING", "NOT_ATTENDING", "UNDECIDED") | No | No | — |
| `seat_number` | STRING(10) | Yes | No | — |
| `parking_slot` | STRING(10) | Yes | No | — |
| `override_by` | INTEGER UNSIGNED | Yes | No | — |
| `override_reason` | TEXT | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `Member` → `members` via `member_id`
- BelongsTo `Service` → `services` via `service_id`
- BelongsTo `overrideByUser` → `users` via `override_by`
## `services`

Model: `Service`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `title` | STRING(150) | No | No | — |
| `service_date` | DATEONLY | No | No | — |
| `service_time` | TIME | Yes | No | — |
| `capacity` | INTEGER UNSIGNED | Yes | No | — |
| `total_parking_slots` | INTEGER UNSIGNED | Yes | No | — |
| `event_id` | INTEGER UNSIGNED | Yes | No | — |
| `response_deadline` | DATE | Yes | No | — |
| `status` | ENUM("draft", "published", "cancelled", "completed") | No | No | "draft" |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `event` → `events` via `event_id`
- HasMany `Attendances` → `attendances` via `service_id`
- HasMany `MinistryAssignments` → `ministry_assignments` via `service_id`
- HasMany `ServiceResponses` → `service_responses` via `service_id`
- HasOne `summary` → `service_attendance_summary` via `service_id`
## `substitute_requests`

Model: `SubstituteRequest`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `assignment_id` | INTEGER UNSIGNED | No | No | — |
| `requested_by` | INTEGER UNSIGNED | No | No | — |
| `proposed_substitute` | INTEGER UNSIGNED | Yes | No | — |
| `reason` | TEXT | Yes | No | — |
| `status` | ENUM("pending", "approved", "rejected") | No | No | "pending" |
| `resolved_by` | INTEGER UNSIGNED | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `assignment` → `ministry_assignments` via `assignment_id`
- BelongsTo `proposedSubstituteUser` → `users` via `proposed_substitute`
- BelongsTo `requestedByUser` → `users` via `requested_by`
- BelongsTo `resolvedByUser` → `users` via `resolved_by`
## `system_settings`

Model: `SystemSetting`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `key` | STRING(100) | No | No | — |
| `value` | TEXT | Yes | No | — |
| `updated_by` | INTEGER UNSIGNED | Yes | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `updatedByUser` → `users` via `updated_by`
## `user_leader_assignments`

Model: `UserLeaderAssignment`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `user_id` | INTEGER UNSIGNED | No | No | — |
| `scope_type` | ENUM("ministry", "cell_group", "member_group") | No | No | — |
| `scope_id` | INTEGER UNSIGNED | No | No | — |
| `legacy_column` | STRING(64) | Yes | No | — |
| `assigned_by` | INTEGER UNSIGNED | Yes | No | — |
| `is_active` | BOOLEAN | No | No | true |
| `version` | INTEGER UNSIGNED | No | No | 1 |
| `revoked_by` | INTEGER UNSIGNED | Yes | No | — |
| `revoked_at` | DATE | Yes | No | — |
| `revocation_reason` | STRING(500) | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `assignedByUser` → `users` via `assigned_by`
- BelongsTo `revokedByUser` → `users` via `revoked_by`
- BelongsTo `user` → `users` via `user_id`
## `user_sessions`

Model: `UserSession`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `user_id` | INTEGER UNSIGNED | No | No | — |
| `ip_address` | STRING(45) | Yes | No | — |
| `device` | STRING(255) | Yes | No | — |
| `login_at` | DATE | No | No | — |
| `logout_at` | DATE | Yes | No | — |

Indexes
- None declared in the model

Associations
- BelongsTo `User` → `users` via `user_id`
- HasMany `refreshTokens` → `refresh_tokens` via `user_session_id`
## `users`

Model: `User`

| Column | Application type | Nullable | Primary key | Default |
| --- | --- | --- | --- | --- |
| `id` | INTEGER UNSIGNED | No | Yes | — |
| `role_id` | INTEGER UNSIGNED | No | No | — |
| `member_id` | INTEGER UNSIGNED | Yes | No | — |
| `invited_member_id` | INTEGER UNSIGNED | Yes | No | — |
| `leadership_revision` | INTEGER UNSIGNED | No | No | 0 |
| `leads_cell_group_id` | INTEGER UNSIGNED | Yes | No | null |
| `leads_group_id` | INTEGER UNSIGNED | Yes | No | null |
| `leads_ministry_id` | INTEGER UNSIGNED | Yes | No | null |
| `email` | STRING(150) | No | No | — |
| `password_hash` | STRING(255) | No | No | — |
| `is_active` | TINYINT | No | No | 1 |
| `force_password_change` | TINYINT | No | No | 1 |
| `last_login_at` | DATE | Yes | No | — |
| `failed_login_attempts` | INTEGER | No | No | 0 |
| `locked_until` | DATE | Yes | No | null |
| `is_deleted` | TINYINT | No | No | 0 |
| `deleted_at` | DATE | Yes | No | — |
| `deleted_by` | INTEGER UNSIGNED | Yes | No | — |
| `archived_email` | STRING(150) | Yes | No | — |
| `archived_is_active` | TINYINT | Yes | No | — |
| `created_at` | DATE | No | No | — |
| `updated_at` | DATE | No | No | — |

Indexes
- Index `idx_user_member_id`: member_id
- Index `idx_user_email`: email

Associations
- BelongsTo `invitedMember` → `invited_members` via `invited_member_id`
- BelongsTo `leadsCellGroup` → `cell_groups` via `leads_cell_group_id`
- BelongsTo `leadsGroup` → `ministry_groups` via `leads_group_id`
- BelongsTo `leadsMinistry` → `ministry_roles` via `leads_ministry_id`
- BelongsTo `member` → `members` via `member_id`
- BelongsTo `role` → `roles` via `role_id`
- HasMany `AuditLogs` → `audit_logs` via `user_id`
- HasMany `Notifications` → `notifications` via `user_id`
- HasMany `PasswordResetTokens` → `password_reset_tokens` via `user_id`
- HasMany `RefreshTokens` → `refresh_tokens` via `user_id`
- HasMany `UserSessions` → `user_sessions` via `user_id`
- HasMany `createdExpenses` → `expenses` via `created_by`
- HasMany `leaderAssignments` → `user_leader_assignments` via `user_id`
- HasMany `reviewedMinistryApplications` → `ministry_applications` via `reviewed_by`
- HasMany `uploadedAttachments` → `attachments` via `uploaded_by`
