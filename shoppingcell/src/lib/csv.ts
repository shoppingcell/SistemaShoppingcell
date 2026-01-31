// Minimal CSV parser for Google Sheets export (comma-separated, quoted fields)
// Handles quoted values with escaped double quotes.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];

  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (c === '\n') {
      row.push(field);
      field = '';
      // ignore last empty row
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      continue;
    }

    if (c === '\r') continue;

    field += c;
  }

  // flush
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
