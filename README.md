# EduManager — Student Management System

A modern React + Vite + Tailwind CSS frontend for an Institute ERP system, powered by Google Apps Script as the backend.

## Features

- 🔐 **Role-Based Login** — Admin, Student, Employee portals
- 📊 **Admin Dashboard** — KPIs, inquiries, registrations, admissions, fees, attendance, HR, LMS, exams
- 🎓 **Student Portal** — Attendance (face + GPS), logs, notices, LMS resources, exam results
- 👨‍💼 **Employee Portal** — Attendance, logs, notices, leave requests
- 📍 **Geo-fenced Attendance** — GPS radius check for check-in/out
- 🔒 **Secure Config** — API URL stored in `.env`, centralized access

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend | Google Apps Script |
| Database | Google Sheets |

## Quick Start

```bash
# Install dependencies
npm install

# Create environment config
cp .env.example .env
# Edit .env with your Apps Script URL

# Start development server
npm run dev

# Production build
npm run build
```

## Project Structure

```
src/
├── config/         # Environment variables & constants
├── services/       # Centralized API layer (all backend calls)
├── context/        # React Context (Auth)
├── hooks/          # Custom hooks (geolocation)
├── components/
│   ├── layout/     # Sidebar, AdminLayout, PortalLayout
│   └── ui/         # Modal, Toast, LoadingBar, StatCard, Badge, DataTable
├── pages/
│   ├── admin/      # 11 admin pages
│   ├── student/    # Student portal
│   └── employee/   # Employee portal
├── utils/          # Helper functions
├── App.jsx         # Router with protected routes
└── main.jsx        # Entry point
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Google Apps Script deployed URL |
| `VITE_INSTITUTE_LAT` | Institute latitude for GPS check |
| `VITE_INSTITUTE_LNG` | Institute longitude for GPS check |
| `VITE_ALLOWED_RADIUS` | Max distance (meters) for attendance |
| `VITE_FACE_MATCH_THRESHOLD` | Face recognition threshold |

## License

MIT