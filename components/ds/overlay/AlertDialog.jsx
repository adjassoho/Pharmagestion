import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Button } from '../core/Button.jsx';

/** AlertDialog — confirmation for destructive/critical actions (delete product, cancel sale). Distinct from Dialog: always has an icon + explicit confirm/cancel pair. */
export function AlertDialog({ open, tone = 'danger', title, description, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', onConfirm, onCancel }) {
  if (!open) return null;
  const iconName = tone === 'danger' ? 'triangle-alert' : 'circle-help';
  const iconColor = tone === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)';
  return React.createElement(
    'div',
    { style: { position: 'absolute', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 } },
    React.createElement(
      'div',
      { style: { width: 380, maxWidth: 'calc(100% - 32px)', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-modal)', padding: 24, fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 32px)' } },
      React.createElement(Icon, { name: iconName, size: 28, color: iconColor }),
      React.createElement('div', { style: { fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 } }, title),
      description && React.createElement('div', { style: { fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5, overflowY: 'auto' } }, description),
      React.createElement(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 22, flexShrink: 0 } },
        React.createElement(Button, { variant: 'secondary', onClick: onCancel }, cancelLabel),
        React.createElement(Button, { variant: tone === 'danger' ? 'danger' : 'primary', onClick: onConfirm }, confirmLabel)
      )
    )
  );
}
