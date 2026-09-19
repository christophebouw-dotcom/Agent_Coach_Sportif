/**
 * Rendu du PDF de facture, exécuté dans un processus Node séparé (via tsx),
 * en dehors du bundler Next.js.
 *
 * Next.js compile tout le code de app/ et de ses imports avec sa propre
 * version interne de React (taguée `react.transitional.element`), pendant
 * que @react-pdf/renderer attend des éléments créés par le React du projet
 * (`react.element`). Les deux ne sont pas compatibles : appeler
 * `renderToBuffer` depuis une route/action Next.js fait planter React avec
 * l'erreur #31 ("Objects are not valid as a React child"). En isolant ce
 * rendu dans un script lancé comme sous-processus, JSX et @react-pdf/renderer
 * utilisent tous les deux le même React, celui de node_modules.
 *
 * Entrée : un JSON {user, client, invoice} sur stdin (voir lib/pdf.ts).
 * Sortie : les octets du PDF sur stdout.
 */
import React from 'react';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Client, Invoice, InvoiceItem, User } from '@prisma/client';
import { formaterMontant } from '../lib/calculations';
import { mentionsLegalesFacture } from '../lib/legalMentions';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  small: { fontSize: 9, color: '#555' },
  block: { marginBottom: 16 },
  blockTitle: { fontSize: 9, textTransform: 'uppercase', color: '#888', marginBottom: 4 },
  addressBlocksRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  table: { display: 'flex', width: 'auto', marginBottom: 16 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingVertical: 6 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: 6, fontWeight: 700 },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.4, textAlign: 'right' },
  colVat: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1.4, textAlign: 'right' },
  totalsBlock: { alignSelf: 'flex-end', width: 220, marginTop: 8 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalsRowFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: '#1a1a1a', fontWeight: 700, fontSize: 12 },
  mentions: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  mentionLine: { fontSize: 8, color: '#555', marginBottom: 2 },
});

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

type Props = {
  user: User;
  client: Client;
  invoice: Invoice & { items: InvoiceItem[] };
};

function FactureDocument({ user, client, invoice }: Props) {
  const mentions = mentionsLegalesFacture(user, invoice);

  return (
    <Document title={`Facture ${invoice.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{user.companyName || user.name}</Text>
            <Text style={styles.small}>{user.addressLine1}</Text>
            {user.addressLine2 ? <Text style={styles.small}>{user.addressLine2}</Text> : null}
            <Text style={styles.small}>{user.postalCode} {user.city}</Text>
            <Text style={styles.small}>{user.country}</Text>
            {user.siret ? <Text style={styles.small}>SIRET : {user.siret}</Text> : null}
            {user.vatNumber ? <Text style={styles.small}>TVA intra. : {user.vatNumber}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>FACTURE</Text>
            <Text style={styles.small}>N° {invoice.number}</Text>
            <Text style={styles.small}>Date d'émission : {formatDate(invoice.issueDate as unknown as string)}</Text>
            <Text style={styles.small}>Date de prestation : {formatDate(invoice.serviceDate as unknown as string)}</Text>
            <Text style={styles.small}>Échéance : {formatDate(invoice.dueDate as unknown as string)}</Text>
          </View>
        </View>

        <View style={styles.addressBlocksRow}>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Client</Text>
            <Text>{client.name}</Text>
            {client.addressLine1 ? <Text style={styles.small}>{client.addressLine1}</Text> : null}
            {client.addressLine2 ? <Text style={styles.small}>{client.addressLine2}</Text> : null}
            <Text style={styles.small}>{client.postalCode} {client.city}</Text>
            {client.siret ? <Text style={styles.small}>SIRET : {client.siret}</Text> : null}
            {client.vatNumber ? <Text style={styles.small}>TVA intra. : {client.vatNumber}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colPrice}>PU HT</Text>
            <Text style={styles.colVat}>TVA</Text>
            <Text style={styles.colTotal}>Total HT</Text>
          </View>
          {invoice.items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formaterMontant(item.unitPriceHT)}</Text>
              <Text style={styles.colVat}>{invoice.vatExempt ? 'N/A' : `${item.vatRate}%`}</Text>
              <Text style={styles.colTotal}>{formaterMontant(item.totalHT)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Total HT</Text>
            <Text>{formaterMontant(invoice.subtotalHT)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>{invoice.vatExempt ? 'TVA (non applicable)' : 'TVA'}</Text>
            <Text>{formaterMontant(invoice.vatTotal)}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text>Total TTC</Text>
            <Text>{formaterMontant(invoice.totalTTC)}</Text>
          </View>
          {invoice.amountPaid > 0 ? (
            <View>
              <View style={styles.totalsRow}>
                <Text>Déjà réglé</Text>
                <Text>{formaterMontant(invoice.amountPaid)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text>Solde dû</Text>
                <Text>{formaterMontant(invoice.totalTTC - invoice.amountPaid)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {user.iban ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Coordonnées de paiement</Text>
            <Text style={styles.small}>IBAN : {user.iban}</Text>
            {user.bic ? <Text style={styles.small}>BIC : {user.bic}</Text> : null}
          </View>
        ) : null}

        {invoice.notes ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Notes</Text>
            <Text style={styles.small}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.mentions}>
          {mentions.map((m, i) => (
            <Text style={styles.mentionLine} key={i}>{m}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

function lireStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const raw = await lireStdin();
  const props: Props = JSON.parse(raw);
  const pdf = await renderToBuffer(<FactureDocument {...props} />);
  process.stdout.write(pdf);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
