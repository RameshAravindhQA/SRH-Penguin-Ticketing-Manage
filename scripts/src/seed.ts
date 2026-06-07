import { db, usersTable, departmentsTable, rolesTable, categoriesTable, ticketsTable, projectsTable, todosTable, notificationsTable, calendarEventsTable, timesheetsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Departments
  const [itDept, hrDept, financeDept, opsDept] = await db.insert(departmentsTable).values([
    { name: "Information Technology", description: "IT Support & Infrastructure" },
    { name: "Human Resources", description: "HR and People Operations" },
    { name: "Finance", description: "Finance and Accounting" },
    { name: "Operations", description: "Business Operations" },
  ]).returning().onConflictDoNothing();

  // Roles
  const [adminRole, teamLeadRole, memberRole, viewerRole] = await db.insert(rolesTable).values([
    { name: "Administrator", description: "Full system access", level: 1 },
    { name: "Team Lead", description: "Can manage team assignments", level: 2 },
    { name: "Member", description: "Standard employee access", level: 3 },
    { name: "Viewer", description: "Read-only access", level: 4 },
  ]).returning().onConflictDoNothing();

  // Users
  const adminHash = await bcrypt.hash("Admin@123", 12);
  const userHash = await bcrypt.hash("User@123", 12);

  const [admin, teamLead, alice, bob, carol, dave] = await db.insert(usersTable).values([
    {
      employeeCode: "EMP-001",
      name: "System Administrator",
      email: "admin@company.com",
      passwordHash: adminHash,
      mobile: "9900000001",
      departmentId: itDept?.id ?? 1,
      designation: "System Administrator",
      role: "admin",
      roleId: adminRole?.id ?? 1,
      status: "active",
    },
    {
      employeeCode: "EMP-002",
      name: "Rajesh Kumar",
      email: "rajesh@company.com",
      passwordHash: adminHash,
      mobile: "9900000002",
      departmentId: itDept?.id ?? 1,
      designation: "Team Lead",
      role: "team_lead",
      roleId: teamLeadRole?.id ?? 2,
      status: "active",
    },
    {
      employeeCode: "EMP-003",
      name: "Alice Johnson",
      email: "alice@company.com",
      passwordHash: userHash,
      mobile: "9900000003",
      departmentId: itDept?.id ?? 1,
      designation: "Senior Developer",
      role: "employee",
      roleId: memberRole?.id ?? 3,
      status: "active",
    },
    {
      employeeCode: "EMP-004",
      name: "Bob Smith",
      email: "bob@company.com",
      passwordHash: userHash,
      mobile: "9900000004",
      departmentId: hrDept?.id ?? 2,
      designation: "HR Manager",
      role: "manager",
      roleId: memberRole?.id ?? 3,
      status: "active",
    },
    {
      employeeCode: "EMP-005",
      name: "Carol Davis",
      email: "carol@company.com",
      passwordHash: userHash,
      mobile: "9900000005",
      departmentId: financeDept?.id ?? 3,
      designation: "Finance Analyst",
      role: "employee",
      roleId: memberRole?.id ?? 3,
      status: "active",
    },
    {
      employeeCode: "EMP-006",
      name: "Dave Wilson",
      email: "dave@company.com",
      passwordHash: userHash,
      mobile: "9900000006",
      departmentId: opsDept?.id ?? 4,
      designation: "Operations Manager",
      role: "manager",
      roleId: memberRole?.id ?? 3,
      status: "active",
    },
  ]).returning().onConflictDoNothing();

  // Categories
  const [hwCat, swCat, netCat, emailCat, hrCat] = await db.insert(categoriesTable).values([
    { name: "Hardware", type: "ticket", description: "Hardware issues and requests" },
    { name: "Software", type: "ticket", description: "Software installation and bugs" },
    { name: "Network", type: "ticket", description: "Network connectivity issues" },
    { name: "Email", type: "ticket", description: "Email and communication issues" },
    { name: "HR Services", type: "ticket", description: "HR-related service requests" },
  ]).returning().onConflictDoNothing();

  const adminId = admin?.id ?? 1;
  const teamLeadId = teamLead?.id ?? 2;
  const aliceId = alice?.id ?? 3;
  const bobId = bob?.id ?? 4;
  const carolId = carol?.id ?? 5;
  const daveId = dave?.id ?? 6;
  const swCatId = swCat?.id ?? 2;
  const netCatId = netCat?.id ?? 3;
  const hwCatId = hwCat?.id ?? 1;
  const emailCatId = emailCat?.id ?? 4;

  // Tickets
  const tickets = await db.insert(ticketsTable).values([
    {
      ticketNo: "TKT-1001",
      subject: "Cannot access shared drive on network",
      description: "Users in Finance dept cannot access the shared drive after the network maintenance.",
      status: "in_progress",
      priority: "high",
      type: "incident",
      categoryId: netCatId,
      createdById: carolId,
      assignedToId: aliceId,
      dueDate: new Date(Date.now() + 2 * 86400000),
    },
    {
      ticketNo: "TKT-1002",
      subject: "Request for Microsoft Office 365 license",
      description: "New employee Dave Wilson requires Office 365 subscription.",
      status: "open",
      priority: "medium",
      type: "service_request",
      categoryId: swCatId,
      createdById: bobId,
      assignedToId: adminId,
      dueDate: new Date(Date.now() + 5 * 86400000),
    },
    {
      ticketNo: "TKT-1003",
      subject: "Laptop screen flickering issue",
      description: "Laptop screen started flickering randomly since last week.",
      status: "pending",
      priority: "medium",
      type: "incident",
      categoryId: hwCatId,
      createdById: daveId,
      assignedToId: teamLeadId,
      dueDate: new Date(Date.now() + 3 * 86400000),
    },
    {
      ticketNo: "TKT-1004",
      subject: "Email configuration for new employees",
      description: "Set up corporate email accounts for 3 new joiners this week.",
      status: "yts",
      priority: "high",
      type: "service_request",
      categoryId: emailCatId,
      createdById: bobId,
      dueDate: new Date(Date.now() + 1 * 86400000),
    },
    {
      ticketNo: "TKT-1005",
      subject: "VPN access not working from home",
      description: "Cannot connect to corporate VPN from home network, getting timeout errors.",
      status: "completed",
      priority: "high",
      type: "incident",
      categoryId: netCatId,
      createdById: aliceId,
      assignedToId: adminId,
      resolvedAt: new Date(Date.now() - 86400000),
    },
    {
      ticketNo: "TKT-1006",
      subject: "Software upgrade request — Visual Studio Code",
      description: "Request to upgrade VSCode to latest version on dev machines.",
      status: "closed",
      priority: "low",
      type: "change_request",
      categoryId: swCatId,
      createdById: aliceId,
      assignedToId: aliceId,
      closedAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      ticketNo: "TKT-1007",
      subject: "Printer not responding on 2nd floor",
      description: "The shared printer on Floor 2 is not responding to print jobs.",
      status: "open",
      priority: "low",
      type: "incident",
      categoryId: hwCatId,
      createdById: carolId,
      dueDate: new Date(Date.now() + 4 * 86400000),
    },
    {
      ticketNo: "TKT-1008",
      subject: "Database backup failure alert",
      description: "Automated backup job failed last night. Need immediate investigation.",
      status: "in_progress",
      priority: "high",
      type: "incident",
      categoryId: swCatId,
      createdById: adminId,
      assignedToId: aliceId,
      slaBreached: true,
    },
  ]).returning().onConflictDoNothing();

  // Projects
  const projects = await db.insert(projectsTable).values([
    {
      projectNo: "PRJ-1001",
      title: "IT Infrastructure Upgrade 2026",
      description: "Complete overhaul of network infrastructure including new switches, routers, and cabling.",
      status: "in_progress",
      priority: "high",
      category: "Infrastructure",
      progress: 45,
      ownerId: teamLeadId,
      processOwnerId: adminId,
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      reviewFrequency: "weekly",
    },
    {
      projectNo: "PRJ-1002",
      title: "Employee Self-Service Portal",
      description: "Build an internal portal for HR self-service requests and approvals.",
      status: "in_progress",
      priority: "medium",
      category: "Development",
      progress: 70,
      ownerId: aliceId,
      processOwnerId: bobId,
      startDate: "2026-02-01",
      endDate: "2026-05-31",
      reviewFrequency: "bi-weekly",
    },
    {
      projectNo: "PRJ-1003",
      title: "Cybersecurity Awareness Training",
      description: "Company-wide cybersecurity awareness training programme for all employees.",
      status: "created",
      priority: "high",
      category: "Training",
      progress: 10,
      ownerId: adminId,
      startDate: "2026-04-01",
      endDate: "2026-07-31",
    },
    {
      projectNo: "PRJ-1004",
      title: "Cloud Migration Phase 1",
      description: "Migrate on-premise servers to AWS cloud infrastructure.",
      status: "completed",
      priority: "high",
      category: "Infrastructure",
      progress: 100,
      ownerId: teamLeadId,
      startDate: "2025-10-01",
      endDate: "2026-03-31",
    },
  ]).returning().onConflictDoNothing();

  // Todos
  await db.insert(todosTable).values([
    { title: "Review TKT-1001 resolution notes", priority: "high", type: "personal", createdById: adminId, dueDate: new Date(Date.now() + 86400000) },
    { title: "Schedule weekly team standup", priority: "medium", type: "team", createdById: teamLeadId, dueDate: new Date(Date.now() + 2 * 86400000) },
    { title: "Update project PRJ-1001 progress", priority: "medium", type: "personal", createdById: teamLeadId },
    { title: "Prepare Q2 IT budget report", priority: "high", type: "personal", createdById: adminId, dueDate: new Date(Date.now() + 7 * 86400000) },
    { title: "Review new employee onboarding checklist", priority: "low", type: "team", createdById: bobId, dueDate: new Date(Date.now() + 3 * 86400000) },
  ]).onConflictDoNothing();

  // Notifications
  await db.insert(notificationsTable).values([
    { userId: adminId, type: "ticket_assigned", message: "TKT-1002 has been assigned to you", entityType: "ticket", entityRef: "TKT-1002" },
    { userId: adminId, type: "sla_breach", message: "TKT-1008 has breached SLA — immediate attention required", entityType: "ticket", entityRef: "TKT-1008" },
    { userId: adminId, type: "project_update", message: "PRJ-1001 progress updated to 45%", entityType: "project", entityRef: "PRJ-1001" },
    { userId: adminId, type: "ticket_status_changed", message: "TKT-1005 has been marked as Completed", entityType: "ticket", entityRef: "TKT-1005" },
    { userId: teamLeadId, type: "ticket_assigned", message: "TKT-1003 has been assigned to you", entityType: "ticket", entityRef: "TKT-1003" },
    { userId: teamLeadId, type: "ticket_forwarded", message: "TKT-1007 has been forwarded to your team", entityType: "ticket", entityRef: "TKT-1007" },
    { userId: aliceId, type: "ticket_assigned", message: "TKT-1001 has been assigned to you", entityType: "ticket", entityRef: "TKT-1001" },
    { userId: aliceId, type: "ticket_assigned", message: "TKT-1008 has been assigned to you — HIGH PRIORITY", entityType: "ticket", entityRef: "TKT-1008" },
  ]).onConflictDoNothing();

  // Calendar Events
  const now = new Date();
  await db.insert(calendarEventsTable).values([
    {
      userId: adminId,
      title: "Weekly IT Review Meeting",
      description: "Review all open tickets and project progress",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0),
      type: "meeting",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    },
    {
      userId: adminId,
      title: "PRJ-1001 Sprint Review",
      description: "Infrastructure upgrade sprint review and demo",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 14, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 15, 30),
      type: "meeting",
      entityType: "project",
      entityRef: "PRJ-1001",
    },
    {
      userId: adminId,
      title: "TKT-1008 SLA Escalation Deadline",
      description: "Database backup failure must be resolved by this date",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0),
      type: "reminder",
      entityType: "ticket",
      entityRef: "TKT-1008",
    },
    {
      userId: adminId,
      title: "Q2 Planning Session",
      description: "Quarterly planning and roadmap discussion",
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 9, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 12, 0),
      type: "meeting",
    },
  ]).onConflictDoNothing();

  // Timesheets
  const dateStr = (offset: number) => {
    const d = new Date(Date.now() - offset * 86400000);
    return d.toISOString().split("T")[0];
  };
  await db.insert(timesheetsTable).values([
    { userId: adminId, date: dateStr(0), loginTime: "09:00", logoutTime: "18:00", hoursWorked: 8, taskDescription: "Ticket triage and system monitoring" },
    { userId: adminId, date: dateStr(1), loginTime: "09:15", logoutTime: "18:30", hoursWorked: 8.5, taskDescription: "PRJ-1001 review and coordination" },
    { userId: adminId, date: dateStr(2), loginTime: "09:00", logoutTime: "17:30", hoursWorked: 7.5, taskDescription: "Network maintenance planning" },
    { userId: aliceId, date: dateStr(0), loginTime: "09:30", logoutTime: "18:30", hoursWorked: 8, taskDescription: "TKT-1001 investigation and resolution" },
    { userId: aliceId, date: dateStr(1), loginTime: "09:00", logoutTime: "18:00", hoursWorked: 8, taskDescription: "PRJ-1002 development tasks" },
  ]).onConflictDoNothing();

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
