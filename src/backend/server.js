import express from "express";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: {
    message: "Too many submissions. Please try again later.",
  },
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, message, turnstileToken } = req.body;

    if (!name || !email || !message || !turnstileToken) {
      return res.status(400).json({
        message: "Please fill in all fields.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email.",
      });
    }

    if (name.length > 100 || email.length > 150 || message.length > 2000) {
      return res.status(400).json({
        message: "Your message is too long.",
      });
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      },
    );

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.success) {
      return res.status(403).json({
        message: "Human verification failed.",
      });
    }

    await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL,
      to: process.env.CONTACT_TO_EMAIL,
      replyTo: email,
      subject: "🚀 New enquiry from Maliens Website",
      html: `
        <h2>New Website Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    return res.status(200).json({
      message: "Message sent successfully.",
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
