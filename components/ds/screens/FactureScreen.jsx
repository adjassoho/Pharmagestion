import React from 'react';
import AppShell from './AppShell.jsx';
import { Button } from '../../components/core/Button.jsx';

// Données de démonstration — continuité narrative avec CaisseEncaissementScreen (écran 4).
const INVOICE = {
  number: 'FACT-2026-000482',
  date: '18/07/2026 — 14:32',
  cashier: 'Ambroise H.',
  items: [
    { name: 'Fer a beton 8mm', qty: 3, unitPrice: 4500 },
    { name: 'Ciment CPA 42.5 (50kg)', qty: 2, unitPrice: 5800 },
    { name: 'Peinture blanche mat 5L', qty: 1, unitPrice: 9900 },
  ],
  total: 35000,
  received: 40000,
  change: 5000,
};

function formatFCFA(n) {
  return n.toLocaleString('fr-FR');
}

/**
 * FactureScreen — Écran 5 « Facture » (CDC 3.5, écran critique).
 *
 * Affiche la facture générée après une vente : identité OBASA, numéro, date,
 * caissier (traçabilité visible sans clic), articles, total, récapitulatif de
 * paiement, et trois actions : télécharger PDF, imprimer, nouvelle vente.
 *
 * Layout responsive unique via Container Queries : contenu et actions côte à
 * côte sur écran large, empilés sur mobile.
 */
export default function FactureScreen({ onNavigate, onDemoAction }) {
  return (
    <AppShell active="ventes" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-invoice">
        <div className="ds-invoice-inner">
          {/* ── En-tête : branding OBASA + métadonnées ── */}
          <div className="ds-invoice-header">
            <div className="ds-invoice-logo" style={{ color: 'var(--color-primary)', fontWeight: 900, fontSize: '2rem', letterSpacing: '-1px' }}>OBASA</div>
            <div className="ds-invoice-meta">
              <span>Facture N° {INVOICE.number}</span>
              <span>{INVOICE.date}</span>
              <span>Caissier : {INVOICE.cashier}</span>
            </div>
          </div>

          {/* ── Contenu principal (articles + total + récap) ── */}
          <div className="ds-invoice-body">
            {/* Tableau des articles */}
            <div className="ds-invoice-table">
              <div className="ds-invoice-table-header">
                <span className="ds-invoice-col-article">Article</span>
                <span className="ds-invoice-col-qty">Qté</span>
                <span className="ds-invoice-col-unit">P.U.</span>
                <span className="ds-invoice-col-subtotal">Sous-total</span>
              </div>
              {INVOICE.items.map((item) => (
                <div key={item.name} className="ds-invoice-table-row">
                  <span className="ds-invoice-col-article">{item.name}</span>
                  <span className="ds-invoice-col-qty">×{item.qty}</span>
                  <span className="ds-invoice-col-unit">{formatFCFA(item.unitPrice)}</span>
                  <span className="ds-invoice-col-subtotal">{formatFCFA(item.qty * item.unitPrice)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="ds-invoice-total">
              <span className="ds-invoice-total-label">Total</span>
              <span className="ds-invoice-total-value">{formatFCFA(INVOICE.total)} <span className="ds-invoice-currency">FCFA</span></span>
            </div>

            {/* Récapitulatif de paiement */}
            <div className="ds-invoice-payment">
              <div className="ds-invoice-payment-row">
                <span>Montant reçu</span>
                <span className="ds-invoice-payment-amount">{formatFCFA(INVOICE.received)} FCFA</span>
              </div>
              <div className="ds-invoice-payment-row">
                <span>Monnaie rendue</span>
                <span className="ds-invoice-payment-change">{formatFCFA(INVOICE.change)} FCFA</span>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="ds-invoice-actions">
            <Button variant="secondary" size="lg" iconLeft="download" fullWidth onClick={() => onDemoAction?.('Télécharger PDF — action de démonstration')}>
              Télécharger PDF
            </Button>
            <Button variant="secondary" size="lg" iconLeft="printer" fullWidth onClick={() => onDemoAction?.('Imprimer — action de démonstration')}>
              Imprimer
            </Button>
            <Button variant="primary" size="lg" iconLeft="plus" fullWidth onClick={() => onNavigate?.('caisse')}>
              Nouvelle vente
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
