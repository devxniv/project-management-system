class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "",
  ) {
    super(message); //calling the constructor of parent class
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack; //stack of error traces
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
