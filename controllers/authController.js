const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const appError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/user");
const Email = require("../utils/email");
const crypto = require("crypto");
const AppError = require("../utils/appError");

const getJWTToken = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  return token;
};

const cookieOptions = {
  maxAge: 90 * 24 * 60 * 60 * 1000,
  httpOnly: true,
};

const createSendToken = (user, res, statusCode) => {
  const token = getJWTToken(user._id);
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwtToken", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    user,
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const { name, email, password, confirmPassword, age, changedPasswordAt } =
    req.body;

  const user = await User.create({
    name,
    email,
    age,
    password,
    confirmPassword,
    changedPasswordAt,
  });
  user.password = undefined;

  // const url = `${req.protocol}://${req.get("host")}/login`;
  // console.log(url);
  const url = `http://localhost:3000`;

  await new Email(user, url).sendWelcome();

  createSendToken(user, res, 201);
});

const MAX_ATTEMPTS = 3;
const LOCK_WINDOW = 5; // in minutes
const locks = {};

const checkForExpiredLocks = () => {
  for (const email in locks) {
    if (locks[email].isLocked && locks[email].unlockedAt < Date.now()) {
      delete locks[email];
    }
  }
};

setInterval(checkForExpiredLocks, 60 * 1000); // Check every minute

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new appError("email or password field can not be empty", 400));
  }

  if (
    locks[email] &&
    locks[email].isLocked &&
    locks[email].unlockedAt > Date.now()
  ) {
    return next(
      new appError(
        "Account locked due to too many login attempts. Try again later",
        429
      )
    );
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    locks[email] = locks[email] || {
      attempts: 0,
      isLocked: false,
      unlockedAt: null,
    };
    locks[email].attempts += 1;
    if (locks[email].attempts >= MAX_ATTEMPTS) {
      locks[email].isLocked = true;
      locks[email].unlockedAt = Date.now() + LOCK_WINDOW * 60 * 1000;
    }
    return next(new appError("Incorrect email or password, try again", 404));
  }

  delete locks[email];
  createSendToken(user, res, 200);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else {
    token = req.cookies.jwtToken;
  }
  if (!token) {
    return next(new appError("Please login to continue", 404));
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const freshUser = await User.findById(decoded.userId);
  if (!freshUser) {
    return next(
      new appError("The user belonging to this token does not exist", 401)
    );
  }
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new appError(
        "You recently changed your password, login again to continue",
        404
      )
    );
  }
  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    const { role } = req.user;
    if (!roles.includes(role)) {
      return next(
        new appError("Unauthorized! can not perform this request", 401)
      );
    }
    next();
  };
};

exports.checkIfActive = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);
  if (!user) {
    return next(new appError("User does not exist", 404));
  }
  if (!user.isActive) {
    return next(
      new appError(
        "account deactivated, please activate /restore to continue",
        401
      )
    );
  }
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  console.log(email);
  if (!email) {
    return next(new appError("Please enter your email", 403));
  }
  const user = await User.findOne({ email: email });
  if (!user) {
    return next(new appError("This user does not exist", 404));
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // const resetUrl = `${req.protocol}//${req.get(
  //   "host"
  // )}/api/v1/users/resetPassword/${resetToken}`;

  const resetUrl = `http://localhost:3000/reset-password?resetToken=${resetToken}`;

  await new Email(user, resetUrl).forgotPassword();

  res.status(200).json({
    status: "success",
    message: "Token sent to email",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken } = req.query;

  if (!resetToken) {
    return next(new appError("Invalid token or expired token", 403));
  }

  const hashedResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({ passwordResetToken: hashedResetToken });
  if (!user) {
    return next(new appError("Invalid token or expired token", 400));
  }

  const tokenExpiringDate = new Date(user.resetTokenExpiresIn);
  const currentDate = new Date();

  if (tokenExpiringDate.getTime() < currentDate.getTime()) {
    return next(new appError("Invalid token or expired token", 400));
  }

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.changedPasswordAt = Date.now();
  user.passwordResetToken = undefined;
  user.resetTokenExpiresIn = undefined;
  await user.save();
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword } = req.body;
  const { id } = req.user;
  const user = await User.findById(id).select("+password");
  if (!user) {
    return next(new appError("User does not exist", 404));
  }

  if (!(await user.correctPassword(currentPassword, user.password))) {
    console.log(false);
    return next(new appError("incorrect password", 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.changedPasswordAt = Date.now();
  await user.save();
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.checkIfLoggedIn = async (req, res, next) => {
  const token = req.cookies.jwtToken;
  if (!token) {
    return next();
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (!decoded) {
    return next();
  }
  const user = await User.findById(decoded.userId);
  if (!user) {
    return next();
  }

  res.status(200).json({
    status: "success",
    user,
  });
  // next();
};

exports.logout = (req, res, next) => {
  const cookieOptions = { httpOnly: true, maxAge: 100 };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwtToken", "jwjdsd-wdjbsfj-njdsbc", cookieOptions);

  res.status(200).json({
    status: "success",
    message: "Logout successfully",
  });
};
