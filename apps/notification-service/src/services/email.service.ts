import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { env } from '../config/env';
import { NotificationDeliveryError } from '../errors/service.errors';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  html?: string
): Promise<SentMessageInfo> {
  try {
    const result = await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text: body,
      html: html || body,
    });
    return result;
  } catch (error) {
    throw new NotificationDeliveryError('EMAIL', (error as Error).message);
  }
}

export async function sendEmailAdvanced(options: EmailOptions): Promise<SentMessageInfo> {
  try {
    const result = await getTransporter().sendMail({
      from: env.SMTP_FROM,
      ...options,
    });
    return result;
  } catch (error) {
    throw new NotificationDeliveryError('EMAIL', (error as Error).message);
  }
}

export async function sendTemplatedEmail(
  to: string,
  templateId: string,
  templateData: Record<string, unknown>
): Promise<SentMessageInfo> {
  // In a real implementation, you would load and render the template
  // For now, we'll use a simple approach
  const templates: Record<string, { subject: string; body: string }> = {
    'compliance-alert': {
      subject: 'Compliance Status Update',
      body: `Your product compliance status has been updated to: {{status}}`,
    },
    'document-processed': {
      subject: 'Document Processing Complete',
      body: `Your document "{{documentName}}" has been processed successfully.`,
    },
    'welcome': {
      subject: 'Welcome to Veridex',
      body: `Welcome {{userName}}! Your account has been created successfully.`,
    },
    'password-reset': {
      subject: 'Password Reset Request',
      body: `Click here to reset your password: {{resetLink}}`,
    },
  };

  const template = templates[templateId];
  if (!template) {
    throw new NotificationDeliveryError('EMAIL', `Template '${templateId}' not found`);
  }

  // Simple template rendering
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(templateData)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    body = body.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return sendEmail(to, subject, body);
}

export async function verifyConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}

export async function closeTransporter(): Promise<void> {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}
