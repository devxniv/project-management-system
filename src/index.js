import "dotenv/config"; // loads .env into process.env (must stay the first import)
import connectDB from "./db/dbConnection.js";
import app from "./app.js";

const requiredEnv = [
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required env variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`App is running on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      console.error(`Server error: ${err.message}`);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });
