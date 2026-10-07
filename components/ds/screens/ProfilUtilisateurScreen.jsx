import React, { useState } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';

const PROFILE = {
  firstName: 'Koffi',
  lastName: 'Adanhoun',
  email: 'koffi.adanhoun@obasa.bj',
  phone: '+229 97 12 45 88',
  username: 'koffi.a',
  role: 'Caissier Principal',
  store: 'Magasin Principal OBASA — Cotonou',
  status: 'Actif',
  initials: 'KA',
};

const RECENT_ACTIVITY = [
  { id: 1, at: '2026-07-26T09:42:00', action: 'Encaissement Facture FAC-2026-0321 — 245 000 FCFA', icon: 'receipt' },
  { id: 2, at: '2026-07-26T08:10:00', action: 'Connexion réussie depuis Magasin Principal', icon: 'log-in' },
  { id: 3, at: '2026-07-25T18:55:00', action: 'Encaissement Facture FAC-2026-0318 — 89 500 FCFA', icon: 'receipt' },
  { id: 4, at: '2026-07-25T14:20:00', action: 'Consultation fiche client BTP Bénin Sarl', icon: 'users' },
  { id: 5, at: '2026-07-25T08:05:00', action: 'Connexion réussie', icon: 'log-in' },
];

function formatDateTime(iso) {
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

export default function ProfilUtilisateurScreen({ onNavigate, onDemoAction }) {
  const [info, setInfo] = useState({
    firstName: PROFILE.firstName,
    lastName: PROFILE.lastName,
    email: PROFILE.email,
    phone: PROFILE.phone,
  });
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [loggedOut, setLoggedOut] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const updateInfo = (field) => (e) => {
    setInfo((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const updatePassword = (field) => (e) => {
    setPasswords((prev) => ({ ...prev, [field]: e.target.value }));
    if (passwordError) setPasswordError('');
  };

  const handleUpdateInfo = (e) => {
    e?.preventDefault();
    if (!info.firstName.trim() || !info.lastName.trim() || !info.email.trim()) {
      showToast('Veuillez renseigner prénom, nom et e-mail.');
      return;
    }
    showToast('Informations personnelles mises à jour.');
  };

  const handleUpdatePassword = (e) => {
    e?.preventDefault();
    if (!passwords.current.trim()) {
      setPasswordError('Le mot de passe actuel est requis.');
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setPasswordError('');
    setPasswords({ current: '', next: '', confirm: '' });
    showToast('Mot de passe modifié avec succès.');
  };

  const handleLogout = () => {
    if (onNavigate) {
      onNavigate('login');
    } else {
      setLoggedOut(true);
      showToast('Déconnexion effectuée (maquette).');
    }
  };

  return (
    <AppShell active="parametres" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-profile-container">
        <div className="ds-profile-inner">
          {toastMessage && (
            <div className="ds-profile-toast" role="alert">
              <Icon name="check-circle" size={18} color="var(--color-success)" />
              <span>{toastMessage}</span>
            </div>
          )}

          <header className="ds-profile-header">
            <div className="ds-profile-breadcrumb">
              <span>Paramètres</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-profile-active-crumb">Mon profil</span>
            </div>
            <h1 className="ds-profile-h1">Profil utilisateur</h1>
            <p className="ds-profile-subtitle">
              Consultez votre identité, mettez à jour vos informations et sécurisez votre accès.
            </p>
          </header>

          {/* Carte d'identité */}
          <section className="ds-profile-identity">
            <div className="ds-profile-avatar" aria-hidden>
              {PROFILE.initials}
            </div>
            <div className="ds-profile-identity-body">
              <h2 className="ds-profile-name">
                {info.firstName} {info.lastName.toUpperCase()}
              </h2>
              <div className="ds-profile-badges">
                <Badge tone="primary">{PROFILE.role}</Badge>
                <Badge tone="success">{PROFILE.status}</Badge>
              </div>
              <p className="ds-profile-meta">
                <Icon name="store" size={14} />
                {PROFILE.store}
              </p>
              <p className="ds-profile-meta">
                <Icon name="at-sign" size={14} />
                {PROFILE.username.replace(/^@+/, "")}
              </p>
            </div>
          </section>

          <div className="ds-profile-grid">
            {/* Infos personnelles */}
            <section className="ds-profile-card">
              <div className="ds-profile-card-header">
                <div className="ds-profile-card-icon">
                  <Icon name="user" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-profile-card-title">Informations personnelles</h3>
                  <p className="ds-profile-card-sub">Coordonnées affichées sur votre compte SECS.</p>
                </div>
              </div>
              <form onSubmit={handleUpdateInfo} className="ds-profile-form">
                <div className="ds-profile-form-grid">
                  <Input
                    label="Prénom *"
                    value={info.firstName}
                    onChange={updateInfo('firstName')}
                  />
                  <Input
                    label="Nom *"
                    value={info.lastName}
                    onChange={updateInfo('lastName')}
                  />
                  <Input
                    label="Adresse e-mail *"
                    value={info.email}
                    onChange={updateInfo('email')}
                    prefix={<Icon name="mail" size={14} />}
                  />
                  <Input
                    label="Téléphone"
                    value={info.phone}
                    onChange={updateInfo('phone')}
                    prefix={<Icon name="phone" size={14} />}
                  />
                </div>
                <div className="ds-profile-form-footer">
                  <Button type="submit" variant="primary" iconLeft="check">
                    Mettre à jour les informations
                  </Button>
                </div>
              </form>
            </section>

            {/* Mot de passe */}
            <section className="ds-profile-card">
              <div className="ds-profile-card-header">
                <div className="ds-profile-card-icon">
                  <Icon name="key" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-profile-card-title">Sécurité & mot de passe</h3>
                  <p className="ds-profile-card-sub">
                    Saisissez le mot de passe actuel, puis le nouveau (confirmation obligatoire).
                  </p>
                </div>
              </div>
              <form onSubmit={handleUpdatePassword} className="ds-profile-form">
                <div className="ds-profile-form-stack">
                  <Input
                    label="Mot de passe actuel *"
                    type="password"
                    value={passwords.current}
                    onChange={updatePassword('current')}
                    prefix={<Icon name="lock" size={14} />}
                  />
                  <Input
                    label="Nouveau mot de passe *"
                    type="password"
                    value={passwords.next}
                    onChange={updatePassword('next')}
                    prefix={<Icon name="shield" size={14} />}
                    hint="8 caractères minimum"
                  />
                  <Input
                    label="Confirmer le nouveau mot de passe *"
                    type="password"
                    value={passwords.confirm}
                    onChange={updatePassword('confirm')}
                    prefix={<Icon name="shield-check" size={14} />}
                    error={passwordError || undefined}
                  />
                </div>
                <div className="ds-profile-form-footer">
                  <Button type="submit" variant="primary" iconLeft="key">
                    Modifier le mot de passe
                  </Button>
                </div>
              </form>
            </section>
          </div>

          {/* Activité récente */}
          <section className="ds-profile-card">
            <div className="ds-profile-card-header">
              <div className="ds-profile-card-icon">
                <Icon name="history" size={18} color="var(--color-primary)" />
              </div>
              <div>
                <h3 className="ds-profile-card-title">Mon activité récente</h3>
                <p className="ds-profile-card-sub">Les 5 dernières opérations rattachées à votre compte.</p>
              </div>
            </div>
            <ul className="ds-profile-activity">
              {RECENT_ACTIVITY.map((item) => (
                <li key={item.id} className="ds-profile-activity-item">
                  <div className="ds-profile-activity-icon">
                    <Icon name={item.icon} size={16} />
                  </div>
                  <div className="ds-profile-activity-body">
                    <span className="ds-profile-activity-action">{item.action}</span>
                    <span className="ds-profile-activity-time">{formatDateTime(item.at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Déconnexion */}
          <section className={`ds-profile-logout ${loggedOut ? 'is-logged-out' : ''}`}>
            <div className="ds-profile-logout-text">
              <h3 className="ds-profile-logout-title">
                <Icon name="log-out" size={18} />
                Déconnexion
              </h3>
              <p className="ds-profile-logout-sub">
                {loggedOut
                  ? 'Vous êtes déconnecté (simulation maquette). Rechargez l’écran pour réinitialiser.'
                  : 'Termine votre session SECS sur cet appareil. Les opérations en cours doivent être clôturées avant.'}
              </p>
            </div>
            <Button
              variant="danger"
              iconLeft="log-out"
              onClick={handleLogout}
              disabled={loggedOut}
            >
              Se déconnecter
            </Button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
