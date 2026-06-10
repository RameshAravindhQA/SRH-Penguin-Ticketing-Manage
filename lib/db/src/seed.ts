import bcrypt from "bcryptjs";
import { q, qRaw, getPool } from "./index.js";

async function one<T extends Record<string, any>>(sql: string, params: Record<string, any>): Promise<T> {
  const rows = await qRaw<T>(sql, params);
  return rows[0];
}

async function ensureDepartment(name: string, description: string) {
  const existing = await one<{ id: number }>("SELECT TOP 1 id FROM departments WHERE name = @name", { name });
  if (existing) return existing.id;
  const [row] = await q<{ id: number }>`
    INSERT INTO departments (name, description, ticket_enabled, is_housekeeping, created_at, updated_at)
    OUTPUT INSERTED.id
    VALUES (${name}, ${description}, 1, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  return row.id;
}

async function ensureRole(name: string, description: string, level: number) {
  const existing = await one<{ id: number }>("SELECT TOP 1 id FROM roles WHERE name = @name", { name });
  if (existing) return existing.id;
  const [row] = await q<{ id: number }>`
    INSERT INTO roles (name, description, level, created_at, updated_at)
    OUTPUT INSERTED.id
    VALUES (${name}, ${description}, ${level}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  return row.id;
}

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
}) {
  const existing = await one<{ id: number }>("SELECT TOP 1 id FROM users WHERE employee_code = @employeeCode", input);
  if (existing) return existing.id;
  const [row] = await q<{ id: number }>`
    INSERT INTO users (employee_code, name, email, password_hash, mobile, department_id, designation, role, role_id,
      reporting_manager_id, status, is_hardware_user, is_call_center_user, created_at, updated_at)
    OUTPUT INSERTED.id
    VALUES (${input.employeeCode}, ${input.name}, ${input.email}, ${input.passwordHash}, ${input.mobile},
      ${input.departmentId}, ${input.designation}, ${input.role}, ${input.roleId}, ${input.reportingManagerId ?? null},
      'active', 0, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  return row.id;
}

async function ensureCategory(name: string, type: string, description: string) {
  const existing = await one<{ id: number }>("SELECT TOP 1 id FROM categories WHERE name = @name AND type = @type", { name, type });
  if (existing) return existing.id;
  const [row] = await q<{ id: number }>`
    INSERT INTO categories (name, type, description, status, created_at, updated_at)
    OUTPUT INSERTED.id
    VALUES (${name}, ${type}, ${description}, 'active', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  return row.id;
}

async function ensureSubCategory(name: string, categoryId: number, type: string, description: string) {
  const existing = await one<{ id: number }>("SELECT TOP 1 id FROM sub_categories WHERE name = @name AND category_id = @categoryId", { name, categoryId });
  if (existing) return existing.id;
  const [row] = await q<{ id: number }>`
    INSERT INTO sub_categories (name, category_id, type, description, created_at, updated_at)
    OUTPUT INSERTED.id
    VALUES (${name}, ${categoryId}, ${type}, ${description}, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  return row.id;
}

async function seed() {
  console.log("Seeding SQL Server database...");

  const itDept = await ensureDepartment("Information Technology", "IT Support & Infrastructure");
  const hrDept = await ensureDepartment("Human Resources", "HR and People Operations");
  const financeDept = await ensureDepartment("Finance", "Finance and Accounting");
  const opsDept = await ensureDepartment("Operations", "Business Operations");

  const adminRole = await ensureRole("Administrator", "Full system access", 1);
  const teamLeadRole = await ensureRole("Team Lead", "Can manage team assignments", 2);
  const memberRole = await ensureRole("Member", "Standard employee access", 3);
  await ensureRole("Viewer", "Read-only access", 4);

  const adminHash = await bcrypt.hash("Admin@123", 12);
  const userHash = await bcrypt.hash("User@123", 12);

  const adminId = await ensureUser({ employeeCode: "EMP-001", name: "System Administrator", email: "admin@company.com", passwordHash: adminHash, mobile: "9900000001", departmentId: itDept, designation: "System Administrator", role: "admin", roleId: adminRole });
  const teamLeadId = await ensureUser({ employeeCode: "EMP-002", name: "Rajesh Kumar", email: "rajesh@company.com", passwordHash: adminHash, mobile: "9900000002", departmentId: itDept, designation: "Team Lead", role: "team_lead", roleId: teamLeadRole, reportingManagerId: adminId });
  const aliceId = await ensureUser({ employeeCode: "EMP-003", name: "Alice Johnson", email: "alice@company.com", passwordHash: userHash, mobile: "9900000003", departmentId: itDept, designation: "Senior Developer", role: "employee", roleId: memberRole, reportingManagerId: teamLeadId });
  const bobId = await ensureUser({ employeeCode: "EMP-004", name: "Bob Smith", email: "bob@company.com", passwordHash: userHash, mobile: "9900000004", departmentId: hrDept, designation: "HR Manager", role: "manager", roleId: memberRole, reportingManagerId: adminId });
  const carolId = await ensureUser({ employeeCode: "EMP-005", name: "Carol Davis", email: "carol@company.com", passwordHash: userHash, mobile: "9900000005", departmentId: financeDept, designation: "Finance Analyst", role: "employee", roleId: memberRole, reportingManagerId: bobId });
  const daveId = await ensureUser({ employeeCode: "EMP-006", name: "Dave Wilson", email: "dave@company.com", passwordHash: userHash, mobile: "9900000006", departmentId: opsDept, designation: "Operations Manager", role: "manager", roleId: memberRole, reportingManagerId: adminId });

  const hwCat = await ensureCategory("Hardware", "ticket", "Hardware issues and requests");
  const swCat = await ensureCategory("Software", "ticket", "Software installation and bugs");
  const netCat = await ensureCategory("Network", "ticket", "Network connectivity issues");
  const emailCat = await ensureCategory("Email", "ticket", "Email and communication issues");
  const infraCat = await ensureCategory("Infrastructure", "project", "Infrastructure projects");
  const securityCat = await ensureCategory("Security", "project", "Security projects");

  for (const type of [
    { name: "Normal Ticket", code: "normal", description: "One-time ticket routed to a worklist" },
    { name: "Routine Ticket", code: "routine", description: "Recurring ticket for scheduled work" },
  ]) {
    const exists = await one<{ id: number }>("SELECT TOP 1 id FROM ticket_types WHERE code = @code", type);
    if (!exists) {
      await q`INSERT INTO ticket_types (name, code, description, status, created_at, updated_at)
              VALUES (${type.name}, ${type.code}, ${type.description}, 'active', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
    }
  }

  await ensureSubCategory("Laptop / Desktop", hwCat, "ticket", "Endpoint hardware support");
  await ensureSubCategory("License Request", swCat, "ticket", "Software licensing and access");
  await ensureSubCategory("VPN / Wi-Fi", netCat, "ticket", "Connectivity and remote access");
  await ensureSubCategory("Mailbox Setup", emailCat, "ticket", "Email account configuration");
  await ensureSubCategory("Network Upgrade", infraCat, "project", "Network and infrastructure upgrade projects");
  await ensureSubCategory("Security Review", securityCat, "project", "Security assessment and remediation projects");

  const ticketExists = await one<{ id: number }>("SELECT TOP 1 id FROM tickets WHERE ticket_no = @ticketNo", { ticketNo: "TKT-1001" });
  if (!ticketExists) {
    await q`
      INSERT INTO tickets (ticket_no, subject, description, status, priority, type, category_id, created_by_id, assigned_to_id, due_date, created_at, updated_at)
      VALUES
      ('TKT-1001', 'Cannot access shared drive on network', 'Finance users cannot access the shared drive after maintenance.', 'in_progress', 'high', 'incident', ${netCat}, ${carolId}, ${aliceId}, DATEADD(day, 2, SYSDATETIMEOFFSET()), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
      ('TKT-1002', 'Request for Microsoft Office 365 license', 'New employee requires Office 365 subscription.', 'open', 'medium', 'service_request', ${swCat}, ${bobId}, ${adminId}, DATEADD(day, 5, SYSDATETIMEOFFSET()), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
      ('TKT-1003', 'Laptop screen flickering issue', 'Laptop screen started flickering randomly since last week.', 'pending', 'medium', 'incident', ${hwCat}, ${daveId}, ${teamLeadId}, DATEADD(day, 3, SYSDATETIMEOFFSET()), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
      ('TKT-1004', 'Email configuration for new employees', 'Set up corporate email accounts for new joiners.', 'yts', 'high', 'service_request', ${emailCat}, ${bobId}, NULL, DATEADD(day, 1, SYSDATETIMEOFFSET()), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  }

  const projectExists = await one<{ id: number }>("SELECT TOP 1 id FROM projects WHERE project_no = @projectNo", { projectNo: "PRJ-1001" });
  if (!projectExists) {
    await q`
      INSERT INTO projects (project_no, title, description, status, priority, category, progress, owner_id, process_owner_id, start_date, end_date, review_frequency, created_at, updated_at)
      VALUES
      ('PRJ-1001', 'IT Infrastructure Upgrade 2026', 'Network infrastructure upgrade including switches, routers, and cabling.', 'in_progress', 'high', 'Infrastructure', 45, ${teamLeadId}, ${adminId}, '2026-01-01', '2026-06-30', 'weekly', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
      ('PRJ-1002', 'Employee Self-Service Portal', 'Internal portal for HR self-service requests and approvals.', 'in_progress', 'medium', 'Development', 70, ${aliceId}, ${bobId}, '2026-02-01', '2026-05-31', 'bi-weekly', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  }

  const todoExists = await one<{ id: number }>("SELECT TOP 1 id FROM todos WHERE title = @title", { title: "Review TKT-1001 resolution notes" });
  if (!todoExists) {
    await q`
      INSERT INTO todos (title, priority, type, created_by_id, due_date, created_at, updated_at)
      VALUES
      ('Review TKT-1001 resolution notes', 'high', 'personal', ${adminId}, DATEADD(day, 1, SYSDATETIMEOFFSET()), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()),
      ('Schedule weekly team standup', 'medium', 'team', ${teamLeadId}, DATEADD(day, 2, SYSDATETIMEOFFSET()), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())`;
  }

  const notificationExists = await one<{ id: number }>("SELECT TOP 1 id FROM notifications WHERE user_id = @userId AND entity_ref = @entityRef", { userId: adminId, entityRef: "TKT-1002" });
  if (!notificationExists) {
    await q`
      INSERT INTO notifications (user_id, type, message, entity_type, entity_ref, is_read, created_at)
      VALUES
      (${adminId}, 'ticket_assigned', 'TKT-1002 has been assigned to you', 'ticket', 'TKT-1002', 0, SYSDATETIMEOFFSET()),
      (${aliceId}, 'ticket_assigned', 'TKT-1001 has been assigned to you', 'ticket', 'TKT-1001', 0, SYSDATETIMEOFFSET())`;
  }

  const eventExists = await one<{ id: number }>("SELECT TOP 1 id FROM calendar_events WHERE user_id = @userId AND title = @title", { userId: adminId, title: "Weekly IT Review Meeting" });
  if (!eventExists) {
    await q`
      INSERT INTO calendar_events (user_id, title, description, start_date, end_date, type, meeting_link, created_at)
      VALUES (${adminId}, 'Weekly IT Review Meeting', 'Review all open tickets and project progress', DATEADD(day, 1, SYSDATETIMEOFFSET()), DATEADD(hour, 25, SYSDATETIMEOFFSET()), 'meeting', 'https://meet.google.com/abc-defg-hij', SYSDATETIMEOFFSET())`;
  }

  const timesheetExists = await one<{ id: number }>("SELECT TOP 1 id FROM timesheets WHERE user_id = @userId AND date = CONVERT(date, SYSDATETIMEOFFSET())", { userId: adminId });
  if (!timesheetExists) {
    await q`
      INSERT INTO timesheets (user_id, date, login_time, logout_time, hours_worked, task_description, created_at)
      VALUES (${adminId}, CONVERT(date, SYSDATETIMEOFFSET()), '09:00', '18:00', 8, 'Ticket triage and system monitoring', SYSDATETIMEOFFSET())`;
  }

  console.log("Seed complete.");
  const pool = await getPool();
  await pool.close();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
