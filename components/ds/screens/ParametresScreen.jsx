import React, { useState, useRef } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Switch } from '../../components/forms/Switch.jsx';
import { Tabs } from '../../components/navigation/Tabs.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { useRevealOnOpen, revealElement } from '../utils/revealOnOpen.js';

const TAB_ITEMS = [
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'facturation', label: 'Facturation' },
  { value: 'stock', label: 'Stock & Catégories' },
  { value: 'magasins', label: 'Magasins' },
];

const STORE_TYPE_OPTIONS = [
  { value: 'Point de vente', label: 'Point de vente' },
  { value: 'Entrepôt', label: 'Entrepôt' },
  { value: 'Dépôt relais', label: 'Dépôt relais' },
];

const EMPTY_STORE_FORM = {
  name: '',
  type: 'Dépôt relais',
  city: 'Cotonou',
  address: '',
  main: false,
};

const INITIAL_CATEGORIES = [
  { id: 1, name: 'Fer & Métaux', variants: 12 },
  { id: 2, name: 'Ciment & Liants', variants: 8 },
  { id: 3, name: 'Peintures', variants: 15 },
  { id: 4, name: 'Plomberie', variants: 22 },
  { id: 5, name: 'Électricité', variants: 18 },
];

const INITIAL_STORES = [
  {
    id: 1,
    name: 'Magasin Principal',
    type: 'Point de vente',
    city: 'Cotonou',
    address: 'Boulevard Steinmetz, Akpakpa',
    main: true,
  },
  {
    id: 2,
    name: 'Entrepôt Akpakpa',
    type: 'Entrepôt',
    city: 'Cotonou',
    address: 'Zone Industrielle, Ilot C-12',
    main: false,
  },
  {
    id: 3,
    name: 'Dépôt Calavi',
    type: 'Dépôt relais',
    city: 'Calavi',
    address: 'Cité Les Palmiers, Gbodjè',
    main: false,
  },
];

export default function ParametresScreen({ onNavigate, onDemoAction }) {
  const fileRef = useRef(null);
  const [tab, setTab] = useState('entreprise');
  const [toastMessage, setToastMessage] = useState(null);
  const [logoName, setLogoName] = useState('logo-obasa.png');

  const [company, setCompany] = useState({
    name: 'OBASA MATÉRIAUX & BTP',
    address: 'Lot 112, Boulevard Steinmetz',
    city: 'Cotonou',
    ifu: '3202100456789',
    rccm: 'RB/COT/14 B 1234',
    phone: '+229 21 30 12 45',
  });

  const [billing, setBilling] = useState({
    currency: 'FCFA',
    prefix: 'FACT-2026-',
    startNumber: '0322',
    legalMentions: 'TVA non applicable — Produits soumis aux normes BTP en vigueur au Bénin.',
    autoPrint: true,
    showCashier: true,
  });

  const [stock, setStock] = useState({
    lowThreshold: '10',
    allowZeroSale: true,
  });

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [stores, setStores] = useState(INITIAL_STORES);

  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeForm, setStoreForm] = useState(EMPTY_STORE_FORM);
  const storeFormRef = useRevealOnOpen(showStoreForm);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openCreateStore = () => {
    const alreadyOpen = showStoreForm;
    setEditingStoreId(null);
    setStoreForm(EMPTY_STORE_FORM);
    setShowStoreForm(true);
    if (alreadyOpen) {
      window.setTimeout(() => revealElement(storeFormRef.current), 80);
    }
  };

  const openEditStore = (store) => {
    const alreadyOpen = showStoreForm;
    setEditingStoreId(store.id);
    setStoreForm({
      name: store.name,
      type: store.type,
      city: store.city,
      address: store.address,
      main: !!store.main,
    });
    setShowStoreForm(true);
    if (alreadyOpen) {
      window.setTimeout(() => revealElement(storeFormRef.current), 80);
    }
  };

  const closeStoreForm = () => {
    setShowStoreForm(false);
    setEditingStoreId(null);
    setStoreForm(EMPTY_STORE_FORM);
  };

  const updateStoreField = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setStoreForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitStore = (e) => {
    e?.preventDefault();
    if (!storeForm.name.trim() || !storeForm.address.trim() || !storeForm.city.trim()) {
      showToast('Nom, adresse et ville sont obligatoires.');
      return;
    }

    if (editingStoreId != null) {
      setStores((prev) =>
        prev.map((s) => {
          if (s.id !== editingStoreId) {
            // Un seul magasin principal
            return storeForm.main ? { ...s, main: false } : s;
          }
          return {
            ...s,
            name: storeForm.name.trim(),
            type: storeForm.type,
            city: storeForm.city.trim(),
            address: storeForm.address.trim(),
            main: storeForm.main,
          };
        })
      );
      showToast(`Dépôt « ${storeForm.name.trim()} » mis à jour.`);
    } else {
      const newStore = {
        id: Date.now(),
        name: storeForm.name.trim(),
        type: storeForm.type,
        city: storeForm.city.trim(),
        address: storeForm.address.trim(),
        main: storeForm.main,
      };
      setStores((prev) => {
        const next = storeForm.main
          ? prev.map((s) => ({ ...s, main: false }))
          : prev;
        return [...next, newStore];
      });
      showToast(`Dépôt « ${newStore.name} » créé.`);
    }
    closeStoreForm();
  };

  const updateCompany = (field) => (e) => {
    setCompany((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const updateBilling = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  const updateStock = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setStock((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoName(file.name);
      showToast(`Logo « ${file.name} » prêt (maquette).`);
    }
  };

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    setCategories((prev) => [
      ...prev,
      { id: Date.now(), name, variants: 0 },
    ]);
    setNewCategory('');
    showToast(`Famille « ${name} » ajoutée.`);
  };

  const handleRemoveCategory = (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = () => {
    showToast('Configuration enregistrée — les factures utiliseront ces informations.');
  };

  return (
    <AppShell active="parametres" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-settings-container">
        <div className="ds-settings-scroll">
        <div className="ds-settings-inner">
          {toastMessage && (
            <div className="ds-settings-toast" role="alert">
              <Icon name="check-circle" size={18} color="var(--color-success)" />
              <span>{toastMessage}</span>
            </div>
          )}

          <header className="ds-settings-header">
            <div className="ds-settings-title-area">
              <div className="ds-settings-breadcrumb">
                <span>Administration</span>
                <Icon name="chevron-right" size={12} />
                <span className="ds-settings-active-crumb">Configuration</span>
              </div>
              <div className="ds-settings-h1-row">
                <div className="ds-settings-title-icon">
                  <Icon name="settings" size={22} color="var(--color-primary)" />
                </div>
                <div>
                  <h1 className="ds-settings-h1">Paramètres & Configuration</h1>
                  <p className="ds-settings-subtitle">
                    Entreprise, facturation, stock et magasins — ces réglages alimentent les factures et la caisse.
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="ds-settings-tabs-wrap">
            <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />
          </div>

          {/* ── Entreprise ── */}
          {tab === 'entreprise' && (
            <section className="ds-settings-card">
              <div className="ds-settings-card-header">
                <div className="ds-settings-card-icon">
                  <Icon name="building-2" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-settings-card-title">Entreprise & marque</h3>
                  <p className="ds-settings-card-sub">
                    Informations imprimées sur les factures et reçus (Écran 5).
                  </p>
                </div>
              </div>

              <div className="ds-settings-form-grid">
                <div className="ds-settings-span-2">
                  <Input
                    label="Raison sociale *"
                    value={company.name}
                    onChange={updateCompany('name')}
                  />
                </div>
                <Input
                  label="Adresse"
                  value={company.address}
                  onChange={updateCompany('address')}
                />
                <Input
                  label="Ville"
                  value={company.city}
                  onChange={updateCompany('city')}
                />
                <Input
                  label="Numéro IFU"
                  value={company.ifu}
                  onChange={updateCompany('ifu')}
                />
                <Input
                  label="Numéro RCCM"
                  value={company.rccm}
                  onChange={updateCompany('rccm')}
                />
                <Input
                  label="Téléphone commercial"
                  value={company.phone}
                  onChange={updateCompany('phone')}
                  prefix={<Icon name="phone" size={14} />}
                />
              </div>

              <div className="ds-settings-logo-zone">
                <div className="ds-settings-logo-preview">
                  <Icon name="image" size={28} color="var(--color-primary)" />
                  <span>{logoName}</span>
                </div>
                <div className="ds-settings-logo-actions">
                  <p className="ds-settings-logo-hint">
                    Logo officiel OBASA (PNG ou JPG, fond transparent recommandé).
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="ds-settings-file-input"
                    onChange={handleLogoPick}
                  />
                  <Button
                    variant="outline"
                    iconLeft="upload"
                    onClick={() => fileRef.current?.click()}
                  >
                    Charger un logo
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* ── Facturation ── */}
          {tab === 'facturation' && (
            <section className="ds-settings-card">
              <div className="ds-settings-card-header">
                <div className="ds-settings-card-icon">
                  <Icon name="receipt" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-settings-card-title">Facturation & reçus</h3>
                  <p className="ds-settings-card-sub">
                    Numérotation, devise et mentions légales des tickets.
                  </p>
                </div>
              </div>

              <div className="ds-settings-form-grid">
                <Select
                  label="Devise"
                  value={billing.currency}
                  onChange={updateBilling('currency')}
                  options={[
                    { value: 'FCFA', label: 'FCFA (Franc CFA)' },
                    { value: 'XOF', label: 'XOF' },
                  ]}
                />
                <Input
                  label="Préfixe de numérotation"
                  value={billing.prefix}
                  onChange={updateBilling('prefix')}
                  hint={`Aperçu : ${billing.prefix}${billing.startNumber}`}
                />
                <Input
                  label="Prochain numéro"
                  value={billing.startNumber}
                  onChange={updateBilling('startNumber')}
                />
                <div className="ds-settings-span-2">
                  <label className="ds-settings-textarea-label">Mentions légales (bas de facture)</label>
                  <textarea
                    className="ds-settings-textarea"
                    rows={3}
                    value={billing.legalMentions}
                    onChange={updateBilling('legalMentions')}
                  />
                </div>
              </div>

              <div className="ds-settings-switches">
                <div className="ds-settings-switch-row">
                  <div>
                    <span className="ds-settings-switch-title">Impression automatique après encaissement</span>
                    <span className="ds-settings-switch-hint">Imprime le reçu dès la validation en caisse.</span>
                  </div>
                  <Switch
                    checked={billing.autoPrint}
                    onChange={() => setBilling((p) => ({ ...p, autoPrint: !p.autoPrint }))}
                  />
                </div>
                <div className="ds-settings-switch-row">
                  <div>
                    <span className="ds-settings-switch-title">Afficher le nom du caissier sur le ticket</span>
                    <span className="ds-settings-switch-hint">Traçabilité visible sans clic supplémentaire.</span>
                  </div>
                  <Switch
                    checked={billing.showCashier}
                    onChange={() => setBilling((p) => ({ ...p, showCashier: !p.showCashier }))}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ── Stock & Catégories ── */}
          {tab === 'stock' && (
            <section className="ds-settings-card">
              <div className="ds-settings-card-header">
                <div className="ds-settings-card-icon">
                  <Icon name="warehouse" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-settings-card-title">Stock & catégories</h3>
                  <p className="ds-settings-card-sub">
                    Seuils d’alerte et arborescence des familles produits.
                  </p>
                </div>
              </div>

              <div className="ds-settings-form-grid">
                <Input
                  label="Seuil d'alerte stock faible (unités)"
                  value={stock.lowThreshold}
                  onChange={updateStock('lowThreshold')}
                  hint="Déclenche une notification orange sous ce seuil."
                />
              </div>

              <div className="ds-settings-switches">
                <div className="ds-settings-switch-row">
                  <div>
                    <span className="ds-settings-switch-title">
                      Autoriser la vente si stock à zéro ou non renseigné
                    </span>
                    <span className="ds-settings-switch-hint">
                      Principe fondamental SECS — la caisse ne doit jamais être bloquée.
                    </span>
                  </div>
                  <Switch
                    checked={stock.allowZeroSale}
                    onChange={() => setStock((p) => ({ ...p, allowZeroSale: !p.allowZeroSale }))}
                  />
                </div>
              </div>

              <div className="ds-settings-categories">
                <h4 className="ds-settings-section-h4">
                  <Icon name="folder-tree" size={14} /> Familles de produits
                </h4>
                <div className="ds-settings-cat-add">
                  <Input
                    placeholder="Nouvelle famille (ex: Outillage)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <Button variant="outline" iconLeft="plus" onClick={handleAddCategory}>
                    Ajouter
                  </Button>
                </div>
                <ul className="ds-settings-cat-list">
                  {categories.map((cat) => (
                    <li key={cat.id} className="ds-settings-cat-item">
                      <div>
                        <span className="ds-settings-cat-name">{cat.name}</span>
                        <span className="ds-settings-cat-count">{cat.variants} variantes</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft="trash-2"
                        onClick={() => handleRemoveCategory(cat.id)}
                      >
                        Retirer
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ── Magasins ── */}
          {tab === 'magasins' && (
            <section className="ds-settings-card">
              <div className="ds-settings-card-header">
                <div className="ds-settings-card-icon">
                  <Icon name="map-pin" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-settings-card-title">Magasins & entrepôts</h3>
                  <p className="ds-settings-card-sub">
                    Points de vente et dépôts utilisés pour le stock et les transferts.
                  </p>
                </div>
              </div>

              <div className="ds-settings-stores">
                {stores.map((store) => (
                  <article
                    key={store.id}
                    className={`ds-settings-store-card ${store.main ? 'is-main' : ''} ${editingStoreId === store.id ? 'is-editing' : ''}`}
                  >
                    <div className="ds-settings-store-top">
                      <div className="ds-settings-store-icon">
                        <Icon name={store.main ? 'store' : 'warehouse'} size={18} />
                      </div>
                      <div className="ds-settings-store-titles">
                        <h4 className="ds-settings-store-name">{store.name}</h4>
                        <span className="ds-settings-store-type">{store.type}</span>
                      </div>
                      {store.main ? (
                        <Badge tone="primary">Principal</Badge>
                      ) : (
                        <Badge tone="neutral">Relais</Badge>
                      )}
                    </div>
                    <p className="ds-settings-store-address">
                      {store.address} — {store.city}
                    </p>
                    <div className="ds-settings-store-actions">
                      <Button
                        variant={editingStoreId === store.id ? 'primary' : 'outline'}
                        size="sm"
                        iconLeft="pencil"
                        onClick={() => openEditStore(store)}
                      >
                        Modifier
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="ds-settings-store-add-wrap">
                <Button
                  variant="outline"
                  iconLeft={showStoreForm && editingStoreId == null ? 'x' : 'plus'}
                  onClick={() => {
                    if (showStoreForm && editingStoreId == null) closeStoreForm();
                    else openCreateStore();
                  }}
                >
                  {showStoreForm && editingStoreId == null
                    ? 'Fermer le formulaire'
                    : 'Ajouter un magasin / dépôt'}
                </Button>
              </div>

              {showStoreForm && (
                <form
                  ref={storeFormRef}
                  className="ds-settings-store-form"
                  onSubmit={handleSubmitStore}
                >
                  <div className="ds-settings-store-form-header">
                    <div className="ds-settings-card-icon">
                      <Icon
                        name={editingStoreId != null ? 'pencil' : 'plus'}
                        size={18}
                        color="var(--color-primary)"
                      />
                    </div>
                    <div>
                      <h4 className="ds-settings-card-title">
                        {editingStoreId != null ? 'Modifier le dépôt' : 'Nouveau magasin / dépôt'}
                      </h4>
                      <p className="ds-settings-card-sub">
                        Renseignez le nom, le type et l’adresse du site.
                      </p>
                    </div>
                  </div>

                  <div className="ds-settings-store-form-grid">
                    <Input
                      label="Nom du site *"
                      placeholder="Ex: Nouveau dépôt Calavi"
                      value={storeForm.name}
                      onChange={updateStoreField('name')}
                    />
                    <Select
                      label="Type *"
                      value={storeForm.type}
                      onChange={updateStoreField('type')}
                      options={STORE_TYPE_OPTIONS}
                    />
                    <Input
                      label="Ville *"
                      value={storeForm.city}
                      onChange={updateStoreField('city')}
                    />
                    <Input
                      label="Adresse *"
                      placeholder="Ex: Zone Industrielle, Ilot C-12"
                      value={storeForm.address}
                      onChange={updateStoreField('address')}
                    />
                  </div>

                  <div className="ds-settings-store-form-switch">
                    <div className="ds-settings-store-form-switch-text">
                      <span className="ds-settings-switch-title">Site principal</span>
                      <span className="ds-settings-switch-hint">
                        Un seul magasin principal à la fois pour OBASA.
                      </span>
                    </div>
                    <Switch
                      checked={storeForm.main}
                      onChange={() =>
                        setStoreForm((prev) => ({ ...prev, main: !prev.main }))
                      }
                    />
                  </div>

                  <div className="ds-settings-store-form-footer">
                    <Button type="button" variant="outline" onClick={closeStoreForm}>
                      Annuler
                    </Button>
                    <Button type="submit" variant="primary" iconLeft="check">
                      {editingStoreId != null ? 'Enregistrer les modifications' : 'Créer le dépôt'}
                    </Button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>
        </div>

        {/* Barre ancrée en bas de l’écran (flex, pas position:fixed — reste dans le cadre maquette) */}
        <footer className="ds-settings-savebar">
          <div className="ds-settings-savebar-inner">
            <span className="ds-settings-savebar-hint">
              Les modifications s’appliquent aux factures, à la caisse et aux alertes stock.
            </span>
            <Button variant="primary" iconLeft="save" onClick={handleSave}>
              Enregistrer la configuration
            </Button>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
