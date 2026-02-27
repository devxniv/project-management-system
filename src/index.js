import "dotenv/config"; //reads .env file and dumps those values into process.env
import connectDB from "./db/dbConnection.js";
import app from "./app.js";
const PORT = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`App is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`MongoDB connection error ${err}`);
    process.exit(1);
  });
