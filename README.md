# 📋 Project Management System

🌐 Live API: [View Live demo]https://project-management-system-ba6l.onrender.com

##  Branches

| Branch | Description |
|--------|-------------|
| `main` | Original backend API (tutorial-guided) |
| `independent-build` | Full-stack rebuild from scratch — backend + frontend, built independently |

> The `independent-build` branch is actively under development.

---

A RESTful backend API for managing projects, tasks, and team members — built with Node.js, Express, and MongoDB.

---

## 🚀 Tech Stack

| Layer            | Technology                    |
| ---------------- | ----------------------------- |
| Runtime          | Node.js (ESM modules)         |
| Framework        | Express v5                    |
| Database         | MongoDB via Mongoose          |
| Auth             | JWT (Access + Refresh tokens) |
| Password Hashing | bcrypt                        |
| File Uploads     | Multer                        |
| Email            | Nodemailer + Mailgen          |
| Validation       | express-validator             |
| Dev Server       | Nodemon + Prettier            |

---

## ✨ Features

- **User Authentication** — Register, login, logout, email verification, forgot/reset password, refresh tokens
- **Project Management** — Create, read, update, and delete projects
- **Role-Based Access Control** — Admin and Member roles per project; permissions enforced at middleware level
- **Team Management** — Add/remove members, update member roles within a project
- **Task Management** — Full CRUD for tasks with subtask support and notes
- **Health Check** — Endpoint to verify the API is running
- **Structured Responses** — Consistent `ApiResponse` and `ApiError` wrappers across all endpoints

---

## 📁 Project Structure

```
src/
├── app.js                    # Express app setup (CORS, middleware, routes)
├── index.js                  # Server entry point
├── controllers/
│   ├── authUser.controller.js    # Register, login, logout, email verify, password reset
│   ├── project.controllers.js    # Project CRUD + member management
│   ├── task.controller.js        # Task CRUD + subtasks + notes
│   └── healthcheck.controllers.js
├── models/
│   ├── user.models.js            # User schema (bcrypt, JWT methods, temp tokens)
│   ├── project.models.js         # Project schema
│   ├── projectmember.models.js   # Project↔User join with role
│   ├── task.models.js            # Task schema
│   ├── subtask.models.js         # Subtask schema
│   └── notes.models.js           # Notes schema
├── routes/
│   ├── auth.routes.js            # /api/v1/auth
│   ├── project.routes.js         # /api/v1/projects
│   ├── task.routes.js            # /api/v1/tasks
│   └── healthcheck.routes.js     # /api/v1/healthcheck
├── middlewares/
│   ├── auth.middleware.js        # verifyJWT + validateProjectPermission (RBAC)
│   ├── multer.middleware.js      # File upload handling
│   └── validator.middleware.js   # express-validator error handler
├── validators/
│   └── index.js                  # Validation chains for all routes
├── utils/
│   ├── apiError.js               # Custom error class
│   ├── apiResponse.js            # Standardized response wrapper
│   ├── asyncHandler.js           # Async error wrapper
│   ├── constants.js              # UserRolesEnum, AvailableUserRole
│   └── mailgen.js                # Email generation (verification, password reset)
└── db/
    └── dbConnection.js           # MongoDB connection
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Installation

```bash
git clone https://github.com/devxniv/project-management-system.git
cd project-management-system
npm install
```

### Environment Variables

Create a `.env` file in the root directory with the following:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/projmanage
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m

Refresh_TOKEN_SECRET=your_refresh_token_secret
Refresh_TOKEN_EXPIRY=7d

# Nodemailer config
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password
```

### Run the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:8000`.

---

## 📡 API Reference

All routes are prefixed with `/api/v1`.

### Auth — `/api/v1/auth`

| Method | Endpoint                     | Auth Required | Description                    |
| ------ | ---------------------------- | ------------- | ------------------------------ |
| POST   | `/register`                  | ✗             | Register a new user            |
| POST   | `/login`                     | ✗             | Login and receive tokens       |
| GET    | `/verify-email/:token`       | ✗             | Verify email address           |
| POST   | `/refresh-token`             | ✗             | Get a new access token         |
| POST   | `/forgot-password`           | ✗             | Request a password reset email |
| POST   | `/reset-password/:token`     | ✗             | Reset password using token     |
| POST   | `/logout`                    | ✓             | Get logged-in user info        |
| POST   | `/change-password`           | ✓             | Change current password        |
| POST   | `/resend-email-verification` | ✓             | Resend verification email      |

### Projects — `/api/v1/projects`

All project routes require authentication (`verifyJWT`).

| Method | Endpoint                      | Role Required | Description                            |
| ------ | ----------------------------- | ------------- | -------------------------------------- |
| GET    | `/`                           | Member        | List all projects for the current user |
| POST   | `/`                           | —             | Create a new project                   |
| GET    | `/:projectId`                 | Member        | Get a project by ID                    |
| PUT    | `/:projectId`                 | Admin         | Update a project                       |
| DELETE | `/:projectId`                 | Admin         | Delete a project                       |
| GET    | `/:projectId/members`         | —             | Get all project members                |
| POST   | `/:projectId/members`         | Admin         | Add a member to the project            |
| PUT    | `/:projectId/members/:userId` | Admin         | Update a member's role                 |
| DELETE | `/:projectId/members/:userId` | Admin         | Remove a member                        |

### Tasks — `/api/v1/tasks`

| Method | Endpoint              | Description                 |
| ------ | --------------------- | --------------------------- |
| GET    | `/project/:projectId` | Get all tasks for a project |
| POST   | `/project/:projectId` | Create a task               |
| GET    | `/:taskId`            | Get a task by ID            |
| PUT    | `/:taskId`            | Update a task               |
| DELETE | `/:taskId`            | Delete a task               |

### Health Check

| Method | Endpoint              | Description        |
| ------ | --------------------- | ------------------ |
| GET    | `/api/v1/healthcheck` | Returns API status |

---

## 🔐 Authentication Flow

1. Register → receives an email verification link
2. Verify email via the token link
3. Login → receives a short-lived **access token** and a long-lived **refresh token**
4. Use the access token in the `Authorization: Bearer <token>` header (or via cookie)
5. When the access token expires, call `/refresh-token` to get a new one

---

## 👥 Role-Based Access Control

Each project has members with one of two roles:

| Role     | Permissions                                                      |
| -------- | ---------------------------------------------------------------- |
| `admin`  | Full access: update/delete project, manage members, create tasks |
| `member` | Read access: view project, view tasks                            |

The `validateProjectPermission` middleware checks the user's role in `ProjectMember` before allowing the action.

---

## 🛠️ Scripts

```bash
npm run dev    # Start with nodemon (hot reload)
```
