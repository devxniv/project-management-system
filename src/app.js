import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Route imports — kept at top with other imports (ESM best practice)
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";

const app = express();

// 1. CORS — must come first to handle preflight OPTIONS requests
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// 2. Body parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// 3. Cookie parser
app.use(cookieParser());

// 4. Routes
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>API</title>
  <style>
    body { font-family: sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; color: #111; }
    .badge { display: inline-block; font-size: 11px; padding: 2px 10px; border-radius: 20px; background: #d1fae5; color: #065f46; }
    .meta { display: flex; gap: 16px; margin: 16px 0 24px; font-size: 13px; color: #666; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
    .card h2 { font-size: 12px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: .05em; margin: 0 0 12px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .method { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
    .path { font-family: monospace; flex: 1; }
    .label { color: #999; }
    pre { font-family: monospace; font-size: 12px; line-height: 1.7; margin: 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>API <span class="badge">running</span></h1>
  <div class="meta">
    <span>Version: <strong>v1</strong></span>
    <span>Status: <strong>200 OK</strong></span>
    <span>Routes: <strong>4</strong></span>
  </div>

  <div class="card">
    <h2>Available routes</h2>
    <div class="row"><span class="method" style="background:#d1fae5;color:#065f46">GET</span><span class="path">/api/v1/healthcheck</span><span class="label">Health check</span></div>
    <div class="row"><span class="method" style="background:#dbeafe;color:#1e40af">ALL</span><span class="path">/api/v1/auth</span><span class="label">Authentication</span></div>
    <div class="row"><span class="method" style="background:#ede9fe;color:#5b21b6">ALL</span><span class="path">/api/v1/projects</span><span class="label">Projects</span></div>
    <div class="row"><span class="method" style="background:#fef3c7;color:#92400e">ALL</span><span class="path">/api/v1/tasks</span><span class="label">Tasks</span></div>
  </div>

  <div class="card">
    <h2>Raw JSON</h2>
    <pre>${JSON.stringify({ success: true, message: "API is running", version: "v1", docs: "/api/v1/healthcheck", endpoints: { auth: "/api/v1/auth", projects: "/api/v1/projects", tasks: "/api/v1/tasks" } }, null, 2)}</pre>
  </div>
</body>
</html>`);
});

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/tasks", taskRouter);

export default app;
