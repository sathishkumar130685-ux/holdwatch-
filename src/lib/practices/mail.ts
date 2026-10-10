import nodemailer from "nodemailer";

export type MailStatus = {
  ready: boolean;
  to: string[];
  from: string;
  via: "resend" | "smtp" | null;
};

export function mailStatus(): MailStatus {
  const to = (process.env.PRACTICE_MAIL_TO ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const from = (process.env.PRACTICE_MAIL_FROM || process.env.SMTP_USER || "").trim();
  const resend = Boolean(process.env.RESEND_API_KEY && from);
  const smtp = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && from,
  );
  const via = resend ? "resend" : smtp ? "smtp" : null;
  return { ready: to.length > 0 && via !== null, to, from, via };
}

export async function sendMail(message: {
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const status = mailStatus();
  if (!status.ready || !status.via) {
    throw new Error(
      "Weekly email is not configured. Set PRACTICE_MAIL_TO and either Resend or SMTP values.",
    );
  }

  if (status.via === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: status.from,
        to: status.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`The email service rejected the message (${response.status}). ${detail}`);
    }
    return;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: status.from,
    to: status.to.join(", "),
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
