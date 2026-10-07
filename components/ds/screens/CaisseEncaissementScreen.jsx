import React, { useState, useMemo } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';

// Panier de démonstration (maquette — reprend le parcours de l'écran 3, données factices).
const CART = [
  { name: 'Fer a beton 8mm', qty: 3, price: 4500 },
  { name: 'Ciment CPA 42.5 (50kg)', qty: 2, price: 5800 },
  { name: 'Peinture blanche mat 5L', qty: 1, price: 9900 },
];
const TOTAL = CART.reduce((s, x) => s + x.price * x.qty, 0);

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

function formatFCFA(n) {
  return n.toLocaleString('fr-FR');
}

/** Keypad — pavé numérique large (CDC 3.4 : "pavé numérique large sur mobile"), tactile, sans clavier OS. */
function Keypad({ onKey }) {
  return (
    <div className="ds-pay-keypad">
      {KEYS.map((k) => (
        <button
          key={k}
          className={`ds-pay-key ${k === 'C' || k === '⌫' ? 'ds-pay-key-alt' : ''}`}
          onClick={() => onKey(k)}
          aria-label={k === 'C' ? 'Effacer' : k === '⌫' ? 'Corriger' : k}
        >
          {k === '⌫' ? <Icon name="delete" size={20} /> : k}
        </button>
      ))}
    </div>
  );
}

/**
 * CaisseEncaissementScreen — Écran 4 « Caisse — encaissement » (CDC 3.4, écran critique).
 *
 * Un seul layout responsive (container queries) : récapitulatif du panier + total d'un côté,
 * pavé numérique + monnaie à rendre de l'autre — côte à côte dès que le cadre est assez large,
 * empilés sinon. La monnaie à rendre est l'information reine (typographie "display" 48-64px,
 * CDC + DESIGN.md) : toujours la plus grande, lisible à distance par le caissier et le client.
 * Gestion d'erreur explicite si le montant reçu est insuffisant — jamais de blocage silencieux.
 */
export default function CaisseEncaissementScreen({ onNavigate, onDemoAction }) {
  const [amount, setAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const received = amount === '' ? 0 : parseInt(amount, 10);
  const change = received - TOTAL;
  const hasInput = amount !== '';
  const insufficient = hasInput && received < TOTAL;
  const canConfirm = hasInput && received >= TOTAL;

  const pressKey = (k) => {
    if (k === 'C') return setAmount('');
    if (k === '⌫') return setAmount((a) => a.slice(0, -1));
    setAmount((a) => (a === '0' ? k : a + k).slice(0, 9));
  };

  if (confirmed) {
    return (
      <AppShell active="caisse" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-pay">
        <div className="ds-pay-success">
          <div className="ds-pay-success-icon"><Icon name="check" size={32} color="#fff" /></div>
          <div className="ds-pay-success-title">Vente enregistrée</div>
          <div className="ds-pay-success-hint">Facture generee — enchainement vers l'ecran Facture (Ecran 5, a venir).</div>
          <div className="ds-pay-success-change">Monnaie rendue : {formatFCFA(change)} FCFA</div>
          <Button variant="primary" size="lg" iconLeft="plus" onClick={() => {
            if (onNavigate) {
              onNavigate('caisse');
            } else {
              setConfirmed(false);
              setAmount('');
            }
          }}>
            Nouvelle vente
          </Button>
        </div>
      </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="caisse" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
    <div className="ds-pay">
      <div className="ds-pay-inner">
        <div className="ds-pay-title">Encaissement</div>

        <div className="ds-pay-grid">
          {/* Récapitulatif du panier + total */}
          <div className="ds-pay-recap">
            <div className="ds-pay-recap-list">
              {CART.map((item) => (
                <div key={item.name} className="ds-pay-recap-row">
                  <span className="ds-pay-recap-name">{item.name} <span className="ds-pay-recap-qty">×{item.qty}</span></span>
                  <span className="ds-pay-recap-price">{formatFCFA(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="ds-pay-total-row">
              <span className="ds-pay-total-label">Total a payer</span>
              <span className="ds-pay-total-value">{formatFCFA(TOTAL)} <span className="ds-pay-currency">FCFA</span></span>
            </div>
          </div>

          {/* Montant reçu + pavé numérique + monnaie à rendre */}
          <div className="ds-pay-panel">
            <div>
              <div className="ds-pay-field-label">Montant reçu</div>
              <div className="ds-pay-amount-display">
                <span>{hasInput ? formatFCFA(received) : '0'}</span>
                <span className="ds-pay-currency">FCFA</span>
              </div>
            </div>

            <Keypad onKey={pressKey} />

            <div className={`ds-pay-change ${insufficient ? 'is-danger' : canConfirm ? 'is-success' : ''}`}>
              <div className="ds-pay-change-label">
                {insufficient ? 'Montant insuffisant' : 'Monnaie à rendre'}
              </div>
              <div className="ds-pay-change-value">
                {insufficient ? `− ${formatFCFA(Math.abs(change))}` : formatFCFA(Math.max(0, change))} <span className="ds-pay-currency">FCFA</span>
              </div>
              {insufficient && <div className="ds-pay-change-hint">Il manque {formatFCFA(Math.abs(change))} FCFA pour couvrir le total.</div>}
            </div>

            <Button variant="primary" size="lg" fullWidth iconLeft="check" disabled={!canConfirm} onClick={() => {
              if (onNavigate) {
                onNavigate('facture');
              } else {
                setConfirmed(true);
              }
            }}>
              Confirmer l'encaissement
            </Button>
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
