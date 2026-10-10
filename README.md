# FindH

### Rental property verification with local agents

FindH connects tenants with nearby agents who can inspect rental properties. It brings listings, bookings, verification documents and administrator review into one application, with separate workflows for tenants, agents and administrators.

[Live website](https://findh.vercel.app) · [Developer portfolio](https://shashipreetham.netlify.app/projects)

## The idea

Checking a rental property is difficult when you are not nearby. FindH explores a practical solution: let a local agent visit the property and submit supporting documents for review, so tenants can access verification information remotely.

## Features

- **Property listings:** submit rental details, addresses and images, and browse individual listings.
- **Agent discovery:** find nearby agents using location-based matching and address geocoding.
- **Role-specific workflows:** separate tenant, agent and administrator interfaces.
- **Bookings and verification:** create requests, let agents accept work and track progress.
- **Document review:** upload supporting files and manage administrator approval of verification results.
- **Notifications:** database-backed notifications and Socket.IO updates when running the persistent backend.
- **Account management:** JWT authentication, profiles, email OTP and password recovery.
- **Support:** contact forms, support tickets and reviews.
- **Demo payments:** simulate payment status within the booking workflow.

> Payments are currently a demonstration workflow. The Stripe dependency does not mean live payment processing is implemented.

## Typical workflow

1. A tenant creates an account and adds or selects a property listing.
2. The tenant finds an agent or starts a verification request.
3. The application records the booking and demonstration payment status.
4. An agent accepts the work and uploads verification documents.
5. An administrator reviews the submission, and the tenant accesses the verification information.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, JavaScript, CSS |
| Animation | Framer Motion, GSAP |
| Backend | Node.js, Express 5 |
| Database and storage | Supabase PostgreSQL, Supabase Storage |
| Authentication | JSON Web Tokens, bcrypt/bcryptjs |
| Live updates | Socket.IO |
| File processing | Multer, Sharp |
| Email | Nodemailer |
| Geocoding | Google Geocoding API, Nominatim fallback |
| Deployment configuration | Vercel |

Authentication uses custom Express handlers, JWTs and application database records. Supabase provides the database and file storage; sign-in is not implemented through Supabase Auth.

## Architecture

```text
Tenant / Agent / Administrator
             |
      Next.js frontend
             |
      Express REST API -------- Email and geocoding services
             |
      Supabase PostgreSQL
      Supabase Storage

Persistent Node.js server <-- Socket.IO --> Frontend
```

`backend/app.js` configures the REST API. `backend/server.js` starts the HTTP server and authenticated socket connections. The frontend reads its API address from `frontend/lib/api.js`.

## Repository structure

```text
FindH/
├── frontend/
│   ├── app/                 # Pages and layouts
│   ├── components/          # Shared UI and route guards
│   ├── context/             # Application state and sockets
│   ├── hooks/               # Shared hooks
│   ├── lib/api.js           # Backend URL configuration
│   └── package.json
├── backend/
│   ├── api/index.js         # Vercel API entry point
│   ├── app.js               # Express application
│   ├── server.js            # HTTP and Socket.IO server
│   ├── controllers/         # Application workflows
│   ├── routes/              # API routes
│   ├── middlewares/         # Authentication and uploads
│   ├── utils/               # Supabase, geocoding and sockets
│   ├── create_tables.js
│   ├── create_verification_table.js
│   └── update_schema.js
└── README.md
```

## Local setup

### Prerequisites

- Node.js compatible with Next.js 16, npm and Git.
- A Supabase project with the application's database schema and storage buckets.
- A Gmail account with an app password for the current email transport configuration.
- Optional Google Geocoding credentials; the code includes a Nominatim fallback.

### 1. Clone the repository

```bash
git clone https://github.com/Shashiawari/FindH.git
cd FindH
```

### 2. Configure environment variables

Create `backend/.env` with these variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port; defaults to `5000` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase service-role key |
| `JWT_SECRET` | A long, random signing secret |
| `SMTP_USER` | Email account used by Nodemailer |
| `SMTP_PASS` | Email app password |
| `GOOGLE_API_KEY` | Optional Google Geocoding API key |

Keep backend credentials out of version control and out of frontend variables. The service-role key must remain server-side.

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000
```

The current OTP controller configures Nodemailer with Gmail. Change the transport configuration in the email controllers if using another provider.

### 3. Prepare Supabase

The application expects an existing schema for users, agents, listings, bookings and document records. Other workflows use verification requests, agent responses, notifications, OTPs, contact and support records.

The repository includes partial schema helpers:

- `backend/create_tables.js`: contact and support tables.
- `backend/create_verification_table.js`: verification and administration tables.
- `backend/update_schema.js`: additional schema changes.

**These are not a complete, ordered migration set for a fresh database.** Review the SQL and controller queries before running the application. Some helpers attempt to call an `exec_sql` database function, which is not automatically supplied by Supabase; they may print SQL for manual execution when that call fails.

Configure the `room-images` bucket for listing images and the `documents` bucket for verification files. Listing code uses public image URLs; document routes generate signed URLs. Review bucket access rules alongside the application routes.

### 4. Start the backend

```bash
cd backend
npm install
npm start
```

The default address is `http://localhost:5000`. Visit `http://localhost:5000/health` to check that the server responds.

The repository also has an `npm run dev` script, but `nodemon` is not declared in its dependencies. To use that script, install it first:

```bash
npm install --save-dev nodemon
npm run dev
```

### 5. Start the frontend

In another terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## API areas

| Base path | Purpose |
| --- | --- |
| `/health` | HTTP health check |
| `/api/auth` | Authentication |
| `/api/otp` | OTP workflows |
| `/api/profile` | Profiles |
| `/api/tenants` | Tenant and listing workflows |
| `/api/agents` | Agent registration and discovery |
| `/api/bookings` | Bookings and demonstration payments |
| `/api/verification` | Verification requests and responses |
| `/api/files` | File access |
| `/api/admin` | Administration |
| `/api/reviews` | Reviews |
| `/api/contact` | Contact requests |
| `/api/support` | Support tickets |

See `backend/routes/` and the corresponding controllers for methods, request fields and authentication requirements.

## Deployment

The repository contains separate Vercel configurations for the frontend and backend. Configure each project with the appropriate root directory and environment variables. Set `NEXT_PUBLIC_API_URL` to the backend origin without an `/api` suffix.

The backend Vercel configuration targets `backend/api/index.js`. Socket.IO is initialized separately in `backend/server.js`: deploying the REST entry point alone does not start that socket server. Run `npm start` on a persistent Node.js service when using the realtime functionality.

Update allowed frontend origins in `backend/app.js` and `backend/server.js` when changing deployment domains.

## Development checks

From `frontend/`:

```bash
npm run lint
npm run build
```

The backend's `npm test` is a placeholder that exits with an error. Standalone diagnostic scripts are present, but they are not a complete automated test suite and may need a configured database.

## Next improvements

- Add versioned database migrations and a reproducible storage setup.
- Replace demonstration payments with a verified payment-provider workflow.
- Add automated tests for authentication, bookings and document access.
- Consolidate environment and deployment configuration.

## Author

**Awari Shashi Preetham**

[GitHub](https://github.com/Shashiawari) · [Portfolio](https://shashipreetham.netlify.app/projects)
