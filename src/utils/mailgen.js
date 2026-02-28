import Mailgen from "mailgen";//creates content
import nodemailer from "nodemailer";//sends it

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://taskmanagelink.com",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "mail.taskmanager@example.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      "Email service failed silently. Make sure that you have provided your MAILTRAP credentials in the .env file",
    );
    console.error("Error: ", error);
  }
};
//content for mails
const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we're excited to have you on board.",
      action: {
        instructions:
          " To verify your email please click on the fallowing button",
        button: {
          color: "rgb(209, 166, 57)",
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, paswordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions:
          " To reset the password click on the fallowing button or link",
        button: {
          color: "rgb(209, 166, 57)",
          text: "reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? just reply to this email, we'd love to help.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
