import React, { useState, useRef } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';

// Familles disponibles (identiques au catalogue, écran 6).
const FAMILIES = [
  { value: 'Fer & metaux', label: 'Fer & métaux' },
  { value: 'Ciment & liants', label: 'Ciment & liants' },
  { value: 'Peinture', label: 'Peinture' },
  { value: 'Plomberie', label: 'Plomberie' },
  { value: 'Electricite', label: 'Électricité' },
];

// Préfixes de référence par famille (3 lettres).
const FAMILY_PREFIX = {
  'Fer & metaux': 'FAB',
  'Ciment & liants': 'CIM',
  'Peinture': 'PEI',
  'Plomberie': 'PLO',
  'Electricite': 'ELE',
};

// Données initiales — mode modification (produit « Fer a beton 10mm »).
// En mode création, même formulaire mais vide et sans bouton Supprimer.
const INITIAL = {
  name: 'Fer a beton 10mm',
  family: 'Fer & metaux',
  reference: 'FAB-010-STD',
  priceSell: '5 200',
  priceBuy: '4 300',
  unit: 'Barre (12m)',
  stock: '18',
};

/**
 * ProduitFicheScreen — Écran 7 « Produits — fiche produit » (CDC 3.7, priorité Haute).
 *
 * Formulaire de création/modification d'un produit. Pré-rempli en mode modification
 * (démonstration). Upload photo via input file caché + aperçu. Référence auto-générée
 * selon la catégorie, modifiable. Suppression en deux temps sans overlay (inline).
 * Succès bref après Enregistrer/Supprimer (pas de backend).
 */
export default function ProduitFicheScreen({ onNavigate, onDemoAction }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({ ...INITIAL, photoFile: null, photoPreview: null });
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0 = normal, 1 = confirmation

  // Met à jour un champ et si c'est la famille, regénère la référence.
  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'family') {
        const prefix = FAMILY_PREFIX[value] || 'REF';
        const seq = String(Math.floor(Math.random() * 900) + 100);
        next.reference = `${prefix}-${seq}-STD`;
      }
      return next;
    });
  };

  // Upload photo
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      photoFile: file,
      photoPreview: URL.createObjectURL(file),
    }));
  };

  const handleSave = () => {
    setSaved(true);
  };

  const handleConfirmDelete = () => {
    setDeleted(true);
  };

  const handleCancelDelete = () => {
    setDeleteStep(0);
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('produits');
    } else {
      setSaved(false);
      setDeleted(false);
      setDeleteStep(0);
    }
  };

  // ── État succès (Enregistré) ──
  if (saved) {
    return (
      <AppShell active="produits" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
        <div className="ds-pform">
          <div className="ds-pform-success">
            <div className="ds-pform-success-icon"><Icon name="check" size={28} color="#fff" /></div>
            <div className="ds-pform-success-title">Produit enregistré</div>
            <div className="ds-pform-success-hint">{form.name} — {form.reference}</div>
            <Button variant="primary" size="lg" iconLeft="package" onClick={handleBack}>
              Retour au catalogue
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── État succès (Supprimé) ──
  if (deleted) {
    return (
      <AppShell active="produits" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
        <div className="ds-pform">
          <div className="ds-pform-success">
            <div className="ds-pform-success-icon ds-pform-success-icon-danger"><Icon name="trash-2" size={28} color="#fff" /></div>
            <div className="ds-pform-success-title">Produit supprimé</div>
            <div className="ds-pform-success-hint">{form.name} a été retiré du catalogue.</div>
            <Button variant="primary" size="lg" iconLeft="package" onClick={handleBack}>
              Retour au catalogue
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Formulaire ──
  return (
    <AppShell active="produits" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-pform">
        <div className="ds-pform-inner">

          {/* ── En-tête ── */}
          <div className="ds-pform-header">
            <h2 className="ds-pform-title">Fiche produit</h2>
            <span className="ds-pform-subtitle">{form.name} — {form.reference}</span>
          </div>

          <div className="ds-pform-grid">
            {/* ── Zone photo ── */}
            <div className="ds-pform-photo">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <div
                className="ds-pform-photo-area"
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click(); }}
                style={form.photoPreview ? { background: `center/cover url(${form.photoPreview})` } : undefined}
              >
                {!form.photoPreview && (
                  <div className="ds-pform-photo-placeholder">
                    <Icon name="image" size={32} color="var(--text-tertiary)" />
                    <span>Cliquer pour ajouter une photo</span>
                  </div>
                )}
              </div>
              {form.photoPreview && (
                <button
                  type="button"
                  className="ds-pform-photo-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setForm((prev) => ({ ...prev, photoFile: null, photoPreview: null }));
                  }}
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>

            {/* ── Formulaire ── */}
            <div className="ds-pform-fields">
              <Input
                label="Nom du produit"
                placeholder="ex: Fer a beton 10mm"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />

              <Select
                label="Catégorie (famille)"
                value={form.family}
                onChange={(e) => updateField('family', e.target.value)}
                options={FAMILIES}
              />
              <div className="ds-pform-field-hint">Sera classé sous {form.family}.</div>

              <div className="ds-pform-ref-row">
                <div className="ds-pform-ref-field">
                  <Input
                    label="Référence"
                    value={form.reference}
                    onChange={(e) => updateField('reference', e.target.value)}
                  />
                </div>
                <span className="ds-pform-ref-note">Générée automatiquement, modifiable</span>
              </div>

              <div className="ds-pform-price-row">
                <Input
                  label="Prix de vente"
                  value={form.priceSell}
                  onChange={(e) => updateField('priceSell', e.target.value)}
                />
                <Input
                  label="Prix d'achat"
                  value={form.priceBuy}
                  onChange={(e) => updateField('priceBuy', e.target.value)}
                />
              </div>

              <Input
                label="Unité & conditionnement"
                placeholder="ex: 50 kg, 1 L, Barre (12m)"
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
              />

              <Input
                label="Stock initial (facultatif)"
                placeholder="ex: 18"
                hint="Peut être renseigné ultérieurement."
                value={form.stock}
                onChange={(e) => updateField('stock', e.target.value)}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="ds-pform-actions">
            {deleteStep === 0 ? (
              <>
                <Button variant="danger" size="md" iconLeft="trash-2" onClick={() => setDeleteStep(1)}>
                  Supprimer
                </Button>
                <div style={{ flex: 1 }} />
                <Button variant="secondary" size="md" onClick={handleBack}>
                  Annuler
                </Button>
                <Button variant="primary" size="md" iconLeft="save" onClick={handleSave}>
                  Enregistrer
                </Button>
              </>
            ) : (
              <div className="ds-pform-delete-confirm">
                <span className="ds-pform-delete-question">Confirmer la suppression de {form.name} ?</span>
                <Button variant="danger" size="md" iconLeft="trash-2" onClick={handleConfirmDelete}>
                  Oui, supprimer
                </Button>
                <Button variant="secondary" size="md" onClick={handleCancelDelete}>
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
