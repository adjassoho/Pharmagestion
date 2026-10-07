import React, { useState, useRef, useEffect } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Progress } from '../../components/feedback/Progress.jsx';
import { Radio } from '../../components/forms/Radio.jsx';
import { Tabs } from '../../components/navigation/Tabs.jsx';
import { Calendar } from '../../components/data/Calendar.jsx';

// ── Données de démonstration pour l'aperçu de validation ──
const PREVIEW_ROWS = [
  { name: 'Fer a beton 6mm', family: 'Fer & metaux', priceSell: '3 800', priceBuy: '3 000', unit: 'Barre (12m)', stock: '240', errors: [] },
  { name: 'Ciment CPJ 35 (50kg)', family: 'Ciment & liants', priceSell: '5 200', priceBuy: '', unit: 'Sac (50kg)', stock: '45', errors: ['Prix d\'achat manquant'] },
  { name: '', family: 'Peinture', priceSell: '9 900', priceBuy: '7 500', unit: 'Bidon (5L)', stock: '60', errors: ['Nom du produit manquant'] },
  { name: 'Tuyau PVC 110mm (4m)', family: '', priceSell: '8 500', priceBuy: '6 200', unit: 'Tube (4m)', stock: '26', errors: ['Catégorie inconnue'] },
  { name: 'Disjoncteur 32A', family: 'Electricite', priceSell: '12 800', priceBuy: '9 900', unit: 'Unité', stock: '55', errors: [] },
  { name: 'Peinture blanche mat 1L', family: 'Peinture', priceSell: '', priceBuy: '', unit: 'Bidon (1L)', stock: '120', errors: ['Prix de vente manquant', 'Prix d\'achat manquant'] },
  { name: 'Fil electrique 2.5mm (100m)', family: 'Electricite', priceSell: '18 500', priceBuy: '14 200', unit: 'Rouleau (100m)', stock: '', errors: [] },
  { name: 'Coude PVC 110mm 90°', family: 'Plomberie', priceSell: '1 800', priceBuy: '1 200', unit: 'Unité', stock: '14', errors: [] },
];

const IMPORT_TABS = [
  { value: 'import', label: 'Importer' },
  { value: 'export', label: 'Exporter' },
];

const EXPORT_TYPES = [
  { value: 'sales', label: 'Ventes' },
  { value: 'stats', label: 'Statistiques' },
  { value: 'stock', label: 'Stocks' },
];

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Aujourd\'hui' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
  { value: 'custom', label: 'Personnalisée' },
];

/**
 * ImportExportScreen — Écran 8 « Import / Export Excel » (CDC 3.8, priorité Critique).
 *
 * Deux onglets via Tabs : Import (4 états séquentiels — dépôt → validation →
 * progression → rapport) et Export (choix type + période + confirmation).
 * Erreurs ligne par ligne explicites, jamais génériques.
 */
