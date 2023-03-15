const sharp = require("sharp");
const multer = require("multer");
const appError = require("../utils/appError");
const catchAsync = require("./catchAsync");

const multerStorage = multer.memoryStorage();

const multerFilters = (req, file, cb) => {
  if (file.mimetype.startsWith("images")) {
    cb(null, true);
  } else {
    cb(new appError("error uploading file", 401), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilters });

const uploadImage = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

const resizePhotos = catchAsync(async (req, res, next) => {
  if (!req.files.coverImage || !req.files.images) return next();
  req.body.imageCover = `user-${req.user.id}-${Date.now()}`;
  await sharp(req.files.imageCover.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/${req.body.imageCover}`);

  req.body.images = [];
  for (let i = 0; i < req.files.images.length; i++) {
    req.body.images.push(`user-${req.user.id}-${Date.now()}-${i + 1}`);
    await sharp(req.files.images[i].buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.body.images[i]}`);
  }
});
