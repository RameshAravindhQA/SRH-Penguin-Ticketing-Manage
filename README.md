# SRH Penguin Ticket Management System

## Launching on Another Computer

Follow these steps on a fresh Windows, macOS, or Linux computer.

### 1. Install prerequisites

Install these tools first:

- Node.js 20 or newer
- pnpm 10 or newer
- Git
- PostgreSQL 14 or newer

Check the installs:

```bash
node -v
pnpm -v
git --version
psql --version
```

If pnpm is not installed, install it with:

```bash
npm install -g pnpm
```

### 2. Clone the project

```bash
git clone https://github.com/RameshAravindhQA/SRH-Penguin-Ticketing-Manage.git
cd SRH-Penguin-Ticketing-Manage
```

To use the development branch:

```bash
git checkout dev
```

### 3. Create the local environment file

Copy the example file to `.env.local`.

Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

macOS or Linux:

```bash
cp .env.local.example .env.local
```

Default local values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/penguin
POSTGRES_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres
BACKEND_PORT=6001
FRONTEND_PORT=6002
BASE_PATH=/
VITE_API_BASE_URL=http://localhost:6001
```

Update the PostgreSQL username, password, host, or port if your local PostgreSQL setup is different.

### 4. Start PostgreSQL

Make sure PostgreSQL is running before database setup.

On Windows, you can usually start it from the Services app or from pgAdmin. On macOS or Linux, use your normal PostgreSQL service command.

Confirm the admin connection works:

```bash
psql postgresql://postgres:postgres@localhost:5432/postgres
```

Exit `psql` with:

```sql
\q
```

### 5. Install dependencies and prepare the database

Run the full local setup:

```bash
pnpm run setup:local
```

This command installs dependencies, creates the `penguin` database if needed, pushes the database schema, and seeds starter data.

If you need to run the steps manually:

```bash
pnpm install
pnpm run db:create
pnpm run db:push
pnpm run db:seed
```

### 6. Start the system

Start both backend and frontend together:

```bash
pnpm run dev
```

Open the app:

```text
http://localhost:6002
```

Backend API health check:

```text
http://localhost:6001/api/healthz
```

### 7. Login

Use the seeded admin account:

```text
Username: EMP-001
Password: Admin@123
```

### Useful Commands

Run only the backend:

```bash
pnpm run dev:backend
```

Run only the frontend:

```bash
pnpm run dev:frontend
```

Build and typecheck the project:

```bash
pnpm run build
```

### Troubleshooting

If `pnpm run setup:local` cannot connect to PostgreSQL, check that PostgreSQL is running and that `.env.local` has the correct username and password.

If port `6001` or `6002` is already used, change `BACKEND_PORT`, `FRONTEND_PORT`, and `VITE_API_BASE_URL` in `.env.local`.

If the database already exists and you only need to refresh tables and seed data, run:

```bash
pnpm run db:push
pnpm run db:seed
```

