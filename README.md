# FindH - Rental Matching Application

FindH is a full-stack Next.js and Express application designed to match nearby rental agents with tenants seamlessly using Google Geocoding and MongoDB 2dsphere geometric queries.

## Getting Started

### 1. Environment Setup

**Backend (`/backend/.env`)**
Create a `.env` file in the `backend` folder containing:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
GOOGLE_API_KEY=your_google_geocoding_api_key  # Optional if using fallback
```

### 2. Run Backend
1. `cd backend`
2. `npm run dev` (or `node server.js`)

The backend will start on `http://localhost:5000`.

### 3. Run Frontend
1. `cd frontend`
2. `npm run dev`

The frontend will start on URL normally `http://localhost:3000`.

### Features Implemented
- **Pure CSS UI**: Extravagant modern design without TailwindCSS.
- **Agent Roles**: Students & Professionals signup logic processing multiple document types.
- **Tenant Room Posting**: Geocoding, property details, and image uploads.
- **Smart Matrix**: Radius matching showing qualified agents within 5km distance automatically in the room detail view.
- **JWT Auth**: Secured user login and signup workflow.
