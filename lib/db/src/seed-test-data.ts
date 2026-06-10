import bcrypt from "bcryptjs";
import { q, qRaw, getPool } from "./index.js";

async function one<T extends Record<string, any>>(sql: string, params: Record<string, any>): Promise<T | undefined> {
  const rows = await qRaw<T>(sql, params);
  return rows[0];
}

// 1x1 px red PNG, used as sample image content for attachments / document files
const SAMPLE_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const SAMPLE_IMAGE_BYTES = Buffer.from(SAMPLE_IMAGE_BASE64, "base64").length;

const FIRST_NAMES = [
  "Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Ananya", "Karan", "Divya",
  "Arjun", "Meera", "Sanjay", "Pooja", "Nikhil", "Kavya", "Rahul", "Isha",
  "Amit", "Neha", "Suresh", "Tanya",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Iyer", "Nair", "Reddy", "Gupta", "Mehta",
  "Joshi", "Kapoor", "Singh", "Rao", "Bose", "Chawla", "Pillai", "Menon",
  "Agarwal", "Bhatt", "Desai", "Malhotra",
];
const DESIGNATIONS = [
  "Software Engineer", "QA Analyst", "Network Engineer", "HR Executive",
  "Finance Officer", "Operations Executive", "Support Engineer", "DevOps Engineer",
  "System Administrator", "Business Analyst",
];
const TICKET_SUBJECTS = [
  "Printer not working on 2nd floor",
  "Unable to connect to office Wi-Fi",
  "Request for new laptop allocation",
  "Outlook crashing on startup",
  "VPN access request for remote work",
  "Software license renewal for Adobe Creative Cloud",
  "Monitor display flickering issue",
  "Password reset for ERP portal",
  "New employee onboarding - IT setup",
  "Shared drive permission issue",
  "Projector not connecting in conference room",
  "Email bounce back errors for client domain",
  "CCTV camera offline in parking area",
  "Biometric attendance device malfunction",
  "Request for additional RAM upgrade",
  "Internet speed degradation in finance wing",
  "Software installation request - AutoCAD",
  "Mobile device enrollment for company phone",
  "Server backup job failure alert",
  "Access card not working at main gate",
];
const TICKET_TYPES = ["incident", "service_request"];
const TICKET_STATUSES = ["yts", "open", "in_progress", "pending", "resolved", "closed"];
const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];

const PROJECT_TITLES = [
  "Campus Wi-Fi Expansion Phase 2",
  "ERP Module Upgrade - Finance",
  "Data Center Cooling System Overhaul",
  "Employee Mobile App Development",
  "CCTV Surveillance Network Expansion",
  "Cloud Migration - Email Services",
  "Biometric Attendance System Rollout",
  "Website Revamp Project",
  "Disaster Recovery Site Setup",
  "Library Management System Upgrade",
  "HR Self-Service Portal Enhancement",
  "Network Security Audit & Hardening",
  "Smart Classroom Setup - Block C",
  "Procurement Portal Automation",
  "Asset Management System Implementation",
  "Video Conferencing Infrastructure Upgrade",
  "Student Information System Migration",
  "Visitor Management System Deployment",
  "Energy Monitoring Dashboard Project",
  "Helpdesk Ticketing System Enhancement",
];
const PROJECT_CATEGORIES = ["Infrastructure", "Development", "Security", "Operations"];
const PROJECT_STATUSES = ["planning", "in_progress", "on_hold", "completed"];

const TODO_TITLES = [
  "Follow up on pending hardware requests",
  "Prepare weekly ticket status report",
  "Review SLA breaches for the week",
  "Update asset inventory spreadsheet",
  "Schedule server maintenance window",
  "Coordinate with vendor for AMC renewal",
  "Audit user access permissions",
  "Plan onboarding for new joiners",
  "Verify backup logs for last night",
  "Prepare project status presentation",
  "Test disaster recovery failover",
  "Review open project risks",
  "Update documentation for new SOPs",
  "Check expiring software licenses",
  "Coordinate department review meeting",
  "Resolve pending reimbursement requests",
  "Review employee feedback survey results",
  "Plan quarterly training session",
  "Update emergency contact list",
  "Verify CCTV footage retention settings",
];
const TODO_TYPES = ["personal", "team", "project"];

const NOTIFICATION_TYPES = ["ticket_assigned", "ticket_updated", "project_update", "todo_reminder", "comment_added"];