export default function ImportExportScreen({ onNavigate, onDemoAction }) {
  // Onglet actif
  const [tab, setTab] = useState('import');

  // ── Import states ──
  const fileRef = useRef(null);
  const [importStep, setImportStep] = useState('drop'); // 'drop' | 'validate' | 'progress' | 'report'
  const [importFile, setImportFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // ── Export states ──
  const [exportType, setExportType] = useState('sales');
  const [period, setPeriod] = useState('month');
  const [range, setRange] = useState({ start: null, end: null });
  const [exportDone, setExportDone] = useState(false);

  // ── Import : simuler progression ──
  useEffect(() => {
    if (importStep !== 'progress') return;
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(timer); setImportStep('report'); return 100; }
        return p + Math.random() * 18 + 4;
      });
    }, 350);
    return () => clearInterval(timer);
  }, [importStep]);

  // ── Handlers Import ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { setImportFile(file); setImportStep('validate'); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) { setImportFile(file); setImportStep('validate'); }
  };

  const handleStartImport = () => setImportStep('progress');
  const handleResetImport = () => {
    setImportStep('drop');
    setImportFile(null);
    setProgress(0);
  };

  // ── Handlers Export ──
  const handleExport = () => setExportDone(true);
  const handleResetExport = () => setExportDone(false);

  // Stats pour le rapport
  const errorRows = PREVIEW_ROWS.filter((r) => r.errors.length > 0);
  const successCount = PREVIEW_ROWS.length - errorRows.length;

  // ── Onglet Import ──
  const renderImport = () => {
    switch (importStep) {
      // ── Dépôt ──
      case 'drop':
        return (
          <div className="ds-impexp-body">
            <div className="ds-impexp-dropzone">
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileSelect} />
              <div
                className={`ds-impexp-dropzone-box ${dragOver ? 'ds-impexp-dropzone-over' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click(); }}
              >
                <Icon name="upload" size={36} color="var(--text-tertiary)" />
                <div className="ds-impexp-dropzone-text">Glisser-déposer un fichier Excel ou CSV</div>
                <div className="ds-impexp-dropzone-hint">ou cliquer pour parcourir (.xlsx, .xls, .csv)</div>
              </div>
              <div
                className="ds-impexp-template"
                onClick={() => onDemoAction?.('Télécharger le modèle — action de démonstration')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onDemoAction?.('Télécharger le modèle — action de démonstration'); }}
                style={{ cursor: 'pointer' }}
              >
                <Icon name="download" size={16} color="var(--text-secondary)" />
                <span>Télécharger le modèle de fichier</span>
              </div>
            </div>
          </div>
        );

      // ── Validation ──
      case 'validate':
        return (
          <div className="ds-impexp-body">
            <div className="ds-impexp-validate-header">
              <div>
                <div className="ds-impexp-validate-title">Aperçu avant import</div>
                <div className="ds-impexp-validate-file">{importFile?.name} — {PREVIEW_ROWS.length} lignes détectées</div>
              </div>
            </div>
            <div className="ds-impexp-preview">
              <div className="ds-impexp-preview-table">
                <div className="ds-impexp-preview-head">
                  <span>Article</span><span>Famille</span><span>Prix vente</span><span>Prix achat</span><span>Unité</span><span>Stock</span><span>Status</span>
                </div>
                {PREVIEW_ROWS.map((row, i) => (
                  <div key={i} className={`ds-impexp-preview-row ${row.errors.length > 0 ? 'ds-impexp-preview-row-err' : ''}`}>
                    <span>{row.name || <span className="ds-impexp-cell-empty">—</span>}</span>
                    <span>{row.family || <span className="ds-impexp-cell-empty">—</span>}</span>
                    <span>{row.priceSell || <span className="ds-impexp-cell-empty">—</span>}</span>
                    <span>{row.priceBuy || <span className="ds-impexp-cell-empty">—</span>}</span>
                    <span>{row.unit}</span>
                    <span>{row.stock || <span className="ds-impexp-cell-empty">—</span>}</span>
                    <span>
                      {row.errors.length === 0
                        ? <Badge tone="success">OK</Badge>
                        : row.errors.map((err, j) => <Badge key={j} tone="danger">{err}</Badge>)}
                    </span>
                  </div>
                ))}
              </div>
              {errorRows.length > 0 && (
                <div className="ds-impexp-validate-errors">
                  <Icon name="alert-triangle" size={16} color="var(--status-out-fg)" />
                  <span>{errorRows.length} ligne{errorRows.length > 1 ? 's' : ''} en erreur — les lignes en erreur seront ignorées.</span>
                </div>
              )}
            </div>
            <div className="ds-impexp-validate-actions">
              <Button variant="secondary" size="md" onClick={handleResetImport}>Retour</Button>
              <Button variant="primary" size="md" iconLeft="check" onClick={handleStartImport}>Lancer l'import</Button>
            </div>
          </div>
        );

      // ── Progression ──
      case 'progress':
        return (
          <div className="ds-impexp-body">
            <div className="ds-impexp-progress-wrap">
              <div className="ds-impexp-progress-label">Import en cours…</div>
              <Progress value={Math.round(progress)} tone="primary" label={`${Math.round(progress)}%`} />
              <div className="ds-impexp-progress-file">{importFile?.name}</div>
            </div>
          </div>
        );

      // ── Rapport ──
      case 'report':
        return (
          <div className="ds-impexp-body">
            <div className="ds-impexp-report">
              <div className="ds-impexp-report-icon"><Icon name="check" size={28} color="#fff" /></div>
              <div className="ds-impexp-report-title">Import terminé</div>
              <div className="ds-impexp-report-stats">
                <div className="ds-impexp-report-stat">
                  <span className="ds-impexp-report-stat-num">{successCount}</span>
                  <span className="ds-impexp-report-stat-label">réussies</span>
                </div>
                <div className="ds-impexp-report-stat ds-impexp-report-stat-err">
                  <span className="ds-impexp-report-stat-num">{errorRows.length}</span>
                  <span className="ds-impexp-report-stat-label">en erreur</span>
                </div>
              </div>
              {errorRows.length > 0 && (
                <div className="ds-impexp-report-detail">
                  {errorRows.map((row, i) => (
                    <div key={i} className="ds-impexp-report-row">
                      <span className="ds-impexp-report-row-name">{row.name || '(sans nom)'}</span>
                      {row.errors.map((err, j) => (
                        <Badge key={j} tone="danger">{err}</Badge>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <Button variant="primary" size="md" iconLeft="upload" onClick={handleResetImport}>
                Nouvel import
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Onglet Export ──
  const renderExport = () => {
    if (exportDone) {
      return (
        <div className="ds-impexp-body">
          <div className="ds-impexp-report">
            <div className="ds-impexp-report-icon"><Icon name="check" size={28} color="#fff" /></div>
            <div className="ds-impexp-report-title">Export prêt</div>
            <div className="ds-impexp-report-hint">Le fichier {EXPORT_TYPES.find((t) => t.value === exportType)?.label.toLowerCase()} a été généré.</div>
            <Button variant="primary" size="md" iconLeft="download" onClick={handleResetExport}>
              Nouvel export
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="ds-impexp-body">
        <div className="ds-impexp-export-grid">
          {/* Colonne gauche : type + période */}
          <div className="ds-impexp-export-opts">
            <div className="ds-impexp-export-section">
              <div className="ds-impexp-export-section-title">Type de données</div>
              <div className="ds-impexp-export-radios">
                {EXPORT_TYPES.map((t) => (
                  <Radio
                    key={t.value}
                    name="export-type"
                    label={t.label}
                    checked={exportType === t.value}
                    onChange={() => setExportType(t.value)}
                  />
                ))}
              </div>
            </div>

            <div className="ds-impexp-export-section">
              <div className="ds-impexp-export-section-title">Période</div>
              <div className="ds-impexp-export-radios">
                {PERIOD_OPTIONS.map((p) => (
                  <Radio
                    key={p.value}
                    name="period"
                    label={p.label}
                    checked={period === p.value}
                    onChange={() => setPeriod(p.value)}
                  />
                ))}
              </div>
              {period === 'custom' && (
                <div className="ds-impexp-export-calendar">
                  <Calendar
                    mode="range"
                    range={range}
                    onRangeChange={setRange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : récap + bouton */}
          <div className="ds-impexp-export-recap">
            <div className="ds-impexp-export-recap-title">Récapitulatif</div>
            <div className="ds-impexp-export-recap-row">
              <span>Données</span>
              <span className="ds-impexp-export-recap-val">{EXPORT_TYPES.find((t) => t.value === exportType)?.label}</span>
            </div>
            <div className="ds-impexp-export-recap-row">
              <span>Période</span>
              <span className="ds-impexp-export-recap-val">
                {period === 'custom'
                  ? range.start
                    ? `${range.start.toLocaleDateString('fr-FR')} → ${range.end ? range.end.toLocaleDateString('fr-FR') : '...'}`
                    : '—'
                  : PERIOD_OPTIONS.find((p) => p.value === period)?.label}
              </span>
            </div>
            <Button variant="primary" size="lg" iconLeft="download" fullWidth onClick={handleExport}>
              Exporter
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell active="produits" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-impexp">
        <div className="ds-impexp-inner">
          {/* ── En-tête ── */}
          <div className="ds-impexp-header">
            <h2 className="ds-impexp-title">Import / Export Excel</h2>
            <span className="ds-impexp-subtitle">Gérer les références produits et les données</span>
          </div>

          {/* ── Onglets ── */}
          <Tabs items={IMPORT_TABS} value={tab} onChange={(v) => { setTab(v); if (v === 'import') handleResetImport(); }} />

          {/* ── Contenu ── */}
          {tab === 'import' ? renderImport() : renderExport()}
        </div>
      </div>
    </AppShell>
  );
}
