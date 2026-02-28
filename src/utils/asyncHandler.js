const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err)); //next(err) goes to:Your custom error middleware (if defined), Otherwise Express’s built-in one
  };
};

export { asyncHandler };
