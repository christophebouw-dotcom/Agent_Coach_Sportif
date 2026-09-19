import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    // Pas de SMTP configuré : on journalise au lieu d'échouer, pratique en dev/démo.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporter;
}

export async function envoyerEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || 'Facturation Intelligente <factures@exemple.fr>';

  const info = await t.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  });

  if (!process.env.SMTP_HOST) {
    // Mode démo : on trace l'email envoyé dans les logs serveur.
    console.log('[mailer] SMTP non configuré — email simulé :', {
      to: options.to,
      subject: options.subject,
    });
  }

  return info;
}
