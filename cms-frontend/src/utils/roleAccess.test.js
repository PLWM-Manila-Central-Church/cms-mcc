import { isAllowedForRolePath } from './roleAccess';

describe('Member route access', () => {
  it('allows the member portal and nested portal settings only', () => {
    expect(isAllowedForRolePath('Member', '/portal')).toBe(true);
    expect(isAllowedForRolePath('Member', '/portal/settings')).toBe(true);
  });

  it('blocks CMS modules and redirects the Member to the portal', () => {
    expect(isAllowedForRolePath('Member', '/dashboard')).toBe(false);
    expect(isAllowedForRolePath('Member', '/members')).toBe(false);
    expect(isAllowedForRolePath('Member', '/finance')).toBe(false);
    expect(isAllowedForRolePath('Member', '/events')).toBe(false);
    expect(isAllowedForRolePath('Member', '/archives')).toBe(false);
  });

  it('keeps password-change and unauthorized routes available to route guards', () => {
    expect(isAllowedForRolePath('Member', '/force-change-password')).toBe(true);
    expect(isAllowedForRolePath('Member', '/unauthorized')).toBe(true);
  });

  it('does not change the System Admin path allowlist behavior', () => {
    expect(isAllowedForRolePath('System Admin', '/members')).toBe(true);
    expect(isAllowedForRolePath('System Admin', '/dashboard')).toBe(true);
  });
});
