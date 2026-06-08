# SRH ColorAdmin Model Review

Reviewed source folders:

- `C:\Users\USER\Downloads\Penguin\ColorAdmin\Models\SRH`
- `C:\Users\USER\Downloads\Penguin\ColorAdmin\Models\SRH\Other`

## Entity Models

The legacy EF models describe these core areas:

- Department and user masters: `Department`, `UserMaster`, `User_Depart`, `User_Reporting`
- Ticket master data: `Tic_Type`, `Tic_Issues`, `TicLocation`, sequence tables
- Main ticket lifecycle: `Tic_Master`, `Tic_AssignTo`, `Tic_AssignCC*`, `Tic_AToCmts`, `Tic_AToCmtsReply`, `Tic_Log_Pending`, `Tic_FDepart`
- Project/task style ticket creation: `TicketNew`, `TicketNewSub`
- Routine ticket scheduling: `Tic_Routine`, `Tic_Ruser`, `Tic_RWeekly`, `Tic_WeekDays`

## View Models

The `Other` folder is mostly Razor/UI request-response models. It confirms workflow requirements rather than persistence tables:

- Ticket creation/update with owners, associates, CC users, sub-members, external contacts, file metadata, review schedule
- Assignment, self-assignment, reassignment, verification, reopen, and taken-ticket flows
- Status/history/departmentwise/userwise report filters and rows
- Timesheet and service-request print views

## Implemented In Modern Schema

The current Drizzle model was extended without breaking existing routes:

- `users.ts`
  - Added department ticket flags, sequence prefixes, mobile numbers, housekeeping marker, and legacy IDs.
  - Added user hardware/call-center flags, ward/space metadata, and legacy user ID.
  - Added normalized historical user-department and user-reporting assignment tables.

- `categories.ts`
  - Added status/order/legacy classification fields to categories and ticket types.

- `projects.ts`
  - Added `TicketNew` project/task metadata: system type, subtype, system number, institute, department, associates, review schedule, external provider/contact details, file group ID, and legacy ID.

- `tickets.ts`
  - Added main ticket compatibility fields for source department, system/service type, assignment timing, expected close date, verification, cancellation, reopen, review schedule, external contact details, and legacy ID.
  - Added normalized tables for assignment history, CC users, comment replies, from departments, pending logs, routine tickets, routine users, routine schedule days, ticket locations, ticket issues, ticket sequences, and ticket sub-members.
  - Expanded comments and attachments with asset/file visibility metadata from the old models.

## API And UI Follow-Up

The modern API now exposes richer ticket fields, assignment history, reopen, verify/reject, and routine-ticket list/create endpoints. The frontend now includes SRH fields on ticket create/edit, assignment history and workflow actions on ticket detail, and a Routine Tickets page in the sidebar.

Remaining deeper migration work is mostly business-rule parity: generating actual ticket instances from routine schedules, migrating historical ColorAdmin data, and matching any role-specific approvals from the old controllers.
