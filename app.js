const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const expressSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const globalErrorHandler = require("./controllers/errorController");
const appError = require("./utils/appError");
const userRoute = require("./routes/userRoute");
const taskRoute = require("./routes/tasksRoute");
const app = express();

app.use(helmet());

const limit = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this IP. wait for 1 hour and try again",
});

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);
app.use(express.json());
app.use(expressSanitize());
app.use(xss());
app.use(hpp());
app.use(morgan("dev"));
app.use(cookieParser());
app.use("/api", limit);
app.use(express.static("public"));
// app.use("/public", express.static(`${__dirname}/public`));

app.use("/api/v1/users", userRoute);
app.use("/api/v1/tasks", taskRoute);

app.all("*", (req, res, next) => {
  return next(
    new appError(`can not find ${req.originalUrl} on the server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
