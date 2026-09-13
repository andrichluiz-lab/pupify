# Pupify Backend

Backend API for Pupify - Veterinary Clinic Management System, built with Fastify and Prisma.

## Tech Stack

- **Fastify** - Fast and low overhead web framework
- **Prisma** - Type-safe ORM for database access
- **PostgreSQL** - Database
- **TypeScript** - Type safety

## Setup

### Option 1: Using Docker (Recommended)

1. Install dependencies:
```bash
npm install
```

2. Start PostgreSQL with Docker Compose:
```bash
docker-compose up -d
```

3. Configure environment variables:
```bash
cp .env.example .env
```

The `.env.example` is already configured for the Docker PostgreSQL instance.

4. Run Prisma migrations:
```bash
npm run prisma:migrate
```

5. Generate Prisma client:
```bash
npm run prisma:generate
```

6. Start the development server:
```bash
npm run dev
```

### Option 2: Using Local PostgreSQL

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database connection string:
```
DATABASE_URL="postgresql://user:password@localhost:5432/pupify?schema=public"
PORT=3001
HOST=localhost
```

3. Run Prisma migrations:
```bash
npm run prisma:migrate
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Documentation

Swagger documentation is available at `http://localhost:3001/docs`

## Database Schema

The database schema includes:

- **Patients** - Animal patients with basic info, species, breed, etc.
- **Tutors** - Pet owners/clients
- **Veterinarians** - Clinic staff
- **Appointments** - Scheduled appointments
- **Hospitalizations** - Patient hospitalizations with vitals and treatment orders
- **Medical Records** - Patient medical history with SOAP notes and prescriptions
- **Inventory** - Stock management for medications, vaccines, supplies
- **Financial Transactions** - Income and expense tracking
- **Surgeries** - Surgical procedures with checklists

## API Endpoints

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get single patient
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `GET /api/tutors` - List all tutors
- `GET /api/veterinarians` - List all veterinarians

### Appointments
- `GET /api/appointments` - List all appointments
- `GET /api/appointments/today` - Get today's appointments
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Hospitalizations
- `GET /api/hospitalizations` - List all hospitalizations
- `GET /api/hospitalizations/details` - List with vitals and orders
- `GET /api/hospitalizations/:id` - Get single hospitalization
- `POST /api/hospitalizations` - Create hospitalization
- `PUT /api/hospitalizations/:id` - Update hospitalization

### Medical Records
- `GET /api/medical-records` - List all medical records
- `GET /api/medical-records/:id` - Get single medical record
- `POST /api/medical-records` - Create medical record
- `PUT /api/medical-records/:id` - Update medical record

### Inventory
- `GET /api/inventory` - List all inventory items
- `GET /api/inventory/:id` - Get single item
- `POST /api/inventory` - Create item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

### Financial

### Stop Docker PostgreSQL
```bash
docker-compose down
```

### View Docker Logs
```bash
docker-compose logs -f postgres
```
- `GET /api/financial/transactions` - List all transactions
- `GET /api/financial/transactions/:id` - Get single transaction
- `POST /api/financial/transactions` - Create transaction
- `PUT /api/financial/transactions/:id` - Update transaction

### Surgeries
- `GET /api/surgeries` - List all surgeries
- `GET /api/surgeries/:id` - Get single surgery
- `POST /api/surgeries` - Create surgery
- `PUT /api/surgeries/:id` - Update surgery

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/revenue` - Get revenue series data

## Development

### Build
```bash
npm run build
```

### Production Start
```bash
npm start
```

### Prisma Studio (Database GUI)
```bash
npm run prisma:studio
```

### Seed Database
```bash
npm run prisma:seed
```
