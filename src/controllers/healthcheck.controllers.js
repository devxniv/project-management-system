import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** 
 //method 1
const healthCheck = async (req, res, next) => {
  try {
    //always remember while fetching data from db it may give some error and also will take some time to load the data.
    const user = await getUserFromDB();
    res
      .status(200)
      .json(new ApiResponse(200, { message: "Server is running" }));
  } catch (error) {
    next(err); //express built in error handler
  }
};

//avoid too many try-catch
//you can automatically catch any unhandled promise rejections specially in the errors and pass them to built in express handlers.
*/

//method 2
const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "server is running" }));
});
export { healthCheck };
