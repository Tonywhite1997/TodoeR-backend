const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Enter the task title to continue"],
    },
    task: {
      type: String,
      required: [true, "Task field can not be empty"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
    completedDate: {
      type: Date,
    },
    user: {
      ref: "User",
      type: mongoose.Schema.ObjectId,
      required: [true, "A task must have a creator"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

taskSchema.pre(/^find/, function (next) {
  this.find().select("-__v");
  next();
});

const Tasks = mongoose.model("Tasks", taskSchema);
module.exports = Tasks;
