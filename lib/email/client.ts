// Email behind a thin interface. The rest of the app only ever calls sendEmail();
// it never imports Resend directly. That's what makes a later swap to Amazon SES
// (≈10x cheaper at high volume) a one-file change instead of a rewrite.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM ?? "Stacklight <digest@stackdigest.eu>";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
  });
  if (error) throw new Error(`email send failed: ${error.message}`);
  return { id: data!.id };
}
