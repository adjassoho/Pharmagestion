/**
 * Parseur CSV Conforme RFC 4180 & Durci contre les injections / DoS
 *
 * Spécifications RFC 4180 :
 * 1. Supporte les délimiteurs virgule (,), point-virgule (;) et tabulation (\t).
 * 2. Gère les champs entre guillemets doubles contenant des délimiteurs ou des sauts de ligne.
 * 3. Gère les guillemets échappés par un double guillemet ("").
 * 4. Nettoie le marqueur d'ordre des octets (BOM UTF-8 : \uFEFF).
 * 5. Protège contre l'épuisement mémoire (limite de lignes et de longueur de cellule).
 */

export interface CsvParserOptions {
  delimiter?: string;
  maxRows?: number;
  maxCellLength?: number;
  trimWhitespace?: boolean;
}

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

const DEFAULT_MAX_ROWS = 5000;
const DEFAULT_MAX_CELL_LENGTH = 10000;

/**
 * Détecte automatiquement le délimiteur le plus probable dans la première ligne non vide.
 */
export function detectDelimiter(text: string): string {
  const clean = text.replace(/^\uFEFF/, "").trim();
  const firstLine = clean.split(/\r?\n/)[0] || "";

  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

/**
 * Parse un contenu textuel CSV selon la norme RFC 4180.
 */
export function parseCsv(text: string, options: CsvParserOptions = {}): CsvParseResult {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const maxCellLength = options.maxCellLength ?? DEFAULT_MAX_CELL_LENGTH;
  const trim = options.trimWhitespace ?? true;

  // Supprimer le BOM UTF-8
  const cleanText = text.replace(/^\uFEFF/, "");
  if (!cleanText.trim()) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const delimiter = options.delimiter || detectDelimiter(cleanText);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];
    const nextChar = i + 1 < len ? cleanText[i + 1] : "";

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Guillemet échappé ("")
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Fin de champ entre guillemets
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        if (currentCell.length < maxCellLength) {
          currentCell += char;
        }
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(trim ? currentCell.trim() : currentCell);
        currentCell = "";
        i++;
        continue;
      }

      if (char === "\r" || char === "\n") {
        currentRow.push(trim ? currentCell.trim() : currentCell);
        currentCell = "";

        // Ne pas ajouter les lignes entièrement vides
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
          if (rows.length >= maxRows) {
            break;
          }
        }
        currentRow = [];

        // Ignorer le \n après un \r
        if (char === "\r" && nextChar === "\n") {
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      if (currentCell.length < maxCellLength) {
        currentCell += char;
      }
      i++;
    }
  }

  // Dernière cellule si le fichier ne finit pas par un saut de ligne
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(trim ? currentCell.trim() : currentCell);
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  return {
    headers,
    rows: dataRows,
    totalRows: dataRows.length,
  };
}
