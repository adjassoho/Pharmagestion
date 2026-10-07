import React, { useState } from 'react';
import { Icon } from '../../components/core/Icon.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Button } from '../../components/core/Button.jsx';

/**
 * LoginScreen — Écran 1 « Connexion » (CDC 3.1).
 *
 * Un seul layout responsive : une carte d'authentification centrée qui remplit
 * aussi bien le cadre téléphone que la fenêtre desktop (largeur `min(360px, 100%)`),
 * conforme à DESIGN.md — responsive obligatoire, écran épuré et rassurant.
 * Utilise le mot « OBASA » en typographie (aucun logo inventé) et uniquement les
 * composants/tokens déjà présents dans le design system.
 *
 * Maquette : pas d'authentification réelle, mais les deux exigences du CDC sont
 * démontrées — message d'erreur clair (champs vides) et état de chargement du
 * bouton de connexion.
 */
export default function LoginScreen({ onNavigate, onDemoAction }) {
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!identifiant.trim() || !password.trim()) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onNavigate?.('dashboard');
    }, 1400);
  };

  return (
    <div
      style={{
        minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: 24, background: 'var(--surface-app)', fontFamily: 'var(--font-sans)',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 'min(360px, 100%)', background: 'var(--surface-card)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28,
          display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box',
        }}
      >
        {/* Logo OBASA */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-primary)', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-1.5px', marginBottom: 8, textAlign: 'center' }}>OBASA</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>Connectez-vous à votre espace</div>
        </div>

        {/* Message d'erreur clair (exigence CDC) */}
        {error && (
          <div
            role="alert"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: 'var(--status-out-bg)', color: 'var(--status-out-fg)',
              borderRadius: 'var(--radius-sm)', fontSize: 13,
            }}
          >
            <Icon name="alert-circle" size={16} color="var(--status-out-fg)" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Champs identifiant + mot de passe */}
        <Input
          label="Identifiant"
          placeholder="Nom d'utilisateur"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          autoComplete="username"
        />
        <Input
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          suffix={
            <Icon
              name={showPassword ? 'eye-off' : 'eye'}
              size={16}
              onClick={() => setShowPassword((s) => !s)}
              style={{ cursor: 'pointer' }}
            />
          }
        />

        {/* Bouton de connexion large + état de chargement (exigence CDC) */}
        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? (
            <>
              <Icon name="loader-circle" size={18} className="ds-spin" />
              Connexion…
            </>
          ) : (
            'Se connecter'
          )}
        </Button>

        {/* Mot de passe oublié */}
        <button
          type="button"
          onClick={() => onDemoAction?.('Mot de passe oublié — action de démonstration')}
          style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 600,
            color: 'var(--color-primary)',
          }}
        >
          Mot de passe oublié ?
        </button>
      </form>
    </div>
  );
}
