import React, { useState, useMemo, useRef, useEffect } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Switch } from '../../components/forms/Switch.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Tabs } from '../../components/navigation/Tabs.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { useRevealOnOpen, createFilterToggleHandler, revealElement } from '../utils/revealOnOpen.js';

const ROLE_OPTIONS = [
  { value: 'gerant', label: 'Gérant / Administrateur' },
  { value: 'stock', label: 'Responsable de Stock' },
  { value: 'caissier', label: 'Caissier' },
];

const ROLE_META = {
  gerant: {
    label: 'Gérant / Admin',
    tone: 'primary',
    permissions: ['Tous les modules', 'Paramètres', 'Utilisateurs', 'Rapports', 'Caisse', 'Stock', 'Achats'],
  },
  stock: {
    label: 'Resp. Stock',
    tone: 'warning',
    permissions: ['Catalogue produits', 'Entrées / Sorties', 'Transferts', 'Stock global'],
  },
  caissier: {
    label: 'Caissier',
    tone: 'success',
    permissions: ['Caisse', 'Enregistrement des ventes', 'Factures', 'Consultation clients'],
  },
};

const TAB_ITEMS = [
  { value: 'accounts', label: 'Gestion des comptes' },
  { value: 'audit', label: "Journal d'audit & d'activité" },
];

const INITIAL_USERS = [
  {
    id: 1,
    name: 'Ambroise Houessou',
    email: 'ambroise@obasa.bj',
    username: 'ambroise.h',
    role: 'gerant',
    active: true,
    lastLogin: '2026-07-26T08:12:00',
    initials: 'AH',
  },
  {
    id: 2,
    name: 'Afiavi Koudjo',
    email: 'afiavi@obasa.bj',
    username: 'afiavi.k',
    role: 'stock',
    active: true,
    lastLogin: '2026-07-26T07:45:00',
    initials: 'AK',
  },
  {
    id: 3,
    name: 'Serge Adjovi',
    email: 'serge@obasa.bj',
    username: 'serge.a',
    role: 'caissier',
    active: true,
    lastLogin: '2026-07-25T18:30:00',
    initials: 'SA',
  },
  {
    id: 4,
    name: 'Chantal Dossou',
    email: 'chantal@obasa.bj',
    username: 'chantal.d',
    role: 'caissier',
    active: true,
    lastLogin: '2026-07-26T09:05:00',
    initials: 'CD',
  },
  {
    id: 5,
    name: 'Pascal Zinsou',
    email: 'pascal@obasa.bj',
    username: 'pascal.z',
    role: 'stock',
    active: false,
    lastLogin: '2026-06-12T14:20:00',
    initials: 'PZ',
  },
  {
    id: 6,
    name: 'Mariette Bio',
    email: 'mariette@obasa.bj',
    username: 'mariette.b',
    role: 'caissier',
    active: true,
    lastLogin: '2026-07-24T16:50:00',
    initials: 'MB',
  },
];

const INITIAL_AUDIT = [
  { id: 1, at: '2026-07-26T09:42:00', userId: 3, userName: 'Serge Adjovi', module: 'Caisse', action: 'Vente encaissée FAC-2026-0321 — 245 000 FCFA', type: 'vente' },
  { id: 2, at: '2026-07-26T09:15:00', userId: 2, userName: 'Afiavi Koudjo', module: 'Stock', action: 'Entrée BL-2026-0847 — Ciment CPA × 120', type: 'stock' },
  { id: 3, at: '2026-07-26T08:50:00', userId: 4, userName: 'Chantal Dossou', module: 'Caisse', action: 'Vente encaissée FAC-2026-0320 — 89 500 FCFA', type: 'vente' },
  { id: 4, at: '2026-07-26T08:20:00', userId: 1, userName: 'Ambroise Houessou', module: 'Produits', action: 'Modification prix Fer 8mm (3 000 → 3 100 FCFA)', type: 'produit' },
  { id: 5, at: '2026-07-25T17:40:00', userId: 2, userName: 'Afiavi Koudjo', module: 'Stock', action: 'Sortie manuelle — casse Peinture 5L × 2', type: 'stock' },
  { id: 6, at: '2026-07-25T16:10:00', userId: 3, userName: 'Serge Adjovi', module: 'Caisse', action: 'Vente encaissée FAC-2026-0318 — 412 000 FCFA', type: 'vente' },
  { id: 7, at: '2026-07-25T14:05:00', userId: 1, userName: 'Ambroise Houessou', module: 'Utilisateurs', action: 'Désactivation du compte Pascal Zinsou', type: 'admin' },
  { id: 8, at: '2026-07-25T11:30:00', userId: 2, userName: 'Afiavi Koudjo', module: 'Stock', action: 'Transfert TR-048 Magasin → Dépôt Relais', type: 'stock' },
  { id: 9, at: '2026-07-24T19:00:00', userId: 6, userName: 'Mariette Bio', module: 'Caisse', action: 'Vente encaissée FAC-2026-0310 — 156 000 FCFA', type: 'vente' },
  { id: 10, at: '2026-07-24T10:15:00', userId: 1, userName: 'Ambroise Houessou', module: 'Produits', action: 'Ajout produit « Coude PVC 110mm 90° »', type: 'produit' },
];

const ACTION_TYPES = [
  { value: 'vente', label: 'Ventes' },
  { value: 'stock', label: 'Stock' },
  { value: 'produit', label: 'Produits' },
  { value: 'admin', label: 'Administration' },
];

const PAGE_SIZE = 6;

const EMPTY_FORM = {
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'caissier',
  active: true,
};

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { label: role, tone: 'neutral' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function UserAvatar({ initials, name }) {
  return (
    <div className="ds-users-avatar" title={name} aria-hidden>
      {initials}
    </div>
  );
}

export default function UtilisateursRolesScreen({ onNavigate, onDemoAction }) {
  const nextId = useRef(20);

  const [tab, setTab] = useState('accounts');
  const [users, setUsers] = useState(INITIAL_USERS);
  const [audit] = useState(INITIAL_AUDIT);
  const [toastMessage, setToastMessage] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Audit filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterUserIds, setFilterUserIds] = useState([]);
  const [filterTypes, setFilterTypes] = useState([]);
  const [auditPage, setAuditPage] = useState(1);

  const formRef = useRevealOnOpen(showForm);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const filteredAudit = useMemo(() => {
    return audit.filter((row) => {
      if (filterUserIds.length > 0 && !filterUserIds.includes(row.userId)) return false;
      if (filterTypes.length > 0 && !filterTypes.includes(row.type)) return false;
      return true;
    });
  }, [audit, filterUserIds, filterTypes]);

  const auditPageCount = Math.max(1, Math.ceil(filteredAudit.length / PAGE_SIZE));
  const safeAuditPage = Math.min(auditPage, auditPageCount);
  const paginatedAudit = filteredAudit.slice(
    (safeAuditPage - 1) * PAGE_SIZE,
    safeAuditPage * PAGE_SIZE
  );

  useEffect(() => {
    setAuditPage(1);
  }, [filterUserIds, filterTypes]);

  const activeFilterCount = filterUserIds.length + filterTypes.length;

  const toggleFilterUser = (id) => {
    setFilterUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleFilterType = (type) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetAuditFilters = () => {
    setFilterUserIds([]);
    setFilterTypes([]);
  };

  const openCreateForm = () => {
    const alreadyOpen = showForm;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setTab('accounts');
    if (alreadyOpen) {
      window.setTimeout(() => revealElement(formRef.current), 80);
    }
  };

  const openEditForm = (user) => {
    const alreadyOpen = showForm;
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
      active: user.active,
    });
    setShowForm(true);
    setTab('accounts');
    if (alreadyOpen) {
      window.setTimeout(() => revealElement(formRef.current), 80);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateField = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.username.trim()) return;
    if (!editingId && !form.password.trim()) return;

    if (editingId != null) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== editingId) return u;
          return {
            ...u,
            name: form.name.trim(),
            email: form.email.trim(),
            username: form.username.trim(),
            role: form.role,
            active: form.active,
            initials: form.name
              .trim()
              .split(/\s+/)
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
          };
        })
      );
      showToast(`Compte « ${form.name.trim()} » mis à jour.`);
    } else {
      const initials = form.name
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const newUser = {
        id: nextId.current++,
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        role: form.role,
        active: form.active,
        lastLogin: null,
        initials,
      };
      setUsers((prev) => [newUser, ...prev]);
      showToast(`Compte « ${newUser.name} » créé avec succès.`);
    }
    closeForm();
  };

  const toggleActive = (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const next = !target.active;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: next } : u))
    );
    showToast(
      next
        ? `Compte « ${target.name} » réactivé.`
        : `Compte « ${target.name} » désactivé.`
    );
  };

  const rolePreview = ROLE_META[form.role] || ROLE_META.caissier;

  return (
    <AppShell active="utilisateurs" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-users-container">
        <div className="ds-users-inner">
          {toastMessage && (
            <div className="ds-users-toast" role="alert">
              <Icon name="check-circle" size={18} color="var(--color-success)" />
              <span>{toastMessage}</span>
            </div>
          )}

          <header className="ds-users-header">
            <div className="ds-users-title-area">
              <div className="ds-users-breadcrumb">
                <span>Administration</span>
                <Icon name="chevron-right" size={12} />
                <span className="ds-users-active-crumb">Utilisateurs & rôles</span>
              </div>
              <div className="ds-users-h1-row">
                <div className="ds-users-title-icon">
                  <Icon name="user-cog" size={22} color="var(--color-primary)" />
                </div>
                <div>
                  <h1 className="ds-users-h1">Administration des Utilisateurs</h1>
                  <p className="ds-users-subtitle">
                    Trois profils simples — Gérant, Stock, Caissier — avec journal d’activité pour l’audit.
                  </p>
                </div>
              </div>
            </div>

            <div className="ds-users-header-actions">
              {tab === 'audit' && (
                <Button
                  variant={showFilters ? 'primary' : 'outline'}
                  iconLeft="sliders-horizontal"
                  onClick={handleFiltersToggle}
                >
                  Filtres
                  {activeFilterCount > 0 && (
                    <span className="ds-users-filter-badge">{activeFilterCount}</span>
                  )}
                </Button>
              )}
              <Button variant="primary" iconLeft="user-plus" onClick={openCreateForm}>
                + Créer un compte utilisateur
              </Button>
            </div>
          </header>

          <div className="ds-users-tabs-wrap">
            <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />
          </div>

          {showForm && tab === 'accounts' && (
            <section ref={formRef} className="ds-users-form-card">
              <div className="ds-users-form-header">
                <div className="ds-users-form-title-group">
                  <div className="ds-users-form-icon">
                    <Icon name={editingId ? 'pencil' : 'user-plus'} size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <h3 className="ds-users-form-title">
                      {editingId ? 'Modifier le compte' : 'Créer un compte utilisateur'}
                    </h3>
                    <p className="ds-users-form-sub">
                      Choisissez un profil type — les permissions s’affichent automatiquement.
                    </p>
                  </div>
                </div>
                <span className="ds-users-form-tag">{editingId ? 'Modification' : 'Nouveau compte'}</span>
              </div>

              <form onSubmit={handleSubmit} className="ds-users-form-body">
                <div className="ds-users-form-grid">
                  <div className="ds-users-field ds-span-2">
                    <Input
                      label="Nom complet *"
                      placeholder="Ex: Ambroise Houessou"
                      value={form.name}
                      onChange={updateField('name')}
                    />
                  </div>
                  <div className="ds-users-field">
                    <Input
                      label="E-mail / Identifiant *"
                      placeholder="Ex: ambroise@obasa.bj"
                      value={form.email}
                      onChange={updateField('email')}
                      prefix={<Icon name="mail" size={14} />}
                    />
                  </div>
                  <div className="ds-users-field">
                    <Input
                      label="Nom d'utilisateur *"
                      placeholder="Ex: ambroise.h"
                      value={form.username}
                      onChange={updateField('username')}
                      prefix={<Icon name="at-sign" size={14} />}
                    />
                  </div>
                  <div className="ds-users-field">
                    <Input
                      label={editingId ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={updateField('password')}
                      prefix={<Icon name="lock" size={14} />}
                    />
                  </div>
                  <div className="ds-users-field">
                    <Select
                      label="Rôle principal *"
                      value={form.role}
                      onChange={updateField('role')}
                      options={ROLE_OPTIONS}
                    />
                  </div>
                  <div className="ds-users-field ds-users-switch-field">
                    <span className="ds-users-switch-label">Compte actif</span>
                    <div className="ds-users-switch-row">
                      <Switch
                        checked={form.active}
                        onChange={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                      />
                      <span>{form.active ? 'Actif' : 'Inactif'}</span>
                    </div>
                  </div>
                </div>

                <div className="ds-users-permissions-preview">
                  <h4 className="ds-users-section-h4">
                    <Icon name="shield" size={14} /> Permissions du profil « {rolePreview.label} »
                  </h4>
                  <div className="ds-users-perm-chips">
                    {rolePreview.permissions.map((p) => (
                      <span key={p} className="ds-users-perm-chip">{p}</span>
                    ))}
                  </div>
                </div>

                <div className="ds-users-form-footer">
                  <span className="ds-users-form-hint">* Champs obligatoires</span>
                  <div className="ds-users-form-btns">
                    <Button type="button" variant="outline" onClick={closeForm}>
                      Annuler
                    </Button>
                    <Button type="submit" variant="primary" iconLeft="check">
                      {editingId ? 'Enregistrer' : 'Créer le compte'}
                    </Button>
                  </div>
                </div>
              </form>
            </section>
          )}

          {tab === 'accounts' && (
            <section className="ds-users-list-card">
              <div className="ds-users-table-header">
                <div className="ds-users-search-wrapper">
                  <Icon name="search" size={16} className="ds-users-search-icon" />
                  <input
                    type="text"
                    className="ds-users-search-input"
                    placeholder="Rechercher par nom, e-mail ou identifiant…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <span className="ds-users-count-badge">
                  {filteredUsers.length} compte{filteredUsers.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="ds-users-table-wrapper">
                <table className="ds-users-table">
                  <thead>
                    <tr>
                      <th>UTILISATEUR</th>
                      <th>IDENTIFIANT / E-MAIL</th>
                      <th>RÔLE</th>
                      <th>STATUT</th>
                      <th>DERNIÈRE CONNEXION</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="ds-users-empty-td">
                          <Icon name="users" size={32} color="var(--text-tertiary)" />
                          <p>Aucun utilisateur trouvé.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => (
                        <tr key={user.id} className="ds-users-row">
                          <td>
                            <div className="ds-users-name-cell">
                              <UserAvatar initials={user.initials} name={user.name} />
                              <div>
                                <span className="ds-users-name">{user.name}</span>
                                <span className="ds-users-username">@{user.username}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="ds-users-email">{user.email}</span>
                          </td>
                          <td>
                            <RoleBadge role={user.role} />
                          </td>
                          <td>
                            <div className="ds-users-status-cell">
                              <Switch
                                checked={user.active}
                                onChange={() => toggleActive(user.id)}
                              />
                              <Badge tone={user.active ? 'success' : 'neutral'}>
                                {user.active ? 'Actif' : 'Inactif'}
                              </Badge>
                            </div>
                          </td>
                          <td>
                            <span className="ds-users-last-login">
                              {formatDateTime(user.lastLogin)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              iconLeft="pencil"
                              onClick={() => openEditForm(user)}
                            >
                              Modifier
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ds-users-mobile-list">
                {paginatedUsers.length === 0 ? (
                  <div className="ds-users-empty-td">
                    <Icon name="users" size={32} color="var(--text-tertiary)" />
                    <p>Aucun utilisateur trouvé.</p>
                  </div>
                ) : (
                  paginatedUsers.map((user) => (
                    <article key={user.id} className="ds-users-mobile-card">
                      <div className="ds-users-mobile-card-top">
                        <div className="ds-users-name-cell">
                          <UserAvatar initials={user.initials} name={user.name} />
                          <div>
                            <span className="ds-users-name">{user.name}</span>
                            <span className="ds-users-username">@{user.username}</span>
                          </div>
                        </div>
                        <RoleBadge role={user.role} />
                      </div>
                      <div className="ds-users-mobile-meta">
                        <div className="ds-users-mobile-meta-row">
                          <span className="ds-users-mobile-meta-label">E-mail</span>
                          <span className="ds-users-email">{user.email}</span>
                        </div>
                        <div className="ds-users-mobile-meta-row">
                          <span className="ds-users-mobile-meta-label">Statut</span>
                          <div className="ds-users-status-cell">
                            <Switch
                              checked={user.active}
                              onChange={() => toggleActive(user.id)}
                            />
                            <Badge tone={user.active ? 'success' : 'neutral'}>
                              {user.active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                        </div>
                        <div className="ds-users-mobile-meta-row">
                          <span className="ds-users-mobile-meta-label">Dernière connexion</span>
                          <span className="ds-users-last-login">{formatDateTime(user.lastLogin)}</span>
                        </div>
                      </div>
                      <div className="ds-users-mobile-actions">
                        <Button
                          variant="outline"
                          size="sm"
                          iconLeft="pencil"
                          onClick={() => openEditForm(user)}
                        >
                          Modifier
                        </Button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="ds-users-pagination-bar">
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  onChange={setPage}
                  total={filteredUsers.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            </section>
          )}

          {tab === 'audit' && (
            <div ref={filtersRef} className="ds-catalog-content-layout ds-users-content-layout">
              <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
                <div className="ds-filter-group">
                  <h4 className="ds-filter-title">UTILISATEUR</h4>
                  <div className="ds-filter-list">
                    {users.map((u) => {
                      const isChecked = filterUserIds.includes(u.id);
                      const count = audit.filter((a) => a.userId === u.id).length;
                      return (
                        <div
                          key={u.id}
                          className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                          onClick={() => toggleFilterUser(u.id)}
                        >
                          <Checkbox checked={isChecked} onChange={() => {}} />
                          <span className="ds-filter-item-label">{u.name.split(' ')[0]}</span>
                          <span className="ds-filter-item-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="ds-filter-group">
                  <h4 className="ds-filter-title">TYPE D'ACTION</h4>
                  <div className="ds-filter-list">
                    {ACTION_TYPES.map((t) => {
                      const isChecked = filterTypes.includes(t.value);
                      const count = audit.filter((a) => a.type === t.value).length;
                      return (
                        <div
                          key={t.value}
                          className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                          onClick={() => toggleFilterType(t.value)}
                        >
                          <Checkbox checked={isChecked} onChange={() => {}} />
                          <span className="ds-filter-item-label">{t.label}</span>
                          <span className="ds-filter-item-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button type="button" className="ds-filter-reset-btn" onClick={resetAuditFilters}>
                    <Icon name="rotate-ccw" size={13} />
                    Réinitialiser les filtres
                  </button>
                )}
              </aside>

              <main className="ds-users-main">
                <section className="ds-users-list-card">
                  <div className="ds-users-table-header">
                    <div className="ds-users-audit-intro">
                      <Icon name="scroll-text" size={16} color="var(--color-primary)" />
                      <span>Traçabilité horodatée des actions critiques</span>
                    </div>
                    <span className="ds-users-count-badge">
                      {filteredAudit.length} événement{filteredAudit.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="ds-users-table-wrapper">
                    <table className="ds-users-table ds-users-table-audit">
                      <thead>
                        <tr>
                          <th>HORODATAGE</th>
                          <th>UTILISATEUR</th>
                          <th>MODULE</th>
                          <th>ACTION RÉALISÉE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAudit.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="ds-users-empty-td">
                              <Icon name="scroll-text" size={32} color="var(--text-tertiary)" />
                              <p>Aucun événement pour ces filtres.</p>
                            </td>
                          </tr>
                        ) : (
                          paginatedAudit.map((row) => (
                            <tr key={row.id} className="ds-users-row">
                              <td>
                                <span className="ds-users-audit-time">{formatDateTime(row.at)}</span>
                              </td>
                              <td>
                                <span className="ds-users-name">{row.userName}</span>
                              </td>
                              <td>
                                <Badge
                                  tone={
                                    row.type === 'vente'
                                      ? 'success'
                                      : row.type === 'stock'
                                        ? 'warning'
                                        : row.type === 'admin'
                                          ? 'primary'
                                          : 'neutral'
                                  }
                                >
                                  {row.module}
                                </Badge>
                              </td>
                              <td>
                                <span className="ds-users-audit-action">{row.action}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="ds-users-mobile-list">
                    {paginatedAudit.length === 0 ? (
                      <div className="ds-users-empty-td">
                        <Icon name="scroll-text" size={32} color="var(--text-tertiary)" />
                        <p>Aucun événement pour ces filtres.</p>
                      </div>
                    ) : (
                      paginatedAudit.map((row) => (
                        <article key={row.id} className="ds-users-mobile-card">
                          <div className="ds-users-mobile-card-top">
                            <div>
                              <span className="ds-users-name">{row.userName}</span>
                              <span className="ds-users-audit-time">{formatDateTime(row.at)}</span>
                            </div>
                            <Badge
                              tone={
                                row.type === 'vente'
                                  ? 'success'
                                  : row.type === 'stock'
                                    ? 'warning'
                                    : row.type === 'admin'
                                      ? 'primary'
                                      : 'neutral'
                              }
                            >
                              {row.module}
                            </Badge>
                          </div>
                          <p className="ds-users-mobile-audit-action">{row.action}</p>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="ds-users-pagination-bar">
                    <Pagination
                      page={safeAuditPage}
                      pageCount={auditPageCount}
                      onChange={setAuditPage}
                      total={filteredAudit.length}
                      pageSize={PAGE_SIZE}
                    />
                  </div>
                </section>
              </main>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
