const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name field can not be empty"],
    },
    email: {
      type: String,
      required: [true, "Email field can not be empty"],
      unique: true,
      validate: [validator.isEmail, "Please write a proper email"],
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
    changedPasswordAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    photo: {
      type: String,
      default: "default.jpg",
    },
    age: {
      type: Number,
      min: [12, "User can not be below 12 years of age"],
      required: [true, "age is a must"],
    },
    passwordResetToken: String,
    resetTokenExpiresIn: Date,
    changedPasswordAt: Date,
    password: {
      type: String,
      required: [true, "Password field can not be empty"],
      select: false,
      minLength: 8,
    },
    confirmPassword: {
      type: String,
      required: [true, "Password field can not be empty"],
      validate: {
        validator: function (confirmPass) {
          return confirmPass === this.password;
        },
        message: "Password and confirm password must be the same",
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("tasks", {
  ref: "Tasks",
  foreignField: "user",
  localField: "_id",
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ isActive: { $ne: false } }).select("-__v");
  next();
});

// userSchema.methods.exceedLoginAttempts = function () {
//   return this.loginAttempts === 3;
// };

userSchema.methods.correctPassword = async function (candidatePass, userPass) {
  return await bcrypt.compare(candidatePass, userPass);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.changedPasswordAt) {
    const passwordTimeStamp = Number(
      this.changedPasswordAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < passwordTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetTokenExpiresIn = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
