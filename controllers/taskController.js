const Task = require("../models/Task");
const User = require("../models/user");
const catchAsync = require("../utils/catchAsync");
const appError = require("../utils/appError");
const apiFeatures = require("../utils/apiFeatures");

exports.createTask = catchAsync(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);

  await Task.create({
    title: req.body.title,
    task: req.body.task,
    user: user._id,
  });
  const latestTasks = await Task.find({ user: user._id });
  res.status(200).json({
    status: "success",
    tasks: latestTasks,
  });
});

exports.getTasks = catchAsync(async (req, res, next) => {
  const features = new apiFeatures(Task.find(), req.query)
    .filter()
    .limitFields()
    .sort()
    .pagination();
  const tasks = await features.query;

  res.status(200).json({
    status: "success",
    data: {
      tasks,
    },
  });
});

exports.getTask = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const task = await Task.findById(id);
  if (!task) {
    return next(new appError("Task not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      task,
    },
  });
});

exports.updateTask = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const task = await Task.findById(id);
  if (!task) {
    return next(new appError("Task does not exist", 404));
  }

  const { title, task: newTask } = req.body;
  if (!title || !newTask) {
    return next(
      new appError("task field or title field can not be empty", 400)
    );
  }
  task.title = title;
  task.task = newTask;
  await task.save();
  const latestTasks = await Task.find({ user: req.user.id });
  res.status(200).json({
    status: "success",
    tasks: latestTasks,
  });
});

exports.markComplete = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const task = await Task.findById(id);
  if (!task) {
    return next(new appError("Task does not exist", 404));
  }
  task.isComplete = true;
  task.completedDate = Date.now();
  await task.save({ validateBeforeSave: false });
  const latestTasks = await Task.find({ user: req.user.id });
  res.status(200).json({
    status: "success",
    tasks: latestTasks,
  });
});

exports.deleteTask = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const task = await Task.findByIdAndDelete(id);
  if (!task) {
    return next(new appError("Task does not exist", 404));
  }
  const latestTasks = await Task.find({ user: req.user.id });
  res.status(200).json({
    status: "success",
    message: "Task deleted sucessfully",
    tasks: latestTasks,
  });
});
