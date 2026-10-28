import mongoose from "mongoose";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthCheck = asyncHandler(async (req, res) => {
  // 1 = connected
  const dbConnected = mongoose.connection.readyState === 1;
  const statusCode = dbConnected ? 200 : 503;

  return res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      {
        uptime: Math.round(process.uptime()),
        database: dbConnected ? "connected" : "disconnected",
      },
      dbConnected
        ? "Server is running"
        : "Server is up but the database is not connected",
    ),
  );
});

export { healthCheck };
