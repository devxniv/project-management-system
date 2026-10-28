import Mailgen from "mailgen"; // builds the email content
import nodemailer from "nodemailer"; // sends it
import { ApiError } from "./apiError.js";

const getMailGenerator = () =>
  new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link:
        process.env.APP_URL ||
        process.env.SERVER_URL ||
        "http://localhost:8000",
    },
  });

// created once and reused (env is read lazily, after dotenv has loaded)
let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_SMTP_HOST,
      port: Number(process.env.MAILTRAP_SMTP_PORT),
      auth: {
        user: process.env.MAILTRAP_SMTP_USER,
        pass: process.env.MAILTRAP_SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
};

const sendEmail = async (options) => {
  const mailGenerator = getMailGenerator();

  const mail = {
    from: process.env.MAIL_FROM || "mail.taskmanager@example.com",
    to: options.email,
    subject: options.subject,
    text: mailGenerator.generatePlaintext(options.mailgenContent),
    html: mailGenerator.generate(options.mailgenContent),
  };

  try {
    await getTransporter().sendMail(mail);
  } catch (error) {
    console.error(
      "Email sending failed. Check the MAILTRAP_* values in your .env file:",
      error.message,
    );
    // callers decide whether to hide this (forgot-password) or show it (resend)
    throw new ApiError(502, "Could not send email. Please try again later.");
  }
};

// ---------- email content ----------

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! We're excited to have you on board.",
      action: {
        instructions:
          "To verify your email, please click on the following button:",
        button: {
          color: "rgb(209, 166, 57)",
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account.",
      action: {
        instructions: "To reset your password, click on the following button:",
        button: {
          color: "rgb(209, 166, 57)",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro: "If you did not request this, you can safely ignore this email.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
