import { spawn } from 'node:child_process';
import path from 'node:path';
import type { Client, Invoice, InvoiceItem, User } from '@prisma/client';

type Props = {
  user: User;
  client: Client;
  invoice: Invoice & { items: InvoiceItem[] };
};

/**
 * Génère le PDF d'une facture dans un sous-processus Node isolé — voir
 * scripts/render-invoice-pdf.tsx pour l'explication du pourquoi (conflit de
 * runtime React entre Next.js et @react-pdf/renderer).
 */
export async function genererPdfFacture(props: Props): Promise<Buffer> {
  const tsxBin = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
  const scriptPath = path.join(process.cwd(), 'scripts', 'render-invoice-pdf.tsx');

  return new Promise((resolve, reject) => {
    const child = spawn(tsxBin, [scriptPath], { cwd: process.cwd() });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Échec de la génération du PDF (code ${code}) : ${Buffer.concat(stderr).toString('utf8')}`));
        return;
      }
      resolve(Buffer.concat(stdout));
    });

    child.stdin.write(JSON.stringify(props));
    child.stdin.end();
  });
}
