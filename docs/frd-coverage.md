# FRD Coverage Review

This file cross-checks the attached FRD against the current codebase.

Status legend:

- Implemented: usable in the app/API.
- Partial: present, but not complete against the FRD detail.
- Missing: not implemented in the current codebase.

## 1. Purpose

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Ticket Management | Implemented | Ticket create/list/detail/status/comment/worklist routes and pages exist. |
| Project Management | Partial | Projects CRUD, progress, collaborators exist. Full lifecycle/history is incomplete. |
| To-Do Management | Implemented | Personal/team task list, create, complete, delete, convert to ticket. |
| Employee Task Tracking | Partial | To-Dos and timesheets exist. Automated routine task generation is missing. |
| SLA Monitoring | Partial | `slaBreached` field and counters exist. Automated SLA rules/escalation jobs are missing. |
| Escalation Management | Missing | No scheduled escalation rule engine. |
| Team Collaboration | Partial | Assignment, forwarding, collaborators, comments exist. Real-time collaboration is limited. |
| Google Workspace Integration | Missing | UI placeholders only; no Google API integration. |
| File Management | Missing | No persisted folder/file module. |
| Audit Tracking | Implemented | Audit log schema, API, UI, exports exist. Inline record audit is partial. |
| Dashboard Analytics | Partial | Dashboard counters/widgets exist. Role-specific dashboards are limited. |
| Employee -> TL -> AM -> Manager hierarchy | Partial | Roles/reporting manager fields exist. Hierarchy enforcement is not complete. |

## 2. User Roles

| Role Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Employee capabilities | Partial | Tickets, personal To-Dos, projects, timesheets exist. File upload is missing. |
| Team Leader capabilities | Partial | Assign/forward/team visibility partially exists. Approval workflow is shallow. |
| Assistant Manager capabilities | Missing | No dedicated assistant manager dashboard/workflow. |
| Manager / Head IT capabilities | Partial | Projects, tickets, users/settings exist. Department monitoring/SLA config incomplete. |
| Administrator capabilities | Partial | Users, roles, departments, categories/settings exist. Full permissions/masters incomplete. |

## 3. Authentication Module

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Username/password login | Implemented | Login form and JWT API exist. |
| Department / Ward field | Partial | Department selector exists; backend does not validate department. |
| Username/password mandatory validation | Implemented | Login form schema and backend validation exist. |
| Welcome dialog with employee/date/last login | Implemented | Login page now displays required fields after login. |
| Reminder popup with Open/Snooze/Dismiss | Partial | Popup exists with navigation actions. Counts are not live per reminder category yet. |

## 4. User Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| User creation fields | Partial | Core fields exist. Reporting manager exists in API/schema but is not exposed fully in user form. |
| Department CRUD | Implemented | Settings tab and API exist. |
| Role CRUD | Implemented | Settings tab and API exist. |
| User upload | Partial | CSV upload/template exists. Excel upload parser is not implemented. |
| User export Excel/PDF/CSV | Implemented | Table export controls exist. |

## 5. RBAC

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Module/menu/screen/button/field/record permissions | Missing | Roles exist, but no granular permission matrix/enforcement. |
| View/create/edit/delete/approve/reject/export/import/assign actions | Partial | Some actions exist by route/UI. No centralized RBAC policy engine. |

## 6. Dashboard Module

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Employee counters | Partial | Ticket/project/todo counters exist. Some dashboard status mappings need normalization. |
| Calendar/notifications/recent activity widgets | Partial | Calendar and notification widgets exist. Recent activity API exists but is not shown in dashboard. |
| Team Leader dashboard | Partial | Team ticket table and team stats exist, but role-specific switching is shallow. |
| Manager dashboard | Partial | SLA/pending/escalation counters exist as placeholders or zeros. |

## 7. Common Worklist

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Central ticket pool | Implemented | `/worklist` route/page shows YTS tickets. |
| Search/filter/pagination | Implemented | UI and API filters exist. |
| Sorting/LIFO | Partial | Backend orders by created date desc. No user-selectable sorting. |
| Pick ticket | Implemented | Pick route/UI exists. |
| Assign ticket | Partial | API exists; worklist page does not expose assign action directly. |
| View attachment | Missing | Attachments are not persisted. |
| Escalation rule 5/10/15 hours | Missing | No scheduled escalation service. |

## 8. Raise Ticket Module

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Self assign / raise ticket | Partial | Assigned To supports self/manual assignment. Explicit type switch is limited. |
| Subject/description/priority/category/assigned to | Implemented | Form and API exist. |
| Attachment/assigned CC/10MB limit | Missing | No attachment storage or CC model. |

## 9. Routine Task Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Daily/weekly/monthly/yearly routines | Missing | No routine schedule schema or job runner. |
| Auto-generated tasks | Missing | No scheduler. |

