import { getPool } from "./index.js";

const statements = [
  `IF OBJECT_ID('roles', 'U') IS NULL
   CREATE TABLE roles (
     id INT IDENTITY(1,1) PRIMARY KEY,
     name NVARCHAR(120) NOT NULL UNIQUE,
     description NVARCHAR(MAX) NULL,
     level INT NOT NULL CONSTRAINT DF_roles_level DEFAULT 1,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_roles_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_roles_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('departments', 'U') IS NULL
   CREATE TABLE departments (
     id INT IDENTITY(1,1) PRIMARY KEY,
     name NVARCHAR(160) NOT NULL UNIQUE,
     description NVARCHAR(MAX) NULL,
     head_id INT NULL,
     document_prefix NVARCHAR(40) NULL,
     ticket_enabled BIT NOT NULL CONSTRAINT DF_departments_ticket_enabled DEFAULT 1,
     ticket_sequence_prefix NVARCHAR(40) NULL,
     routine_sequence_prefix NVARCHAR(40) NULL,
     project_sequence_prefix NVARCHAR(40) NULL,
     task_sequence_prefix NVARCHAR(40) NULL,
     mobile_numbers NVARCHAR(MAX) NULL,
     is_housekeeping BIT NOT NULL CONSTRAINT DF_departments_is_housekeeping DEFAULT 0,
     legacy_department_id INT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_departments_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_departments_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('users', 'U') IS NULL
   CREATE TABLE users (
     id INT IDENTITY(1,1) PRIMARY KEY,
     employee_code NVARCHAR(60) NOT NULL UNIQUE,
     name NVARCHAR(180) NOT NULL,
     email NVARCHAR(255) NOT NULL UNIQUE,
     password_hash NVARCHAR(255) NOT NULL,
     mobile NVARCHAR(40) NULL,
     department_id INT NULL,
     designation NVARCHAR(160) NULL,
     role NVARCHAR(80) NOT NULL,
     role_id INT NULL,
     reporting_manager_id INT NULL,
     permissions NVARCHAR(MAX) NULL,
     avatar_url NVARCHAR(MAX) NULL,
     status NVARCHAR(40) NOT NULL CONSTRAINT DF_users_status DEFAULT 'active',
     user_type NVARCHAR(80) NULL,
     ward_uid INT NULL,
     space_name NVARCHAR(160) NULL,
     is_hardware_user BIT NOT NULL CONSTRAINT DF_users_is_hardware_user DEFAULT 0,
     is_call_center_user BIT NOT NULL CONSTRAINT DF_users_is_call_center_user DEFAULT 0,
     legacy_user_id INT NULL,
     last_login DATETIMEOFFSET NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF COL_LENGTH('users', 'permissions') IS NULL
   ALTER TABLE users ADD permissions NVARCHAR(MAX) NULL`,
  `IF OBJECT_ID('categories', 'U') IS NULL
   CREATE TABLE categories (
     id INT IDENTITY(1,1) PRIMARY KEY,
     name NVARCHAR(160) NOT NULL,
     type NVARCHAR(60) NOT NULL,
     description NVARCHAR(MAX) NULL,
     status NVARCHAR(40) NOT NULL CONSTRAINT DF_categories_status DEFAULT 'active',
     order_by INT NULL,
     legacy_category_type INT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_categories_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_categories_updated_at DEFAULT SYSDATETIMEOFFSET(),
     CONSTRAINT UQ_categories_name_type UNIQUE (name, type)
   )`,
  `IF OBJECT_ID('ticket_types', 'U') IS NULL
   CREATE TABLE ticket_types (
     id INT IDENTITY(1,1) PRIMARY KEY,
     name NVARCHAR(160) NOT NULL,
     code NVARCHAR(80) NOT NULL UNIQUE,
     description NVARCHAR(MAX) NULL,
     status NVARCHAR(40) NOT NULL CONSTRAINT DF_ticket_types_status DEFAULT 'active',
     order_by INT NULL,
     legacy_type INT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_types_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_types_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('sub_categories', 'U') IS NULL
   CREATE TABLE sub_categories (
     id INT IDENTITY(1,1) PRIMARY KEY,
     name NVARCHAR(160) NOT NULL,
     category_id INT NOT NULL,
     type NVARCHAR(60) NOT NULL CONSTRAINT DF_sub_categories_type DEFAULT 'ticket',
     description NVARCHAR(MAX) NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_sub_categories_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_sub_categories_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('projects', 'U') IS NULL
   CREATE TABLE projects (
     id INT IDENTITY(1,1) PRIMARY KEY,
     project_no NVARCHAR(60) NOT NULL UNIQUE,
     title NVARCHAR(255) NOT NULL,
     description NVARCHAR(MAX) NULL,
     status NVARCHAR(60) NOT NULL CONSTRAINT DF_projects_status DEFAULT 'created',
     priority NVARCHAR(40) NOT NULL CONSTRAINT DF_projects_priority DEFAULT 'medium',
     category NVARCHAR(120) NULL,
     sub_category_id INT NULL,
     type NVARCHAR(80) NULL,
     system_type NVARCHAR(120) NULL,
     system_sub_type NVARCHAR(120) NULL,
     system_type_no NVARCHAR(80) NULL,
     institute NVARCHAR(160) NULL,
     source_department NVARCHAR(160) NULL,
     service_type NVARCHAR(120) NULL,
     location NVARCHAR(180) NULL,
     department_name NVARCHAR(160) NULL,
     remarks NVARCHAR(MAX) NULL,
     progress INT NOT NULL CONSTRAINT DF_projects_progress DEFAULT 0,
     owner_id INT NULL,
     associate_id INT NULL,
     associate_cc_ids NVARCHAR(MAX) NULL,
     process_owner_id INT NULL,
     start_date DATE NULL,
     end_date DATE NULL,
     final_deadline DATETIMEOFFSET NULL,
     review_frequency NVARCHAR(80) NULL,
     review_schedule INT NULL,
     review_days NVARCHAR(MAX) NULL,
     review_duration NVARCHAR(80) NULL,
     is_external BIT NOT NULL CONSTRAINT DF_projects_is_external DEFAULT 0,
     organization_name NVARCHAR(180) NULL,
     provider_name NVARCHAR(180) NULL,
     external_person_role NVARCHAR(120) NULL,
     external_phone_no NVARCHAR(40) NULL,
     supporting_person NVARCHAR(180) NULL,
     file_group_id NVARCHAR(120) NULL,
     legacy_ticket_new_id INT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_projects_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_projects_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('tickets', 'U') IS NULL
   CREATE TABLE tickets (
     id INT IDENTITY(1,1) PRIMARY KEY,
     ticket_no NVARCHAR(60) NOT NULL UNIQUE,
     subject NVARCHAR(255) NOT NULL,
     description NVARCHAR(MAX) NULL,
     status NVARCHAR(60) NOT NULL CONSTRAINT DF_tickets_status DEFAULT 'yts',
     priority NVARCHAR(40) NOT NULL,
     category_id INT NULL,
     sub_category_id INT NULL,
     type NVARCHAR(80) NOT NULL,
     created_by_id INT NOT NULL,
     assigned_to_id INT NULL,
     assigned_department_id INT NULL,
     source_department NVARCHAR(160) NULL,
     project_id INT NULL,
     system_type_id INT NULL,
     system_type NVARCHAR(120) NULL,
     system_sub_type NVARCHAR(120) NULL,
     system_type_no NVARCHAR(80) NULL,
     service_type NVARCHAR(120) NULL,
     institute NVARCHAR(160) NULL,
     location NVARCHAR(180) NULL,
     owner_id INT NULL,
     associate_id INT NULL,
     associate_cc_ids NVARCHAR(MAX) NULL,
     assigned_by_id INT NULL,
     assigned_at DATETIMEOFFSET NULL,
     started_at DATETIMEOFFSET NULL,
     due_date DATETIMEOFFSET NULL,
     expected_close_date DATETIMEOFFSET NULL,
     resolved_at DATETIMEOFFSET NULL,
     closed_at DATETIMEOFFSET NULL,
     submitted_for_verification_at DATETIMEOFFSET NULL,
     verified_at DATETIMEOFFSET NULL,
     verified_by_id INT NULL,
     verification_remarks NVARCHAR(MAX) NULL,
     cancelled_at DATETIMEOFFSET NULL,
     cancelled_by_id INT NULL,
     reopen_count INT NOT NULL CONSTRAINT DF_tickets_reopen_count DEFAULT 0,
     reopened_at DATETIMEOFFSET NULL,
     reopen_remarks NVARCHAR(MAX) NULL,
     review_schedule INT NULL,
     review_days NVARCHAR(MAX) NULL,
     review_duration NVARCHAR(80) NULL,
     is_external BIT NOT NULL CONSTRAINT DF_tickets_is_external DEFAULT 0,
     organization_name NVARCHAR(180) NULL,
     provider_name NVARCHAR(180) NULL,
     external_person_role NVARCHAR(120) NULL,
     external_phone_no NVARCHAR(40) NULL,
     supporting_person NVARCHAR(180) NULL,
     file_group_id NVARCHAR(120) NULL,
     legacy_ticket_id INT NULL,
     sla_breached BIT NOT NULL CONSTRAINT DF_tickets_sla_breached DEFAULT 0,
     forwarded_from_id INT NULL,
     remarks NVARCHAR(MAX) NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_tickets_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_tickets_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('ticket_comments', 'U') IS NULL
   CREATE TABLE ticket_comments (
     id INT IDENTITY(1,1) PRIMARY KEY,
     ticket_id INT NOT NULL,
     assignment_id INT NULL,
     content NVARCHAR(MAX) NOT NULL,
     author_id INT NOT NULL,
     asset_no NVARCHAR(120) NULL,
     asset_type NVARCHAR(120) NULL,
     upload_file_names NVARCHAR(MAX) NULL,
     upload_file_users NVARCHAR(MAX) NULL,
     commented_on DATETIMEOFFSET NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_comments_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('ticket_comment_replies', 'U') IS NULL
   CREATE TABLE ticket_comment_replies (
     id INT IDENTITY(1,1) PRIMARY KEY,
     comment_id INT NOT NULL,
     content NVARCHAR(MAX) NOT NULL,
     replied_by_id INT NULL,
     replied_by_name NVARCHAR(180) NULL,
     reply_to NVARCHAR(180) NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_comment_replies_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('ticket_attachments', 'U') IS NULL
   CREATE TABLE ticket_attachments (
     id INT IDENTITY(1,1) PRIMARY KEY,
     ticket_id INT NOT NULL,
     document_name NVARCHAR(255) NULL,
     file_name NVARCHAR(255) NOT NULL,
     mime_type NVARCHAR(120) NOT NULL,
     size_bytes INT NOT NULL,
     content_base64 NVARCHAR(MAX) NOT NULL,
     description NVARCHAR(MAX) NULL,
     document_date DATE NULL,
     cost DECIMAL(18,2) NULL,
     visible_to_users NVARCHAR(MAX) NULL,
     uploaded_by_id INT NOT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_attachments_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('ticket_assignments', 'U') IS NULL
   CREATE TABLE ticket_assignments (
     id INT IDENTITY(1,1) PRIMARY KEY,
     ticket_id INT NOT NULL,
     assigned_to_id INT NOT NULL,
     assigned_by_id INT NULL,
     assigned_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_assignments_assigned_at DEFAULT SYSDATETIMEOFFSET(),
     started_at DATETIMEOFFSET NULL,
     ended_at DATETIMEOFFSET NULL,
     status NVARCHAR(60) NOT NULL CONSTRAINT DF_ticket_assignments_status DEFAULT 'assigned',
     remarks NVARCHAR(MAX) NULL,
     reopen_count INT NOT NULL CONSTRAINT DF_ticket_assignments_reopen_count DEFAULT 0,
     previous_assignment_id INT NULL,
     redirected_from_assignment_id INT NULL,
     routine_user_id INT NULL,
     asset_no NVARCHAR(120) NULL,
     asset_type NVARCHAR(120) NULL,
     classification_type NVARCHAR(120) NULL,
     classification_category NVARCHAR(120) NULL,
     classification_issue NVARCHAR(120) NULL,
     is_other_issue BIT NOT NULL CONSTRAINT DF_ticket_assignments_is_other_issue DEFAULT 0,
     other_issue NVARCHAR(MAX) NULL,
     staff_name NVARCHAR(180) NULL,
     staff_code NVARCHAR(80) NULL,
     ended_at_source NVARCHAR(80) NULL,
     obsolete_at DATETIMEOFFSET NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_assignments_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('ticket_assignment_cc', 'U') IS NULL
   CREATE TABLE ticket_assignment_cc (
     id INT IDENTITY(1,1) PRIMARY KEY,
     ticket_id INT NOT NULL,
     user_id INT NOT NULL,
     assigned_by_id INT NULL,
     assigned_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_assignment_cc_assigned_at DEFAULT SYSDATETIMEOFFSET(),
     reopen_count INT NOT NULL CONSTRAINT DF_ticket_assignment_cc_reopen_count DEFAULT 0,
     routine_user_id INT NULL,
     obsolete_at DATETIMEOFFSET NULL
   )`,
  `IF OBJECT_ID('ticket_routines', 'U') IS NULL
   CREATE TABLE ticket_routines (
     id INT IDENTITY(1,1) PRIMARY KEY,
     department_id INT NULL,
     routine_no NVARCHAR(60) NOT NULL UNIQUE,
     subject NVARCHAR(255) NOT NULL,
     description NVARCHAR(MAX) NULL,
     status NVARCHAR(60) NOT NULL CONSTRAINT DF_ticket_routines_status DEFAULT 'active',
     priority NVARCHAR(40) NOT NULL,
     category_id INT NULL,
     type NVARCHAR(80) NOT NULL CONSTRAINT DF_ticket_routines_type DEFAULT 'routine',
     schedule NVARCHAR(80) NOT NULL,
     start_date DATETIMEOFFSET NULL,
     closing_date DATETIMEOFFSET NULL,
     raised_by_id INT NULL,
     cancelled_at DATETIMEOFFSET NULL,
     cancelled_by_id INT NULL,
     legacy_routine_id INT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_routines_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_routines_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('ticket_routine_users', 'U') IS NULL
   CREATE TABLE ticket_routine_users (
     id INT IDENTITY(1,1) PRIMARY KEY,
     routine_id INT NOT NULL,
     user_id INT NOT NULL,
     assigned_by_id INT NULL,
     assign_category NVARCHAR(20) NOT NULL,
     assigned_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_routine_users_assigned_at DEFAULT SYSDATETIMEOFFSET(),
     obsolete_at DATETIMEOFFSET NULL
   )`,
  `IF OBJECT_ID('ticket_routine_schedule_days', 'U') IS NULL
   CREATE TABLE ticket_routine_schedule_days (
     id INT IDENTITY(1,1) PRIMARY KEY,
     routine_user_id INT NOT NULL,
     day_value INT NOT NULL,
     day_type NVARCHAR(40) NOT NULL,
     obsolete_at DATETIMEOFFSET NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_ticket_routine_schedule_days_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('project_collaborators', 'U') IS NULL
   CREATE TABLE project_collaborators (
     id INT IDENTITY(1,1) PRIMARY KEY,
     project_id INT NOT NULL,
     user_id INT NOT NULL,
     role NVARCHAR(120) NULL,
     permissions NVARCHAR(MAX) NULL,
     added_by_id INT NULL,
     added_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_project_collaborators_added_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_project_collaborators_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF COL_LENGTH('project_collaborators', 'permissions') IS NULL
   ALTER TABLE project_collaborators ADD permissions NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('project_collaborators', 'added_by_id') IS NULL
   ALTER TABLE project_collaborators ADD added_by_id INT NULL`,
  `IF COL_LENGTH('project_collaborators', 'updated_at') IS NULL
   ALTER TABLE project_collaborators ADD updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_project_collaborators_updated_at DEFAULT SYSDATETIMEOFFSET()`,
  `IF OBJECT_ID('project_workflow_nodes', 'U') IS NULL
   CREATE TABLE project_workflow_nodes (
     id INT IDENTITY(1,1) PRIMARY KEY,
     project_id INT NOT NULL,
     name NVARCHAR(255) NOT NULL,
     node_type NVARCHAR(40) NOT NULL CONSTRAINT DF_pwn_node_type DEFAULT 'task',
     sequence_order INT NOT NULL CONSTRAINT DF_pwn_sequence_order DEFAULT 0,
     description NVARCHAR(MAX) NULL,
     status NVARCHAR(40) NOT NULL CONSTRAINT DF_pwn_status DEFAULT 'pending',
     assigned_to_id INT NULL,
     started_at DATETIMEOFFSET NULL,
     completed_at DATETIMEOFFSET NULL,
     duration_seconds INT NULL,
     transition_seconds INT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_pwn_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_pwn_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('project_node_activities', 'U') IS NULL
   CREATE TABLE project_node_activities (
     id INT IDENTITY(1,1) PRIMARY KEY,
     project_id INT NOT NULL,
     node_id INT NOT NULL,
     user_id INT NOT NULL,
     action NVARCHAR(40) NOT NULL,
     from_node_id INT NULL,
     to_node_id INT NULL,
     duration_seconds INT NULL,
     transition_seconds INT NULL,
     remarks NVARCHAR(MAX) NULL,
     occurred_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_pna_occurred_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('project_flags', 'U') IS NULL
   CREATE TABLE project_flags (
     id INT IDENTITY(1,1) PRIMARY KEY,
     project_id INT NOT NULL,
     node_id INT NULL,
     raised_by_id INT NOT NULL,
     description NVARCHAR(MAX) NOT NULL,
     status NVARCHAR(40) NOT NULL CONSTRAINT DF_project_flags_status DEFAULT 'open',
     resolved_by_id INT NULL,
     resolved_at DATETIMEOFFSET NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_project_flags_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('project_approvals', 'U') IS NULL
   CREATE TABLE project_approvals (
     id INT IDENTITY(1,1) PRIMARY KEY,
     project_id INT NOT NULL,
     node_id INT NULL,
     approved_by_id INT NOT NULL,
     status NVARCHAR(40) NOT NULL,
     remarks NVARCHAR(MAX) NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_project_approvals_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('project_comments', 'U') IS NULL
   CREATE TABLE project_comments (
     id INT IDENTITY(1,1) PRIMARY KEY,
     project_id INT NOT NULL,
     content NVARCHAR(MAX) NOT NULL,
     author_id INT NOT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_project_comments_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('todos', 'U') IS NULL
   CREATE TABLE todos (
     id INT IDENTITY(1,1) PRIMARY KEY,
     title NVARCHAR(255) NOT NULL,
     description NVARCHAR(MAX) NULL,
     status NVARCHAR(60) NOT NULL CONSTRAINT DF_todos_status DEFAULT 'open',
     priority NVARCHAR(40) NOT NULL CONSTRAINT DF_todos_priority DEFAULT 'medium',
     type NVARCHAR(60) NOT NULL CONSTRAINT DF_todos_type DEFAULT 'personal',
     due_date DATETIMEOFFSET NULL,
     reminder_at DATETIMEOFFSET NULL,
     assigned_to_id INT NULL,
     created_by_id INT NOT NULL,
     completed_at DATETIMEOFFSET NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_todos_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_todos_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('notifications', 'U') IS NULL
   CREATE TABLE notifications (
     id INT IDENTITY(1,1) PRIMARY KEY,
     user_id INT NOT NULL,
     type NVARCHAR(80) NOT NULL,
     message NVARCHAR(MAX) NOT NULL,
     entity_type NVARCHAR(80) NULL,
     entity_id INT NULL,
     entity_ref NVARCHAR(120) NULL,
     is_read BIT NOT NULL CONSTRAINT DF_notifications_is_read DEFAULT 0,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_notifications_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('notification_preferences', 'U') IS NULL
   CREATE TABLE notification_preferences (
     user_id INT NOT NULL PRIMARY KEY,
     in_app_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_in_app_enabled DEFAULT 1,
     space_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_space_enabled DEFAULT 1,
     mail_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_mail_enabled DEFAULT 0,
     calendar_enabled BIT NOT NULL CONSTRAINT DF_notification_preferences_calendar_enabled DEFAULT 1,
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_notification_preferences_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('calendar_events', 'U') IS NULL
   CREATE TABLE calendar_events (
     id INT IDENTITY(1,1) PRIMARY KEY,
     user_id INT NOT NULL,
     title NVARCHAR(255) NOT NULL,
     description NVARCHAR(MAX) NULL,
     start_date DATETIMEOFFSET NOT NULL,
     end_date DATETIMEOFFSET NULL,
     type NVARCHAR(80) NOT NULL,
     entity_type NVARCHAR(80) NULL,
     entity_id INT NULL,
     meeting_link NVARCHAR(MAX) NULL,
     attendee_ids NVARCHAR(MAX) NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_calendar_events_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF COL_LENGTH('calendar_events', 'google_event_id') IS NULL
   ALTER TABLE calendar_events ADD google_event_id NVARCHAR(255) NULL`,
  `IF COL_LENGTH('calendar_events', 'google_meet_link') IS NULL
   ALTER TABLE calendar_events ADD google_meet_link NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('calendar_events', 'google_html_link') IS NULL
   ALTER TABLE calendar_events ADD google_html_link NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('calendar_events', 'google_sync_status') IS NULL
   ALTER TABLE calendar_events ADD google_sync_status NVARCHAR(40) NULL`,
  `IF COL_LENGTH('calendar_events', 'google_sync_error') IS NULL
   ALTER TABLE calendar_events ADD google_sync_error NVARCHAR(MAX) NULL`,
  `IF COL_LENGTH('calendar_events', 'google_synced_at') IS NULL
   ALTER TABLE calendar_events ADD google_synced_at DATETIMEOFFSET NULL`,
  `IF OBJECT_ID('timesheets', 'U') IS NULL
   CREATE TABLE timesheets (
     id INT IDENTITY(1,1) PRIMARY KEY,
     user_id INT NOT NULL,
     date DATE NOT NULL,
     login_time NVARCHAR(20) NULL,
     logout_time NVARCHAR(20) NULL,
     hours_worked DECIMAL(8,2) NOT NULL CONSTRAINT DF_timesheets_hours_worked DEFAULT 0,
     ticket_id INT NULL,
     project_id INT NULL,
     task_description NVARCHAR(MAX) NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_timesheets_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('audit_logs', 'U') IS NULL
   CREATE TABLE audit_logs (
     id INT IDENTITY(1,1) PRIMARY KEY,
     action NVARCHAR(80) NOT NULL,
     entity_type NVARCHAR(80) NOT NULL,
     entity_id INT NULL,
     entity_ref NVARCHAR(120) NULL,
     user_id INT NOT NULL,
     old_value NVARCHAR(MAX) NULL,
     new_value NVARCHAR(MAX) NULL,
     ip_address NVARCHAR(80) NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_audit_logs_created_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('document_folders', 'U') IS NULL
   CREATE TABLE document_folders (
     id INT IDENTITY(1,1) PRIMARY KEY,
     name NVARCHAR(255) NOT NULL,
     parent_id INT NULL,
     description NVARCHAR(MAX) NULL,
     created_by_id INT NOT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_document_folders_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_document_folders_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
  `IF OBJECT_ID('document_files', 'U') IS NULL
   CREATE TABLE document_files (
     id INT IDENTITY(1,1) PRIMARY KEY,
     folder_id INT NULL,
     name NVARCHAR(255) NOT NULL,
     file_name NVARCHAR(255) NULL,
     mime_type NVARCHAR(120) NULL,
     size_bytes INT NULL,
     content_base64 NVARCHAR(MAX) NULL,
     google_sheet_url NVARCHAR(MAX) NULL,
     description NVARCHAR(MAX) NULL,
     created_by_id INT NOT NULL,
     created_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_document_files_created_at DEFAULT SYSDATETIMEOFFSET(),
     updated_at DATETIMEOFFSET NOT NULL CONSTRAINT DF_document_files_updated_at DEFAULT SYSDATETIMEOFFSET()
   )`,
];

async function migrate() {
  const pool = await getPool();
  for (const statement of statements) {
    await pool.request().query(statement);
  }
  console.log(`Migration complete. Applied ${statements.length} table checks.`);
  await pool.close();
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
