import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsv } from './csv';

describe('CSV export safety', () => {
  it('quotes delimiters and doubles embedded quotes', () => {
    expect(escapeCsvCell('Chair, "folding"')).toBe('"Chair, ""folding"""');
  });

  it('neutralizes formula-like text while preserving numeric negative values', () => {
    expect(escapeCsvCell('=HYPERLINK("https://example.invalid")')).toBe('"\'=HYPERLINK(""https://example.invalid"")"');
    expect(escapeCsvCell('  @SUM(A1:A2)')).toBe('"\'  @SUM(A1:A2)"');
    expect(escapeCsvCell(-125)).toBe('"-125"');
  });

  it('serializes rows as CRLF-delimited CSV', () => {
    expect(toCsv([['Section', 'Value'], ['Income', 10]])).toBe('"Section","Value"\r\n"Income","10"');
  });
});
