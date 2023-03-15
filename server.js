const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app");

dotenv.config({ path: "./config.env" });

const DB = process.env.DB.replace("<PASSWORD>", process.env.DB_password);
const PORT = process.env.PORT || 3000;

mongoose
  .connect(DB)
  .then(() => {
    console.log("Connection to database established");
  })
  .catch((err) => {
    console.log(err);
  });
mongoose.set("strictQuery", false);

const server = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.log({ name: err.name, message: err.message });
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log("ERROR: Shutting down the server");
  console.log(err);
  server.close(() => [process.exit(1)]);
});
