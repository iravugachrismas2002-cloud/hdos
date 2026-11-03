import "dotenv/config";
import nodemailer from "nodemailer";

const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing SMTP environment variables: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  const recipient = process.env.SMTP_TEST_TO || process.env.SMTP_USER;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const run = async () => {
    console.log("Checking SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection successful!");

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject: "HDOS SMTP Test",
      text: "Congratulations! Your HDOS SMTP configuration is working.",
    });

    console.log(`Email sent successfully. Message ID: ${info.messageId}`);
  };

  run().catch((error: unknown) => {
    console.error(`SMTP ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
