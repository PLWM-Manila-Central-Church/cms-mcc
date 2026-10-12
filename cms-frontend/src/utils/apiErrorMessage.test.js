import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './apiErrorMessage';

describe('apiErrorMessage', () => {
  it('prefers the API error envelope message', () => {
    expect(apiErrorMessage({ response: { data: { error: { message: 'Capacity cannot be below current RSVPs.' } } } }, 'Fallback'))
      .toBe('Capacity cannot be below current RSVPs.');
  });

  it('supports legacy top-level message responses', () => {
    expect(apiErrorMessage({ response: { data: { message: 'Registration deadline has passed.' } } }, 'Fallback'))
      .toBe('Registration deadline has passed.');
  });

  it('uses the supplied fallback for missing or non-text messages', () => {
    expect(apiErrorMessage({ response: { data: { error: { code: 'CONFLICT' } } } }, 'Service could not be saved.'))
      .toBe('Service could not be saved.');
    expect(apiErrorMessage(null, 'The request failed.')).toBe('The request failed.');
  });
});
