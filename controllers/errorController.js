const appError = require("../utils/appError");

const handleDuplicateError = (err) => {
  const value = err.keyValue.email;
  const message = `${value} is already taken, try another one.`;
  return new appError(message, 400);
};

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    code: err.code,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendProdError = (err, res) => {
  let error = { ...err };
  if (error.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      code: err.code,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: "Error",
      message: "Something went really wrong",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "Error";
  if (process.env.NODE_ENV === "development") {
    sendDevError(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    if (err.code === 11000) {
      error = handleDuplicateError(error);
    }
    sendProdError(error, res);
  }
};
