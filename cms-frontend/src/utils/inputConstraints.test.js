import { describe, expect, it, vi } from 'vitest';
import {
  blockInvalidDecimalKeys,
  blockInvalidIntegerKeys,
  blockInvalidSignedIntegerKeys,
  sanitizeAlphaLabel,
  sanitizeCode,
  sanitizeCurrency,
  sanitizeMaskedAccount,
  sanitizePersonName,
  sanitizePhone,
  sanitizeReference,
  sanitizeScriptureRef,
  sanitizeSignedInteger,
  sanitizeWholeNumber,
} from './inputConstraints';

describe('inputConstraints', () => {
  it('sanitizes person names by stripping digits and special symbols while keeping Filipino accents and punctuation', () => {
    expect(sanitizePersonName('  Juan123!@# Niño-dela Cruz, Jr. $%^')).toBe('Juan Niño-dela Cruz Jr. ');
  });

  it('sanitizes phone numbers by keeping only digits and phone formatting characters', () => {
    expect(sanitizePhone('abc +63 (917) 123-4567 xyz!@#')).toBe('+63 (917) 123-4567 ');
  });

  it('normalizes short codes to uppercase alphanumeric characters', () => {
    expect(sanitizeCode('ya-team_1!@# ')).toBe('YA-TEAM_1');
  });

  it('sanitizes receipt/reference codes and masked account numbers', () => {
    expect(sanitizeReference('  OR#2026-001/A <script>')).toBe('OR#2026-001/A script');
    expect(sanitizeMaskedAccount('BPI ****-4821!@#')).toBe('****-4821');
  });

  it('sanitizes alpha labels and scripture references', () => {
    expect(sanitizeAlphaLabel('Sister-in-law 123!')).toBe('Sister-in-law ');
    expect(sanitizeScriptureRef('1 John 4:7-12; Psalm 23:1 @#$')).toBe('1 John 4:7-12; Psalm 23:1 ');
  });

  it('sanitizes whole numbers, signed integers, and currency decimals', () => {
    expect(sanitizeWholeNumber('12a3.4', { max: 500 })).toBe('500');
    expect(sanitizeWholeNumber('0042')).toBe('42');
    expect(sanitizeWholeNumber('abc')).toBe('');
    expect(sanitizeSignedInteger('-15a.4')).toBe('-154');
    expect(sanitizeSignedInteger('-')).toBe('-');
    expect(sanitizeCurrency('1234.5678')).toBe('1234.56');
    expect(sanitizeCurrency('abc-99.5')).toBe('99.5');
    expect(sanitizeCurrency('.75')).toBe('0.75');
  });

  it('blocks scientific notation and invalid sign keys on number inputs', () => {
    const prevent = vi.fn();
    blockInvalidIntegerKeys({ key: 'e', preventDefault: prevent });
    blockInvalidIntegerKeys({ key: '.', preventDefault: prevent });
    blockInvalidSignedIntegerKeys({ key: 'E', preventDefault: prevent });
    blockInvalidDecimalKeys({ key: '-', preventDefault: prevent });
    expect(prevent).toHaveBeenCalledTimes(4);
  });
});