const CALENDAR_EVENT_TITLES = [
  "IT Sync-up Meeting", "Project Review Call", "Vendor Demo Session",
  "Quarterly Planning Meeting", "Department Townhall", "Server Maintenance Window",
  "Training Session - New Tools", "Client Escalation Review", "Budget Review Meeting",
  "Security Audit Walkthrough", "Onboarding Session", "Performance Review Discussion",
  "Network Upgrade Planning", "Helpdesk Process Review", "Infrastructure Walkthrough",
  "Cross-team Coordination Call", "Compliance Review Meeting", "Asset Audit Session",
  "Town Hall - IT Updates", "Year-end Wrap-up Meeting",
];
const CALENDAR_EVENT_TYPES = ["meeting", "review", "training", "maintenance"];

async function ensureUser(input: {
  employeeCode: string;
  name: string;
  email: string;
  passwordHash: string;
  mobile: string;
  departmentId: number;
  designation: string;
  role: string;
  roleId: number;
  reportingManagerId?: number | null;
  avatarUrl: string;
}) {
  const existing = await one<{ id: number }>("SELECT TOP 1 id FROM users WHERE employee_code = @employeeCode", input);
  if (existing) return existing.id;
  const [row] = await q<{ id: number }>`
    INSERT INTO users (employee_code, name, email, password_hash, mobile, department_id, designation, role, role_id,
      reporting_manager_id, avatar_url, status, is_hardware_user, is_call_center_user, created_at, updated_at)
    OUTPUT INSERTED.id
    VALUES (${input.employeeCode}, ${input.name}, ${input.email}, ${input.passwordHash}, ${input.mobile},
      ${input.departmentId}, ${input.designation}, ${input.role}, ${input.roleId}, ${input.reportingManagerId ?? null},
      ${input.avatarUrl}, 'active', 0, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  return row.id;
}

async function seedTestData() {
  console.log("Seeding 20 sample records per module into SQL Server...");

  const itDept = (await one<{ id: number }>("SELECT TOP 1 id FROM departments WHERE name = @name", { name: "Information Technology" }))!.id;
  const hrDept = (await one<{ id: number }>("SELECT TOP 1 id FROM departments WHERE name = @name", { name: "Human Resources" }))!.id;
  const financeDept = (await one<{ id: number }>("SELECT TOP 1 id FROM departments WHERE name = @name", { name: "Finance" }))!.id;
  const opsDept = (await one<{ id: number }>("SELECT TOP 1 id FROM departments WHERE name = @name", { name: "Operations" }))!.id;
  const departments = [itDept, hrDept, financeDept, opsDept];

  const memberRole = (await one<{ id: number }>("SELECT TOP 1 id FROM roles WHERE name = @name", { name: "Member" }))!.id;
  const teamLeadRole = (await one<{ id: number }>("SELECT TOP 1 id FROM roles WHERE name = @name", { name: "Team Lead" }))!.id;

  const adminId = (await one<{ id: number }>("SELECT TOP 1 id FROM users WHERE employee_code = @code", { code: "EMP-001" }))!.id;
  const teamLeadId = (await one<{ id: number }>("SELECT TOP 1 id FROM users WHERE employee_code = @code", { code: "EMP-002" }))!.id;

  const hwCat = (await one<{ id: number }>("SELECT TOP 1 id FROM categories WHERE name = @name AND type = @type", { name: "Hardware", type: "ticket" }))!.id;
  const swCat = (await one<{ id: number }>("SELECT TOP 1 id FROM categories WHERE name = @name AND type = @type", { name: "Software", type: "ticket" }))!.id;
  const netCat = (await one<{ id: number }>("SELECT TOP 1 id FROM categories WHERE name = @name AND type = @type", { name: "Network", type: "ticket" }))!.id;
  const emailCat = (await one<{ id: number }>("SELECT TOP 1 id FROM categories WHERE name = @name AND type = @type", { name: "Email", type: "ticket" }))!.id;
  const ticketCategories = [hwCat, swCat, netCat, emailCat];

  // 1. Users (20)
  const userHash = await bcrypt.hash("User@123", 12);
  const userIds: number[] = [];
  for (let i = 0; i < 20; i++) {
    const employeeCode = `EMP-${String(i + 7).padStart(3, "0")}`;
    const first = FIRST_NAMES[i];
    const last = LAST_NAMES[i];
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@company.com`;
    const departmentId = departments[i % departments.length];
    const id = await ensureUser({
      employeeCode,
      name,
      email,
      passwordHash: userHash,
      mobile: `99000001${String(i).padStart(2, "0")}`,
      departmentId,
      designation: DESIGNATIONS[i % DESIGNATIONS.length],
      role: i % 5 === 0 ? "team_lead" : "employee",
      roleId: i % 5 === 0 ? teamLeadRole : memberRole,
      reportingManagerId: i % 5 === 0 ? adminId : teamLeadId,
      avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
    });
    userIds.push(id);
  }
  console.log(`Users ready: ${userIds.length} (EMP-007..EMP-026)`);

  // 2. Tickets (20) + 1 image attachment each
  const ticketIds: number[] = [];
  for (let i = 0; i < 20; i++) {
    const ticketNo = `TKT-${1005 + i}`;
    const existing = await one<{ id: number }>("SELECT TOP 1 id FROM tickets WHERE ticket_no = @ticketNo", { ticketNo });
    let ticketId: number;
    if (existing) {
      ticketId = existing.id;
    } else {
      const createdById = userIds[i % userIds.length];
      const assignedToId = userIds[(i + 3) % userIds.length];
      const [row] = await q<{ id: number }>`
        INSERT INTO tickets (ticket_no, subject, description, status, priority, category_id, type,
          created_by_id, assigned_to_id, assigned_department_id, due_date, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (${ticketNo}, ${TICKET_SUBJECTS[i]}, ${TICKET_SUBJECTS[i] + " - reported by user, needs IT support."},
          ${TICKET_STATUSES[i % TICKET_STATUSES.length]}, ${TICKET_PRIORITIES[i % TICKET_PRIORITIES.length]},
          ${ticketCategories[i % ticketCategories.length]}, ${TICKET_TYPES[i % TICKET_TYPES.length]},
          ${createdById}, ${assignedToId}, ${itDept}, DATEADD(day, ${(i % 10) + 1}, SYSDATETIMEOFFSET()),
          SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
      ticketId = row.id;
    }
    ticketIds.push(ticketId);

    const hasAttachment = await one<{ id: number }>("SELECT TOP 1 id FROM ticket_attachments WHERE ticket_id = @ticketId", { ticketId });
    if (!hasAttachment) {
      await q`
        INSERT INTO ticket_attachments (ticket_id, document_name, file_name, mime_type, size_bytes, content_base64, description, uploaded_by_id, created_at)
        VALUES (${ticketId}, ${`Issue Photo ${i + 1}`}, ${`issue-${1005 + i}.png`}, 'image/png', ${SAMPLE_IMAGE_BYTES},
          ${SAMPLE_IMAGE_BASE64}, ${"Photo evidence for " + TICKET_SUBJECTS[i]}, ${userIds[i % userIds.length]}, SYSDATETIMEOFFSET())`;
    }
  }
  console.log(`Tickets ready: ${ticketIds.length} (TKT-1005..TKT-1024) with image attachments`);

  // 3. Projects (20)
  const projectIds: number[] = [];
  for (let i = 0; i < 20; i++) {
    const projectNo = `PRJ-${1003 + i}`;
    const existing = await one<{ id: number }>("SELECT TOP 1 id FROM projects WHERE project_no = @projectNo", { projectNo });
    let projectId: number;
    if (existing) {
      projectId = existing.id;
    } else {
      const ownerId = userIds[i % userIds.length];
      const processOwnerId = userIds[(i + 5) % userIds.length];
      const [row] = await q<{ id: number }>`
        INSERT INTO projects (project_no, title, description, status, priority, category, progress, owner_id, process_owner_id,
          start_date, end_date, review_frequency, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (${projectNo}, ${PROJECT_TITLES[i]}, ${PROJECT_TITLES[i] + " - departmental initiative for FY 2026."},
          ${PROJECT_STATUSES[i % PROJECT_STATUSES.length]}, ${TICKET_PRIORITIES[i % TICKET_PRIORITIES.length]},
          ${PROJECT_CATEGORIES[i % PROJECT_CATEGORIES.length]}, ${(i * 5) % 101}, ${ownerId}, ${processOwnerId},
          '2026-01-01', '2026-12-31', 'monthly', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
      projectId = row.id;
    }
    projectIds.push(projectId);
  }
  console.log(`Projects ready: ${projectIds.length} (PRJ-1003..PRJ-1022)`);

  // 4. Todos (20)
  const todoMarker = await one<{ id: number }>("SELECT TOP 1 id FROM todos WHERE title = @title", { title: TODO_TITLES[0] });
  if (!todoMarker) {
    for (let i = 0; i < 20; i++) {
      const createdById = userIds[i % userIds.length];
      const assignedToId = userIds[(i + 2) % userIds.length];
      await q`
        INSERT INTO todos (title, description, priority, type, due_date, assigned_to_id, created_by_id, created_at, updated_at)
        VALUES (${TODO_TITLES[i]}, ${TODO_TITLES[i] + " - tracked task."}, ${TICKET_PRIORITIES[i % TICKET_PRIORITIES.length]},
          ${TODO_TYPES[i % TODO_TYPES.length]}, DATEADD(day, ${(i % 14) + 1}, SYSDATETIMEOFFSET()), ${assignedToId}, ${createdById},
          SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
    }
    console.log("Todos ready: 20");
  } else {
    console.log("Todos already seeded, skipping");
  }

  // 5. Calendar events (20)
  const calMarker = await one<{ id: number }>("SELECT TOP 1 id FROM calendar_events WHERE title = @title AND user_id = @userId", { title: CALENDAR_EVENT_TITLES[0], userId: adminId });
  if (!calMarker) {
    for (let i = 0; i < 20; i++) {
      const userId = userIds[i % userIds.length];
      await q`
        INSERT INTO calendar_events (user_id, title, description, start_date, end_date, type, meeting_link, created_at)
        VALUES (${userId}, ${CALENDAR_EVENT_TITLES[i]}, ${CALENDAR_EVENT_TITLES[i] + " - scheduled session."},
          DATEADD(day, ${(i % 20) + 1}, SYSDATETIMEOFFSET()), DATEADD(hour, ${((i % 20) + 1) * 24 + 1}, SYSDATETIMEOFFSET()),
          ${CALENDAR_EVENT_TYPES[i % CALENDAR_EVENT_TYPES.length]}, ${"https://meet.google.com/test-" + (1000 + i)}, SYSDATETIMEOFFSET())`;
    }
    console.log("Calendar events ready: 20");
  } else {
    console.log("Calendar events already seeded, skipping");
  }

  // 6. Notifications (20)
  const notifMarker = await one<{ id: number }>("SELECT TOP 1 id FROM notifications WHERE entity_ref = @entityRef", { entityRef: "TKT-1005" });
  if (!notifMarker) {
    for (let i = 0; i < 20; i++) {
      const userId = userIds[i % userIds.length];
      const ticketNo = `TKT-${1005 + i}`;
      await q`
        INSERT INTO notifications (user_id, type, message, entity_type, entity_ref, is_read, created_at)
        VALUES (${userId}, ${NOTIFICATION_TYPES[i % NOTIFICATION_TYPES.length]}, ${`Update on ${ticketNo}: ${TICKET_SUBJECTS[i]}`},
          'ticket', ${ticketNo}, ${i % 3 === 0 ? 1 : 0}, SYSDATETIMEOFFSET())`;
    }
    console.log("Notifications ready: 20");
  } else {
    console.log("Notifications already seeded, skipping");
  }

  // 7. Timesheets (20)
  const timesheetMarker = await one<{ id: number }>("SELECT TOP 1 id FROM timesheets WHERE task_description = @task", { task: "Daily ticket triage and resolution work (sample data)" });
  if (!timesheetMarker) {
    for (let i = 0; i < 20; i++) {
      const userId = userIds[i % userIds.length];
      await q`
        INSERT INTO timesheets (user_id, date, login_time, logout_time, hours_worked, ticket_id, project_id, task_description, created_at)
        VALUES (${userId}, CONVERT(date, DATEADD(day, ${-(i % 10)}, SYSDATETIMEOFFSET())), '09:00', '18:00', 8,
          ${ticketIds[i % ticketIds.length]}, ${projectIds[i % projectIds.length]},
          'Daily ticket triage and resolution work (sample data)', SYSDATETIMEOFFSET())`;
    }
    console.log("Timesheets ready: 20");
  } else {
    console.log("Timesheets already seeded, skipping");
  }

  // 8. Documents - folder + 20 image files
  let folderId: number;
  const existingFolder = await one<{ id: number }>("SELECT TOP 1 id FROM document_folders WHERE name = @name", { name: "Sample Test Images" });
  if (existingFolder) {
    folderId = existingFolder.id;
  } else {
    const [row] = await q<{ id: number }>`
      INSERT INTO document_folders (name, parent_id, description, created_by_id, created_at, updated_at)
      OUTPUT INSERTED.id
      VALUES ('Sample Test Images', NULL, 'Auto-generated sample images for API testing', ${adminId}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
    folderId = row.id;
  }

  const fileMarker = await one<{ id: number }>("SELECT TOP 1 id FROM document_files WHERE folder_id = @folderId", { folderId });
  if (!fileMarker) {
    for (let i = 0; i < 20; i++) {
      const createdById = userIds[i % userIds.length];
      await q`
        INSERT INTO document_files (folder_id, name, file_name, mime_type, size_bytes, content_base64, description, created_by_id, created_at, updated_at)
        VALUES (${folderId}, ${`Sample Image ${i + 1}`}, ${`sample-${i + 1}.png`}, 'image/png', ${SAMPLE_IMAGE_BYTES},
          ${SAMPLE_IMAGE_BASE64}, ${"Auto-generated sample image for API testing"}, ${createdById}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
    }
    console.log("Document files ready: 20 (in 'Sample Test Images' folder)");
  } else {
    console.log("Document files already seeded, skipping");
  }

  console.log("Test data seed complete.");
  const pool = await getPool();
  await pool.close();
}

seedTestData().catch((error) => {
  console.error("Test data seed failed:", error);
  process.exit(1);
});
