const { Promise } = require("mongoose");
const multer = require("multer");
const sharp = require("sharp");
const User = require("../models/user");
const ApiFeatures = require("../utils/apiFeatures");
const appError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const path = require("path");

const multerStorage = multer.memoryStorage();

const multerFilters = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new appError("Only images are allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilters });

// exports.uploadPhotos = upload.fields([
//   { name: "photo", maxCount: 1 },
//   { name: "images", maxCount: 3 },
// ]);
exports.uploadPhotos = upload.single("photo");

exports.resizePhotos = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  let features = new ApiFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();
  //   const users = await User.find().skip(2).limit(2);
  const users = await features.query;
  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id).populate("tasks");
  if (!user) {
    return next(new appError("User does not exist", 404));
  }
  console.log(user);
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

const filteredObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  // const { name } = req.body;
  const filteredBody = filteredObj(req.body, "name", "age");
  if (req.file) {
    filteredBody.photo = req.file.filename;
    console.log(req.file.filename);
  }

  const updatedUser = await User.findByIdAndUpdate(id, filteredBody, {
    new: true,
    runValidators: true,
  });
  if (!updatedUser) {
    return next(new appError("User does not exist", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return next(new appError("user not found", 404));
  user.name = req.body.name;
  user.age = req.body.age;
  user.role = req.body.role;
  user.isActive = req.body.isActive;
  const updatedUser = await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    return next(new appError("This User does not exist", 404));
  }
  const latestUsers = await User.find({ role: { $ne: "admin" } });
  res.status(200).json({
    status: "success",
    users: latestUsers,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { password } = req.body;
  if (!password) {
    return next(
      new appError(
        "Please enter your password to confirm account deletion",
        403
      )
    );
  }

  const user = await User.findById(id).select("+password");

  if (!user) {
    return next(new appError("This user does not exist", 404));
  }

  if (!(await user.correctPassword(password, user.password))) {
    return next(new appError("Incorrect password", 403));
  }

  user.isActive = false;
  await user.save({ validateBeforeSave: false });
  res.status(204).json({
    status: "success",
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const { _id } = req.user;
  const me = await User.findById(_id);
  if (!me) {
    return next(new appError("User does not exist", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      user: me,
    },
  });
});

exports.getImage = catchAsync(async (req, res, next) => {
  const { filename } = req.params;
  if (!filename) return next(new appError("Invalid filename", 404));
  const file = path.join(__dirname, "../public/img/users", filename);
  res.sendFile(file);
});
