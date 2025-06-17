import { ORG_EMAIL_PASS, ORG_SUPPORT_EMAIL } from "@/config/constants";
import nodemailer from "nodemailer";
// Set up transporter
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ORG_SUPPORT_EMAIL,// Your email
    pass: ORG_EMAIL_PASS, // App password
  },
});
