import nodemailer from "nodemailer";
import { randomUUID } from "crypto";

// SMTP Configuration using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Company email for notifications
export const COMPANY_EMAIL = process.env.COMPANY_EMAIL || process.env.SMTP_USER || "";
export const COMPANY_NAME = process.env.COMPANY_NAME || "Sabka Tech Bazar";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
// IMPORTANT: For Gmail SMTP, the FROM address MUST match the SMTP_USER to avoid spam
export const EMAIL_FROM = process.env.SMTP_USER || "";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text alternative
  replyTo?: string;
}

// Convert HTML to plain text for email
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&copy;/g, '(c)')
    .replace(/₹/g, 'Rs.')
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
    .trim();
}

export async function sendEmail({ to, subject, html, text, replyTo }: EmailOptions): Promise<boolean> {
  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error("Email error: SMTP_USER or SMTP_PASSWORD not configured");
      return false;
    }

    // CRITICAL: Use SMTP_USER as FROM address for Gmail to avoid spam
    // Gmail requires the FROM address to match the authenticated account
    const fromAddress = process.env.SMTP_USER;
    const messageId = `<${randomUUID()}@${process.env.SMTP_HOST || "gmail.com"}>`;
    
    await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${fromAddress}>`,
      to,
      subject,
      html,
      text: text || htmlToPlainText(html), // Always include plain text
      replyTo: replyTo || COMPANY_EMAIL || fromAddress,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'Sabka Tech Bazar Mailer',
        'X-Priority': '3', // Normal priority
        'Precedence': 'bulk',
      },
    });
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// Verify SMTP connection
export async function verifyEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return { 
        success: false, 
        error: "SMTP_USER or SMTP_PASSWORD not configured" 
      };
    }
    
    await transporter.verify();
    console.log("[v0] SMTP connection verified");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[v0] SMTP connection failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
