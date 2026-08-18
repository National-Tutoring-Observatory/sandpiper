import parseAnnotationColumn from "./parseAnnotationColumns";

export interface AnnotationCsvMeta {
  headers: string[];
  annotators: string[];
  annotationFields: string[];
  sessionIds: string[];
  valuesByField: Record<string, string[]>;
}

// The preview only samples values, to keep the analyse payload small on long
// transcripts. The upload action checks every cell before accepting a file
const MAX_VALUES_PER_FIELD = 50;

// Parses CSV text into rows, correctly handling multi-line quoted fields
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "\r") continue;

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(current.trim());
      current = "";
      rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  // Handle last field/row
  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

export default function extractAnnotationCsvMeta(
  csvText: string,
): AnnotationCsvMeta {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return {
      headers: [],
      annotators: [],
      annotationFields: [],
      sessionIds: [],
      valuesByField: {},
    };
  }

  const headers = rows[0];

  const annotatorSet = new Set<string>();
  const fieldSet = new Set<string>();
  const annotationColumns: Array<{ columnIndex: number; field: string }> = [];

  headers.forEach((header, columnIndex) => {
    const parsed = parseAnnotationColumn(header);
    if (!parsed) return;

    annotatorSet.add(parsed.annotator);
    fieldSet.add(parsed.field);
    annotationColumns.push({ columnIndex, field: parsed.field });
  });

  const valueSets = new Map<string, Set<string>>();

  for (let i = 1; i < rows.length; i++) {
    for (const column of annotationColumns) {
      const value = rows[i][column.columnIndex];
      if (!value) continue;

      let values = valueSets.get(column.field);
      if (!values) {
        values = new Set<string>();
        valueSets.set(column.field, values);
      }

      if (values.size >= MAX_VALUES_PER_FIELD) continue;
      values.add(value);
    }
  }

  const valuesByField: Record<string, string[]> = {};
  for (const [fieldKey, values] of valueSets) {
    valuesByField[fieldKey] = Array.from(values);
  }

  const sessionIdIndex = headers.indexOf("session_id");
  const sessionIdSet = new Set<string>();

  if (sessionIdIndex !== -1) {
    for (let i = 1; i < rows.length; i++) {
      const sessionId = rows[i][sessionIdIndex];
      if (sessionId) {
        sessionIdSet.add(sessionId);
      }
    }
  }

  return {
    headers,
    annotators: Array.from(annotatorSet),
    annotationFields: Array.from(fieldSet),
    sessionIds: Array.from(sessionIdSet),
    valuesByField,
  };
}
