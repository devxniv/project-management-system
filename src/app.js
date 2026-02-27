import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

//Basic configuration
app.use(express.json({ limit: "16kb" })); //saves json input data into req.body
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //parse request bodies
app.use(express.static("public")); //serves files directly from a root folder
//router
app.get("/", (req, res) => {
  res.send("welcome to basecamp");
});

app.use(cookieParser());

//CORS configuration
//?cors configurations
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:s173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
export default app;

