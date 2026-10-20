import { describe, expect, it } from 'vitest';
import { displayAccount, displayMemberName } from './displayIdentity';

describe('displayIdentity', () => {
  it('shows a single-name member without a leading comma', () => {
    expect(displayMemberName({ first_name: 'Cher', last_name: '' })).toBe('Cher');
  });

  it('keeps surname-first formatting for members with both names', () => {
    expect(displayMemberName({ first_name: 'Maria', last_name: 'Dela Cruz' })).toBe('Dela Cruz, Maria');
  });

  it('uses neutral fallbacks for missing member and former account identities', () => {
    expect(displayMemberName(null)).toBe('Member record');
    expect(displayAccount('deleted-user-42@accounts.invalid')).toBe('Former staff account');
  });
});