## 10. My Ticket Worklist

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Statuses | Partial | Many statuses are accepted as text, but not all are represented in filters/badges/workflows. |
| Search/filter/comments | Implemented | List search/filter and detail comments exist. |
| Attachments | Missing | No attachment module. |
| Ticket aging | Partial | Created/pending/resolution/closed days are visible; started date is missing. |
| Pending after 48 hours | Missing | No background rule to auto-move in-progress tickets to pending. |

## 11. Ticket Verification

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Approve/reopen/hold | Partial | Buttons exist on ticket detail and update status. Dedicated approval queue is missing. |
| Auto closure after 48 hours | Missing | No scheduled auto-closure job. |

## 12. Ticket Forwarding

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Forward | Implemented | API exists. |
| Accept/reject | Missing | No accept/reject endpoints/UI. |
| History maintained | Partial | Audit logs exist. Ticket history table exists but is not fully populated. |

## 13. Ticket Monitoring

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Assigned CC monitoring | Missing | No CC table/model. |
| Search/filter | Partial | Ticket lists support search/filter. |
| Timeline view | Missing | Comments/audit exist but no timeline UI. |

## 14. To-Do Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Personal To-Do | Implemented | Create/list/complete/delete. |
| Team To-Do | Partial | Type exists; assigned-to support is limited in UI/API listing. |
| Calendar business rule | Missing | Creating a To-Do does not create calendar event. |
| To-Do counter count = 0 | Implemented | Counters derive from current filtered data. |
| Convert To-Do to Ticket | Implemented | API and UI menu action exist. |

## 15. Project Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Project creation fields | Partial | Most fields exist. Full project type/status catalog is incomplete. |
| Circular progress indicator | Implemented | Project cards show circular progress; table shows progress bar. |
| Progress history | Missing | Audit logs record progress updates, but no dedicated progress history table/UI. |
| Project statuses | Partial | Current filters include a subset of FRD statuses. |

## 16. Project Collaborators

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Add/remove member | Partial | API exists. UI support is limited. |
| Replace member | Missing | No replace action. |
| Audited changes | Partial | Add collaborator audited. Remove audit is incomplete. |

## 17. File Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Folders/files/upload/download/preview | Missing | No file management schema/API/UI. |
| File size/profile image limits | Partial | Profile image UI says 2MB, but persistent validation/storage is missing. |

## 18. Calendar Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Day/week/month views | Partial | Calendar page exists but is mainly month-style listing. |
| Event creation/meetings/reminders | Partial | API supports event creation, UI page is mostly display-focused. |

## 19. Google Meet Integration

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Meeting link/invites/calendar invitation | Missing | Meeting link field exists, but no Google integration. |

## 20. Google Space Integration

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Auto-create/sync project space | Missing | No Google Space API integration. |

## 21. Timesheet Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Login/logout/task hours | Implemented | Timesheet form/API. |
| Project/ticket hours | Partial | Schema has project/ticket IDs, but UI does not assign entries to ticket/project. |
| Daily/weekly/monthly reports | Partial | Date filtering/export exists; no dedicated report views. |

## 22. ICU Monitoring Screen

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Live dashboard/auto refresh | Missing | No dedicated ICU monitoring screen or 30-second refresh. |

## 23. Notification Engine

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Dashboard notifications | Implemented | Notifications API/UI. |
| SignalR/email/Google Space | Missing | Socket.IO is initialized, but not wired as SignalR equivalent; email/Google Space missing. |
| Notification events | Partial | Assignment/status/project add notifications exist. Others incomplete. |

## 24. Audit Log Management

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Create/update/delete/login/logout tracking | Implemented | API writes audit logs for main actions. |
| Approvals | Partial | Status changes audited; no dedicated approval model. |
| Old/new value | Partial | Some new values are captured. Old values are generally missing. |
| Inline audit per record | Missing | No inline audit panel on every record. |

## 25. Reports & Exports

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Excel/PDF/CSV exports | Implemented | TableControls support all three. |
| Ticket/project/todo/timesheet/user/audit reports | Partial | Exportable list reports exist. SLA/escalation reports are missing. |

## 26. Settings & Master Configuration

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| Department/role/category masters | Implemented | Settings CRUD exists. |
| Designation/priority/ticket status/project status/SLA/holiday/shift/notification masters | Missing | No dedicated CRUD tables/UI for these masters. |

## Non-Functional And Testing Requirements

| Requirement | Status | Evidence / Gap |
| --- | --- | --- |
| JWT/password encryption/audit logging | Implemented | JWT auth, bcrypt, audit logs. |
| RBAC/session timeout/HTTPS | Partial/Missing | JWT exists; RBAC/session timeout/HTTPS enforcement incomplete locally. |
| Performance/scalability/availability/reliability | Not verifiable | Requires deployment architecture and load testing. |
| Browser/device compatibility | Partial | Responsive React UI, no formal browser test matrix. |
| Logging/monitoring | Partial | Pino request logs exist; full monitoring stack missing. |
| Functional/security/performance/integration/UAT/regression tests | Missing | No formal automated test suite currently present. |
