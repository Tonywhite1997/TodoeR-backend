const express = require("express");
const authController = require("../controllers/authController");
const tasksController = require("../controllers/taskController");

const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .post(authController.restrictTo("user"), tasksController.createTask)
  .get(tasksController.getTasks);

router
  .route("/:id")
  .get(tasksController.getTask)
  .patch(tasksController.updateTask)
  .delete(tasksController.deleteTask);

router.patch("/:id/markComplete", tasksController.markComplete);

module.exports = router;
