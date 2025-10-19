import Papa from 'papaparse';
import { Lead, CustomField } from '../app/types/crm';

/**
 * Export leads to CSV file
 */
export function exportLeadsToCSV(leads: Lead[], customFields: CustomField[], filename: string = 'leads.csv'): void {
  if (leads.length === 0) {
    console.warn('No leads to export');
    return;
  }

  // Get all visible custom fields
  const visibleCustomFields = customFields.filter(f => f.visible);

  // Build CSV data with headers
  const csvData = leads.map(lead => {
    const row: any = {
      Name: lead.name,
      Email: lead.email,
      Company: lead.company,
      Phone: lead.phone || '',
      Status: lead.status,
      'Created At': lead.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      'Updated At': lead.updatedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // Add custom fields
    visibleCustomFields.forEach(field => {
      const value = lead.customFields?.[field.name];
      row[field.label] = formatCustomFieldForCSV(field, value);
    });

    return row;
  });

  // Convert to CSV
  const csv = Papa.unparse(csvData);

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format custom field value for CSV export
 */
function formatCustomFieldForCSV(field: CustomField, value: any): string {
  if (!value) return '';

  switch (field.type) {
    case 'date':
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    case 'checkbox':
      return Array.isArray(value) ? value.join(', ') : '';
    case 'number':
      return typeof value === 'number' ? value.toString() : value;
    case 'url':
    case 'text':
    case 'textarea':
    case 'select':
    case 'radio':
    default:
      return value.toString();
  }
}
