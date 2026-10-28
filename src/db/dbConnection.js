import mongoose from "mongoose";

/** async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
}
connectDB().catch((err) => console.log("mongodb connection error", err));
*/

/** const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb connected");
  } catch (error) {
    console.log("mongodb connection error", error);
    process.exit(1);
  }
}; */

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in .env");
  }

  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(
    `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`,
  );
};

export default connectDB;
