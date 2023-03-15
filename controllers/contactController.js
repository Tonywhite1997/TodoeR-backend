const path = require("path");
const nodemailer = require("nodemailer");
const pug = require("pug");
const { convert } = require("html-to-text");
const catchAsync = require("../utils/catchAsync");
const appError = require("../utils/appError");

// exports.contactUs =  catchAsync(req,res,next)=>({

// )}

exports.contactUs = catchAsync(async (req, res, next) => {
  const { email, message, name } = req.body;

  if (!email || !message) {
    return next(new appError("cant sent empty message", 404));
  }

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const templatePath = path.join(__dirname, `../view/email/message.pug`);
  const html = pug.renderFile(templatePath, {
    email,
    message,
    name,
  });
  const emailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: process.env.EMAIL_USERNAME,
    subject: "Client Message",
    replyTo: email,
    html,
    text: convert(html),
  };
  await transporter.sendMail(emailOptions);

  const followUpTemplatePath = path.join(
    __dirname,
    `../view/email/receive.pug`
  );
  const reply =
    "Dear " +
    name +
    ",\n\nThank you for contacting us! We appreciate your interest in our product/service and we're excited to have the opportunity to assist you.\n\nWe will review your message and aim to respond to all inquiries within 24 hours. In the meantime, please feel free to follow us on social media to stay up to date with our latest news, updates, and promotions.\n\nBest regards,\nTony\nTodoeR";
  const followUpHtml = pug.renderFile(followUpTemplatePath, {
    email,
    name,
    reply,
  });
  const followUpEmailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: "Thank you for contacting us",
    html: followUpHtml,
    text: convert(followUpHtml),
  };
  await transporter.sendMail(followUpEmailOptions);
  res.status(200).json({
    message: "success",
  });
});
