// API CRUD smoke test: creates, reads, updates and deletes ~20 records per module
// against the running backend (http://localhost:6001) using real HTTP calls.
const BASE = process.env.API_BASE_URL ?? "http://localhost:6001";

const SAMPLE_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const SAMPLE_IMAGE_BYTES = Buffer.from(SAMPLE_IMAGE_BASE64, "base64").length;

let pass = 0;
let fail = 0;
const results = [];

function record(name, ok, detail) {
  if (ok) pass++; else fail++;
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

async function api(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

async function main() {
  // --- Auth ---
  const login = await api("POST", "/api/auth/login", null, { username: "EMP-001", password: "Admin@123" });
  record("Login as EMP-001", login.status === 200 && !!login.body?.token, `status=${login.status}`);
  const token = login.body?.token;
  if (!token) { console.error("Cannot continue without auth token"); printSummary(); process.exit(1); }

  // --- USERS: create 20, read, update, delete ---
  const userIds = [];
  for (let i = 0; i < 20; i++) {
    const code = `API-USR-${String(i + 1).padStart(3, "0")}`;
    const r = await api("POST", "/api/users", token, {
      employeeCode: code,
      name: `Test User ${i + 1}`,
      email: `test.user${i + 1}@company.com`,
      mobile: `98000000${String(i).padStart(2, "0")}`,
      designation: "QA Tester",
      role: "employee",
      password: "Test@1234",
      avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
    });
    if (r.status === 201 && r.body?.id) userIds.push(r.body.id);
  }
  record("Create 20 users", userIds.length === 20, `created=${userIds.length}`);

  const usersList = await api("GET", "/api/users", token);
  record("List users", usersList.status === 200 && Array.isArray(usersList.body), `count=${usersList.body?.length}`);

  if (userIds.length) {
    const upd = await api("PATCH", `/api/users/${userIds[0]}`, token, { designation: "Senior QA Tester" });
    record("Update user", upd.status === 200, `status=${upd.status}`);
  }
  if (userIds.length > 1) {
    const del = await api("DELETE", `/api/users/${userIds[userIds.length - 1]}`, token);
    record("Delete user", del.status === 200 || del.status === 204, `status=${del.status}`);
  }

  // --- TICKETS: create 20 (with image attachment each), read, update, delete ---
  const ticketIds = [];
  const subjects = [
    "Printer not working", "Wi-Fi connectivity issue", "New laptop request", "Outlook crash on startup",
    "VPN access request", "Software license renewal", "Monitor flickering", "ERP password reset",
    "Onboarding IT setup", "Shared drive permission issue", "Projector not connecting", "Email bounce errors",
    "CCTV camera offline", "Biometric device malfunction", "RAM upgrade request", "Internet speed issue",
    "AutoCAD installation request", "Mobile device enrollment", "Server backup failure", "Access card not working",
  ];
  for (let i = 0; i < 20; i++) {
    const r = await api("POST", "/api/tickets", token, {
      subject: `[API Test] ${subjects[i]}`,
      description: `${subjects[i]} - created via API CRUD test`,
      priority: ["low", "medium", "high", "critical"][i % 4],
      type: i % 2 === 0 ? "incident" : "service_request",
    });
    if (r.status === 201 && r.body?.id) ticketIds.push(r.body.id);
  }
  record("Create 20 tickets", ticketIds.length === 20, `created=${ticketIds.length}`);

  // attach an image to each created ticket
  let attachOk = 0;
  for (const id of ticketIds) {
    const r = await api("POST", `/api/tickets/${id}/attachments`, token, {
      files: [{ fileName: `ticket-${id}.png`, mimeType: "image/png", sizeBytes: SAMPLE_IMAGE_BYTES, contentBase64: SAMPLE_IMAGE_BASE64 }],
    });
    if (r.status === 201 || r.status === 200) attachOk++;
  }
  record("Attach image to each ticket", attachOk === ticketIds.length, `attached=${attachOk}/${ticketIds.length}`);

  const ticketsList = await api("GET", "/api/tickets", token);
  record("List tickets", ticketsList.status === 200 && Array.isArray(ticketsList.body), `count=${ticketsList.body?.length}`);

  if (ticketIds.length) {
    const upd = await api("PATCH", `/api/tickets/${ticketIds[0]}/status`, token, { status: "in_progress" });
    record("Update ticket status", upd.status === 200, `status=${upd.status}`);
  }
  if (ticketIds.length > 1) {
    const del = await api("DELETE", `/api/tickets/${ticketIds[ticketIds.length - 1]}`, token);
    record("Delete ticket", del.status === 200 || del.status === 204, `status=${del.status}`);
  }

  // --- PROJECTS: create 20, read, update, delete ---
  const projectIds = [];
  const projectTitles = [
    "Wi-Fi Expansion Phase 2", "ERP Finance Module Upgrade", "Data Center Cooling Overhaul", "Employee Mobile App",
    "CCTV Network Expansion", "Cloud Email Migration", "Biometric Attendance Rollout", "Website Revamp",
    "Disaster Recovery Setup", "Library System Upgrade", "HR Portal Enhancement", "Network Security Audit",
    "Smart Classroom Setup", "Procurement Automation", "Asset Management Implementation", "Video Conferencing Upgrade",
    "Student Information Migration", "Visitor Management Deployment", "Energy Monitoring Dashboard", "Helpdesk Enhancement",
  ];
  for (let i = 0; i < 20; i++) {
    const r = await api("POST", "/api/projects", token, {
      title: `[API Test] ${projectTitles[i]}`,
      description: `${projectTitles[i]} - created via API CRUD test`,
      priority: ["low", "medium", "high", "critical"][i % 4],
      category: ["Infrastructure", "Development", "Security", "Operations"][i % 4],
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      reviewFrequency: "monthly",
    });
    if (r.status === 201 && r.body?.id) projectIds.push(r.body.id);
    else if (r.status !== 201) record(`Create project ${i + 1}`, false, `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
  }
  record("Create 20 projects", projectIds.length === 20, `created=${projectIds.length}`);

  const projectsList = await api("GET", "/api/projects", token);
  record("List projects", projectsList.status === 200 && Array.isArray(projectsList.body), `status=${projectsList.status} detail=${JSON.stringify(projectsList.body).slice(0, 200)}`);

  if (projectIds.length) {
    const upd = await api("PATCH", `/api/projects/${projectIds[0]}`, token, { progress: 50 });
    record("Update project", upd.status === 200, `status=${upd.status} body=${JSON.stringify(upd.body).slice(0, 150)}`);
  }
  if (projectIds.length > 1) {
    const del = await api("DELETE", `/api/projects/${projectIds[projectIds.length - 1]}`, token);
    record("Delete project", del.status === 200 || del.status === 204, `status=${del.status}`);
  }

  // --- TODOS: create 20, read, update, delete ---
  const todoIds = [];
  const todoTitles = [
    "Follow up on hardware requests", "Prepare weekly ticket report", "Review SLA breaches", "Update asset inventory",
    "Schedule server maintenance", "Coordinate AMC renewal", "Audit user access", "Plan onboarding",
    "Verify backup logs", "Prepare project presentation", "Test DR failover", "Review project risks",
    "Update SOP documentation", "Check expiring licenses", "Coordinate review meeting", "Resolve reimbursements",
    "Review feedback survey", "Plan training session", "Update emergency contacts", "Verify CCTV retention",
  ];
  for (let i = 0; i < 20; i++) {
    const r = await api("POST", "/api/todos", token, {
      title: `[API Test] ${todoTitles[i]}`,
      description: `${todoTitles[i]} - created via API CRUD test`,
      priority: ["low", "medium", "high", "critical"][i % 4],
      type: ["personal", "team", "project"][i % 3],
      dueDate: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
    });
    if (r.status === 201 && r.body?.id) todoIds.push(r.body.id);
  }
  record("Create 20 todos", todoIds.length === 20, `created=${todoIds.length}`);

  const todosList = await api("GET", "/api/todos", token);
  record("List todos", todosList.status === 200 && Array.isArray(todosList.body), `count=${todosList.body?.length}`);

  if (todoIds.length) {
    const upd = await api("PATCH", `/api/todos/${todoIds[0]}`, token, { status: "completed" });
    record("Update todo", upd.status === 200, `status=${upd.status}`);
  }
  if (todoIds.length > 1) {
    const del = await api("DELETE", `/api/todos/${todoIds[todoIds.length - 1]}`, token);
    record("Delete todo", del.status === 200 || del.status === 204, `status=${del.status}`);
  }

  // --- CALENDAR EVENTS: create 20, read, update, delete ---
  const eventIds = [];
  const eventTitles = [
    "IT Sync-up Meeting", "Project Review Call", "Vendor Demo Session", "Quarterly Planning Meeting",
    "Department Townhall", "Server Maintenance Window", "Training Session", "Client Escalation Review",
    "Budget Review Meeting", "Security Audit Walkthrough", "Onboarding Session", "Performance Review",
    "Network Upgrade Planning", "Helpdesk Process Review", "Infrastructure Walkthrough", "Cross-team Call",
    "Compliance Review Meeting", "Asset Audit Session", "IT Updates Town Hall", "Year-end Wrap-up",
  ];
  for (let i = 0; i < 20; i++) {
    const start = new Date(Date.now() + (i + 1) * 86400000);
    const end = new Date(start.getTime() + 3600000);
    const r = await api("POST", "/api/calendar/events", token, {
      title: `[API Test] ${eventTitles[i]}`,
      description: `${eventTitles[i]} - created via API CRUD test`,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      type: ["meeting", "review", "training", "maintenance"][i % 4],
      meetingLink: `https://meet.google.com/test-${1000 + i}`,
    });
    if (r.status === 201 && r.body?.id) eventIds.push(r.body.id);
  }
  record("Create 20 calendar events", eventIds.length === 20, `created=${eventIds.length}`);

  const eventsList = await api("GET", "/api/calendar/events", token);
  record("List calendar events", eventsList.status === 200 && Array.isArray(eventsList.body), `count=${eventsList.body?.length}`);

  if (eventIds.length > 1) {
    const del = await api("DELETE", `/api/calendar/events/${eventIds[eventIds.length - 1]}`, token);
    record("Delete calendar event", del.status === 200 || del.status === 204, `status=${del.status}`);
  }

  // --- TIMESHEETS: create 20, read ---
  const timesheetIds = [];
  for (let i = 0; i < 20; i++) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const r = await api("POST", "/api/timesheets", token, {
      date,
      loginTime: "09:00",
      logoutTime: "18:00",
      hoursWorked: 8,
      taskDescription: `[API Test] Daily work log entry ${i + 1}`,
    });
    if (r.status === 201 && r.body?.id) timesheetIds.push(r.body.id);
  }
  record("Create 20 timesheets", timesheetIds.length === 20, `created=${timesheetIds.length}`);

  const timesheetsList = await api("GET", "/api/timesheets", token);
  record("List timesheets", timesheetsList.status === 200 && Array.isArray(timesheetsList.body), `count=${timesheetsList.body?.length}`);

  // --- DOCUMENTS: create folder + 20 image documents, read, update, delete ---
  const folderRes = await api("POST", "/api/document-folders", token, { name: "[API Test] Sample Images", description: "Created via API CRUD test" });
  record("Create document folder", folderRes.status === 201 && !!folderRes.body?.id, `status=${folderRes.status}`);
  const folderId = folderRes.body?.id;

  const docIds = [];
  for (let i = 0; i < 20; i++) {
    const r = await api("POST", "/api/documents", token, {
      name: `[API Test] Sample Image ${i + 1}`,
      folderId,
      fileName: `sample-${i + 1}.png`,
      mimeType: "image/png",
      sizeBytes: SAMPLE_IMAGE_BYTES,
      contentBase64: SAMPLE_IMAGE_BASE64,
      description: "Created via API CRUD test",
    });
    if (r.status === 201 && r.body?.id) docIds.push(r.body.id);
  }
  record("Create 20 documents with images", docIds.length === 20, `created=${docIds.length}`);

  const docsList = await api("GET", "/api/documents", token);
  record("List documents", docsList.status === 200 && Array.isArray(docsList.body), `count=${docsList.body?.length}`);

  if (docIds.length) {
    const upd = await api("PATCH", `/api/documents/${docIds[0]}`, token, { description: "Updated via API CRUD test" });
    record("Update document", upd.status === 200, `status=${upd.status}`);
  }
  if (docIds.length > 1) {
    const del = await api("DELETE", `/api/documents/${docIds[docIds.length - 1]}`, token);
    record("Delete document", del.status === 200 || del.status === 204, `status=${del.status}`);
  }

  printSummary();
}

function printSummary() {
  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${pass}, Failed: ${fail}`);
  if (fail) {
    console.log("\nFailed checks:");
    for (const r of results) if (!r.ok) console.log(` - ${r.name}: ${r.detail}`);
  }
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
