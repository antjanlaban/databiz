/**
 * Name template configuration
 */
export interface NameTemplate {
  parts: NameTemplatePart[];
  separator: string;
}

export interface NameTemplatePart {
  type: 'column' | 'text';
  value: string; // Column name or static text
}

/**
 * Generate product name from template and row data
 * @param template Name template configuration
 * @param row Row data object
 * @returns Generated product name
 */
export function generateName(
  template: NameTemplate,
  row: Record<string, any>
): string {
  const parts: string[] = [];

  for (const part of template.parts) {
    if (part.type === 'column') {
      const value = row[part.value];
      if (value !== null && value !== undefined && value !== '') {
        parts.push(String(value).trim());
      }
    } else if (part.type === 'text') {
      parts.push(part.value.trim());
    }
  }

  return parts.join(template.separator || ' | ').trim();
}

/**
 * Generate names for multiple rows
 * @param template Name template configuration
 * @param rows Array of row data objects
 * @returns Array of generated names
 */
export function generateNames(
  template: NameTemplate,
  rows: Record<string, any>[]
): string[] {
  return rows.map(row => generateName(template, row));
}

/**
 * Validate name template
 * @param template Name template to validate
 * @returns Validation result
 */
export function validateTemplate(template: NameTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.parts || template.parts.length === 0) {
    errors.push('Template must have at least one part');
  }

  for (const part of template.parts) {
    if (!part.type || (part.type !== 'column' && part.type !== 'text')) {
      errors.push('Template part must have type "column" or "text"');
    }
    if (!part.value || part.value.trim() === '') {
      errors.push('Template part must have a non-empty value');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check name uniqueness in generated names
 * @param names Array of generated names
 * @returns Uniqueness analysis
 */
export function checkNameUniqueness(names: string[]): {
  unique: number;
  duplicates: number;
  duplicateNames: string[];
  emptyNames: number;
} {
  const nameCounts = new Map<string, number>();
  const emptyNames = names.filter(n => !n || n.trim() === '').length;

  for (const name of names) {
    if (name && name.trim() !== '') {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
  }

  const duplicates = Array.from(nameCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([name, _]) => name);

  const unique = nameCounts.size - duplicates.length;

  return {
    unique,
    duplicates: duplicates.length,
    duplicateNames: duplicates,
    emptyNames,
  };
}

/**
 * Parse template string to NameTemplate
 * Template format: "{column1} | {column2} | Static Text"
 * @param templateString Template string
 * @param availableColumns Array of available column names
 * @returns Parsed template or null if invalid
 */
export function parseTemplateString(
  templateString: string,
  availableColumns: string[]
): NameTemplate | null {
  if (!templateString || templateString.trim() === '') {
    return null;
  }

  // Extract separator (default: " | ")
  const separators = [' | ', ' |', '| ', '|', ' - ', ' -', '- ', '-', ' ', '  '];
  let separator = ' | ';
  let templateText = templateString;

  for (const sep of separators) {
    if (templateString.includes(sep)) {
      separator = sep;
      break;
    }
  }

  // Split by separator
  const parts: NameTemplatePart[] = [];
  const segments = templateText.split(separator);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // Check if it's a column reference {columnName}
    const columnMatch = trimmed.match(/^\{([^}]+)\}$/);
    if (columnMatch) {
      const columnName = columnMatch[1];
      if (availableColumns.includes(columnName)) {
        parts.push({ type: 'column', value: columnName });
      } else {
        // Column not found, treat as text
        parts.push({ type: 'text', value: trimmed });
      }
    } else {
      // Static text
      parts.push({ type: 'text', value: trimmed });
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return { parts, separator };
}

/**
 * Format template as string
 * @param template Name template
 * @returns Formatted template string
 */
export function formatTemplateString(template: NameTemplate): string {
  const parts = template.parts.map(part => {
    if (part.type === 'column') {
      return `{${part.value}}`;
    } else {
      return part.value;
    }
  });

  return parts.join(template.separator || ' | ');
}

/**
 * Create default template from common pattern
 * Pattern: modelnr | merk | modelomschrijving | Kleur | Maat
 * @param availableColumns Array of available column names
 * @returns Default template or null if columns not available
 */
export function createDefaultTemplate(
  availableColumns: string[]
): NameTemplate | null {
  const preferredColumns = [
    'modelnr',
    'modelnummer',
    'artikelnummer',
    'sku',
    'merk',
    'brand',
    'fabrikant',
    'modelomschrijving',
    'omschrijving',
    'naam',
    'name',
    'kleur',
    'color',
    'maat',
    'size',
  ];

  const parts: NameTemplatePart[] = [];
  const foundColumns: string[] = [];

  // Find matching columns (case-insensitive)
  for (const preferred of preferredColumns) {
    const match = availableColumns.find(
      col => col.toLowerCase() === preferred.toLowerCase()
    );
    if (match && !foundColumns.includes(match)) {
      parts.push({ type: 'column', value: match });
      foundColumns.push(match);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return {
    parts,
    separator: ' | ',
  };
}

