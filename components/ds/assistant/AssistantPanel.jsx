import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Badge } from '../feedback/Badge.jsx';

const DEMO_MESSAGES = [
  { from: 'assistant', text: 'Bonjour ! Je peux répondre à des questions sur vos ventes, votre stock ou vos rapports.' },
  { from: 'user', text: 'Quel produit se vend le mieux cette semaine ?' },
  { from: 'assistant', text: 'Fer à béton 8mm arrive en tête avec 184 unités vendues.' },
];

/**
 * AssistantPanel — slide-over chat UI for an AI assistant. This is a static,
 * canned-message demo shell (no real model call) illustrating the pattern —
 * distinct from the Dashboard's "Insights IA" zone, which per DESIGN.md
 * Phase 5 stays a non-functional visual placeholder and must never be wired
 * to this or any live assistant.
 */
export function AssistantPanel({ open, onClose, messages = DEMO_MESSAGES }) {
  if (!open) return null;
  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 340, maxWidth: '90vw',
        background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)', zIndex: 120,
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)',
      },
    },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-default)' } },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement(Icon, { name: 'sparkles', size: 18, color: 'var(--color-primary)' }),
        React.createElement('span', { style: { fontSize: 16, fontWeight: 600 } }, 'Assistant SECS'),
        React.createElement(Badge, { tone: 'warning' }, 'aperçu')
      ),
      React.createElement(Icon, { name: 'x', size: 18, color: 'var(--text-secondary)', onClick: onClose, style: { cursor: 'pointer' } })
    ),
    React.createElement(
      'div',
      { style: { flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 } },
      messages.map((m, i) => React.createElement(
        'div',
        {
          key: i,
          style: {
            alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.from === 'user' ? 'var(--color-primary)' : 'var(--gray-100)',
            color: m.from === 'user' ? '#fff' : 'var(--text-primary)',
            padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 14, lineHeight: 1.4,
          },
        },
        m.text
      ))
    ),
    React.createElement(
      'div',
      { style: { padding: 16, borderTop: '1px solid var(--border-default)', display: 'flex', gap: 8 } },
      React.createElement('input', {
        placeholder: 'Poser une question…',
        disabled: true,
        style: {
          flex: 1, height: 40, padding: '0 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
          fontSize: 14, background: 'var(--gray-50)',
        },
      }),
      React.createElement(
        'div',
        { style: { width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        React.createElement(Icon, { name: 'send', size: 16, color: 'var(--text-tertiary)' })
      )
    )
  );
}
