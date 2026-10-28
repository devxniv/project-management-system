# 📋 Project Management System

🌐 Live API: [View Live demo](https://project-management-system-ba6l.onrender.com)

> The live API runs on a free hosting tier, so the first request after a period of inactivity can take 30–60 seconds while the server wakes up.

A RESTful backend API for managing projects, tasks, and team members — built with Node.js, Express, and MongoDB. It has **29 endpoints** across authentication, projects, members, tasks, and subtasks.

---

## 🚀 Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Runtime          | Node.js (ESM modules)                           |
| Framework        | Express v5                                      |
| Database         | MongoDB via Mongoose                            |
| Auth             | JWT (access + refresh tokens, httpOnly cookies) |
| Password Hashing | bcrypt                                          |
| File Uploads     | Multer                                          |
| Email            | Nodemailer + Mailgen                            |
| Validation       | express-validator                               |
| Rate Limiting    | express-rate-limit                              |
| Dev Tools        | Nodemon + Prettier                              |

---

## ✨ Features

- **User Authentication** — Register, login, logout, email verification, forgot/reset password, change password, refresh tokens
- **Secure Token Handling** — Refresh-token rotation with reuse detection; reset, verification, and refresh tokens are stored as SHA-256 hashes, never in plain text
- **Project Management** — Create, read, update, and delete projects; project names are unique per creator (case-insensitive)
- **Role-Based Access Control** — Three roles per project (Admin, Project Admin, Member) enforced in middleware
- **Team Management** — Add/remove members and change roles; every project always keeps at least one admin
- **Task Management** — Full CRUD for tasks with filtering and pagination, subtasks, task status updates, and validated file attachments
- **Validation** — express-validator chains on every route that accepts input
- **Centralized Error Handling** — One error middleware turns validation, duplicate-key, bad-id, expired-token, and upload errors into consistent JSON responses
- **Rate Limiting** — Per-route limits on login, register, password reset, email resend, and token refresh, plus a general API limit
- **Health Check** — Endpoint that reports API and database status

---

## 📁 Project Structure

```
src/
├── app.js                        # Express app setup (CORS, parsers, routes, error handlers)
├── index.js                      # Server entry point (env check, DB connect, listen)
├── controllers/
│   ├── authUser.controller.js    # Register, login, logout, email verify, password flows, refresh
│   ├── project.controller.js     # Project CRUD + member management
│   ├── task.controller.js        # Task CRUD, status, subtasks, attachments
│   └── healthcheck.controller.js
├── models/
│   ├── user.models.js            # User schema (bcrypt, JWT methods, hashed temp tokens)
│   ├── project.models.js         # Project schema
│   ├── projectmember.models.js   # Project↔User join with role
│   ├── task.models.js            # Task schema (with attachments)
│   └── subtask.models.js         # Subtask schema
├── routes/
│   ├── auth.routes.js            # /api/v1/auth
│   ├── project.routes.js         # /api/v1/projects
│   ├── task.routes.js            # /api/v1/tasks
│   └── healthcheck.routes.js     # /api/v1/healthcheck
├── middlewares/
│   ├── auth.middleware.js        # verifyJWT + validateProjectPermission (RBAC)
│   ├── error.middleware.js       # 404 handler + central error handler
│   ├── multer.middleware.js      # File upload rules (type, size, count)
│   ├── rateLimiter.middleware.js # Per-route rate limiters
│   └── validator.middleware.js   # express-validator result handler
├── validators/
│   └── index.js                  # Validation chains for all routes
├── utils/
│   ├── apiError.js               # Custom error class
│   ├── apiResponse.js            # Standardized response wrapper
│   ├── asyncHandler.js           # Async error wrapper
│   ├── constants.js              # Roles, task statuses, cookie options
│   └── mailgen.js                # Email content + sending (verification, password reset)
└── db/
    └── dbConnection.js           # MongoDB connection
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js v18+
- A MongoDB **replica set** — MongoDB Atlas (free tier works) is the easiest option. Deleting a project uses a transaction, which a standalone local `mongod` does not support.
- A [Mailtrap](https://mailtrap.io) sandbox inbox (or any SMTP service) for verification and reset emails

### Installation

```bash
git clone https://github.com/devxniv/project-management-system.git
cd project-management-system
npm install
```

### Environment Variables

Create a `.env` file in the root directory. **Never commit it.**

```env
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/projectmanagement?retryWrites=true&w=majority
CORS_ORIGIN=http://localhost:5173
SERVER_URL=http://localhost:8000

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

# Email (Mailtrap sandbox shown)
MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=your_mailtrap_user
MAILTRAP_SMTP_PASS=your_mailtrap_password

# Where the password-reset email links to (a frontend page that POSTs the new password)
FORGOT_PASSWORD_REDIRECT_URL=http://localhost:5173/reset-password
```

| Variable                   | Notes                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| `MONGO_URI`, token secrets | Required — the server refuses to start without them              |
| `*_TOKEN_EXPIRY`           | Use units (`15m`, `7d`). A bare number means milliseconds        |
| `SERVER_URL`               | Used to build email-verification links and attachment URLs       |
| `CORS_ORIGIN`              | Comma-separated list of allowed frontend origins                 |
| `NODE_ENV=production`      | Enables secure cookies and hides stack traces in error responses |

### Run the Server

```bash
npm run dev     # development, with nodemon hot reload
npm start       # production
```

The API will be available at `http://localhost:8000` (or the `PORT` you set).

---

## 📡 API Reference

All routes are prefixed with `/api/v1`. Send the JWT either as the `accessToken` cookie (set automatically on login) or as `Authorization: Bearer <token>`.

### Auth — `/api/v1/auth`

| Method | Endpoint                           | Login required | Description                                       |
| ------ | ---------------------------------- | -------------- | ------------------------------------------------- |
| POST   | `/register`                        | No             | Register a new user and send a verification email |
| POST   | `/login`                           | No             | Login; sets access and refresh token cookies      |
| GET    | `/verify-email/:verificationToken` | No             | Verify email address                              |
| POST   | `/refresh-token`                   | No             | Rotate tokens and get a new access token          |
| POST   | `/forgot-password`                 | No             | Request a password reset email                    |
| POST   | `/reset-password/:resetToken`      | No             | Reset password using the emailed token            |
| POST   | `/logout`                          | Yes            | Log out and invalidate the refresh token          |
| GET    | `/current-user`                    | Yes            | Get the logged-in user                            |
| POST   | `/change-password`                 | Yes            | Change current password                           |
| POST   | `/resend-email-verification`       | Yes            | Resend the verification email                     |

### Projects — `/api/v1/projects`

All project routes require authentication.

| Method | Endpoint                      | Role Required | Description                                                                  |
| ------ | ----------------------------- | ------------- | ---------------------------------------------------------------------------- |
| GET    | `/`                           | —             | List the current user's projects (with role and member count)                |
| POST   | `/`                           | —             | Create a project (creator becomes Admin)                                     |
| GET    | `/:projectId`                 | Any member    | Get a project                                                                |
| PUT    | `/:projectId`                 | Admin         | Update a project                                                             |
| DELETE | `/:projectId`                 | Admin         | Delete a project with its tasks, subtasks, memberships, and attachment files |
| GET    | `/:projectId/members`         | Any member    | List project members                                                         |
| POST   | `/:projectId/members`         | Admin         | Add a member by email with a role                                            |
| PUT    | `/:projectId/members/:userId` | Admin         | Update a member's role                                                       |
| DELETE | `/:projectId/members/:userId` | Admin         | Remove a member                                                              |

### Tasks — `/api/v1/tasks`

All task routes require authentication and project membership.

| Method | Endpoint                         | Role Required                                               | Description                                                             |
| ------ | -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/:projectId`                    | Any member                                                  | List tasks. Query: `status`, `assignedTo` (id or `me`), `page`, `limit` |
| POST   | `/:projectId`                    | Admin, Project Admin                                        | Create a task (JSON or multipart with `attachments`)                    |
| GET    | `/:projectId/t/:taskId`          | Any member                                                  | Get a task with its subtasks                                            |
| PUT    | `/:projectId/t/:taskId`          | Admin, Project Admin                                        | Update a task, assign/unassign, add attachments                         |
| PATCH  | `/:projectId/t/:taskId/status`   | Assignee, Admin, Project Admin                              | Change task status                                                      |
| DELETE | `/:projectId/t/:taskId`          | Admin, Project Admin                                        | Delete a task, its subtasks, and its files                              |
| POST   | `/:projectId/t/:taskId/subtasks` | Admin, Project Admin                                        | Create a subtask                                                        |
| PUT    | `/:projectId/st/:subTaskId`      | Admin, Project Admin; Member on own tasks (completion only) | Update a subtask                                                        |
| DELETE | `/:projectId/st/:subTaskId`      | Admin, Project Admin                                        | Delete a subtask                                                        |

Task statuses: `todo`, `in_progress`, `done`. Attachments: up to 5 files per task, JPEG / PNG / WebP / PDF, max 5 MB each.

### Health Check

| Method | Endpoint              | Description                                       |
| ------ | --------------------- | ------------------------------------------------- |
| GET    | `/api/v1/healthcheck` | Returns API uptime and database connection status |

### Response Format

Success:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Projects fetched successfully",
  "success": true
}
```

Error:

```json
{
  "statusCode": 422,
  "success": false,
  "message": "Received data is not valid",
  "errors": [{ "email": "Email is invalid" }]
}
```

Common status codes: `400` bad input, `401` not authenticated, `403` not allowed for your role, `404` not found, `409` conflict (duplicate or last admin), `422` validation failed, `429` rate limited.

---

## 🔐 Authentication Flow

1. Register → a verification link is emailed
2. Verify the email via the link (login does not require it)
3. Login → short-lived **access token** (15 min) and long-lived **refresh token** (7 days), both set as httpOnly cookies
4. Call protected routes with the cookie or an `Authorization: Bearer <token>` header
5. When the access token expires, call `/refresh-token` → a new pair is issued and the old refresh token stops working
6. **Reuse detection:** if an already-used refresh token is presented again, the session is revoked and the user must log in again
7. Password reset and change-password invalidate other sessions

---

## 👥 Role-Based Access Control

Each project member has one of three roles:

| Action                                      | Admin | Project Admin |      Member       |
| ------------------------------------------- | :---: | :-----------: | :---------------: |
| View project, members, and tasks            |   ✓   |       ✓       |         ✓         |
| Create / update / delete tasks and subtasks |   ✓   |       ✓       |         ✗         |
| Change a task's status                      |   ✓   |       ✓       | Only if assigned  |
| Mark subtasks completed                     |   ✓   |       ✓       | Only on own tasks |
| Update / delete the project                 |   ✓   |       ✗       |         ✗         |
| Add / remove members, change roles          |   ✓   |       ✗       |         ✗         |

- Anyone can create a project and becomes its Admin.
- A project must always have at least one Admin, so the last Admin cannot be demoted or removed.
- Non-members get `404` for project routes, so they cannot discover which projects exist.
- Tasks can only be assigned to members of the project.

---

## 🛡️ Security and Reliability Improvements

Key fixes and hardening from a full code review of the API:

- Fixed broken queries: project listing, adding members, and listing members
- Fixed a crash that stopped password-reset emails from ever being sent
- Added the central error middleware, so all errors return JSON
- Added input validation for every route, including checks that block NoSQL-injection payloads
- Made reset, verification, and refresh tokens single-use and stored only as hashes
- Added refresh-token rotation with reuse detection
- Added project-scoped lookups so a user cannot touch another project's tasks or subtasks
- Added the last-admin rule, transactional project deletion with file cleanup, and per-creator unique project names
- Restricted uploads to an allowlist of file types and replaced user-supplied filenames with random ones
- Added rate limiting and database indexes

---

## ⚠️ Known Limitations

- Backend only; no frontend is included in this repository
- Emails go to a Mailtrap sandbox inbox, not to real addresses
- Uploaded attachments are stored on the server's disk and served publicly at `/img/<random-name>`; on free hosting the disk is cleared on redeploy
- There is no endpoint yet for uploading a profile avatar or removing a single attachment
- Rate-limit counters are kept in memory, so they reset on restart and are per server instance

---

## 🛠️ Scripts

```bash
npm run dev     # Start with nodemon (hot reload)
npm start       # Start with node
```
