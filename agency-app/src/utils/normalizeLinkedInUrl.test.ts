import { normalizeLinkedInUrl } from './normalizeLinkedInUrl';

describe('normalizeLinkedInUrl', () => {
  const goldenCases: Array<[string, string]> = [
    ['https://www.linkedin.com/in/ahmed-sameh/', 'linkedin.com/in/ahmed-sameh'],
    ['https://linkedin.com/in/Ahmed-Sameh', 'linkedin.com/in/ahmed-sameh'],
    ['www.linkedin.com/in/ahmed-sameh?originalSubdomain=eg', 'linkedin.com/in/ahmed-sameh'],
    ['HTTPS://LINKEDIN.COM/in/ahmed-sameh/#experience', 'linkedin.com/in/ahmed-sameh'],
    ['linkedin.com//in//ahmed-sameh', 'linkedin.com/in/ahmed-sameh'],
  ];

  test.each(goldenCases)('normalizes %s → %s', (input, expected) => {
    expect(normalizeLinkedInUrl(input)).toBe(expected);
  });

  test('returns empty string for empty input', () => {
    expect(normalizeLinkedInUrl('')).toBe('');
  });

  test('trims whitespace', () => {
    expect(normalizeLinkedInUrl('  https://linkedin.com/in/foo  ')).toBe('linkedin.com/in/foo');
  });
});
