# TriageSync

## 1. Overview

TriageSync imports support tickets, assigns an initial category and priority using keyword rules, and lets agents review tickets with an audit trail. Agents can book rooms, labs, or equipment for troubleshooting and optionally link a booking to a ticket. Admins manage resources, approve or reject bookings, and view analytics.

## 2. Live links

- [Web app](https://engnf1-fullstack-pritamahanta.onrender.com/login)
- [API health check](https://engnf1-fullstack-pritamahanta.onrender.com/health)
- API requests use `https://engnf1-fullstack-pritamahanta.onrender.com/api`.

Render serves the React build and the Express API from the same origin. Data is stored in Neon PostgreSQL.

## 3. Seeded credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@triagesync.test` | `Admin@123` |
| Support agent | `user@triagesync.test` | `User@123` |

The seed includes six resources, one inactive resource, and 17 tickets covering all categories and priorities. It includes an HTML/script test case and four tickets already marked as reviewed.

## 4. Tech stack

React, React Router, Vite, and plain CSS on the frontend. Node.js and Express on the backend, with Zod validation, bcrypt password hashing, JWT authentication, and the `pg` PostgreSQL driver. Render hosts the app and Neon hosts the database.

## 5. Folder structure

| Path | Purpose |
| --- | --- |
| `frontend/src/` | Auth, ticket queue, resource pages, My Bookings, and admin screens |
| `backend/src/routes/` and `backend/src/controllers/` | REST routes, access checks, and request validation |
| `backend/src/services/` and `backend/src/repositories/` | Business rules, transactions, and parameterized SQL |
| `backend/src/db/` | Migration runner, seed script, and seed data |
| `backend/migrations/` | Versioned PostgreSQL schema changes and indexes |

## 6. Local setup and idempotent seed

Use Node.js 24, npm, and a PostgreSQL database. Run these commands from the repo root.

```bash
npm ci --prefix backend
npm ci --prefix frontend
test -f backend/.env || cp .env.example backend/.env
```

In `backend/.env`, set `DATABASE_URL` to your PostgreSQL connection string, `JWT_SECRET` to a value generated with `openssl rand -hex 32`, and `CORS_ORIGIN` to `http://localhost:5173`. Keep the backend on port 4000 for the Vite development proxy.

```bash
npm --prefix backend run migrate
npm --prefix backend run seed
npm --prefix backend run dev
```

Start Vite in a second terminal at the repo root.

```bash
npm --prefix frontend run dev
```

Open `http://localhost:5173`. You can rerun the seed command. Existing users, resources, and tickets are skipped, and audit events are inserted only for newly seeded tickets.

## 7. Database schema

| Table | Role and constraints |
| --- | --- |
| `users` | Case-insensitive unique email, bcrypt password hash, and role |
| `tickets` | Unique external ID, initial prediction, editable triage fields, review and override flags, and optional assignee |
| `ticket_events` | Ticket audit records with field, old value, new value, actor, and timestamp |
| `resources` | Case-insensitive unique name, type, capacity, description, and active flag |
| `bookings` | Resource, owner, optional ticket, time range, status, and decision note. A PostgreSQL exclusion constraint prevents overlapping pending or approved bookings on the same resource. |
| `schema_migrations` | Tracks applied migrations |

## 8. API summary

All paths below use the `/api` prefix. Pass the login token as `Authorization: Bearer <token>` on protected routes.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Tickets | `POST /tickets/import`, `GET /tickets`, `GET /tickets/:id`, `PATCH /tickets/:id` |
| Ticket stats | `GET /stats` |
| Resources | `GET /resources`, `GET /resources/:id`, `GET /resources/:id/availability`, admin `POST /resources`, admin `PATCH /resources/:id` |
| Bookings | `POST /bookings`, `GET /bookings/mine`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel` for the owner |
| Admin | `GET /bookings`, `PATCH /bookings/:id/approve`, `PATCH /bookings/:id/reject`, `GET /admin/stats` |

`GET /health` is a public process health check outside the API prefix.

## 9. Completed features

- [x] Registration, sign-in, session restoration, and role-based access
- [x] Idempotent ticket import, deterministic triage, and human override protection
- [x] Searchable ticket queue, optimistic edits with rollback, and audit history
- [x] Ticket breakdowns and agreement rate across reviewed tickets
- [x] Resource discovery, availability, optional ticket links, and race-safe booking
- [x] My Bookings, owner cancellation, admin booking decisions, resource management, and admin analytics

## 10. Known limitations

- Classification depends on a fixed keyword list. Wording outside those rules falls back to the default category or priority.
- Ticket lists use offset pagination and an exact count. Deep pages and broad substring searches can cost more as the table grows.
- Booking and review updates are visible in the app. There are no email notifications.
