import { describe, expect, it } from 'vitest';
import {
  CHURCH_REPORT_BANNER,
  CHURCH_REPORT_BANNER_DARK,
  CHURCH_REPORT_LOGO,
} from './reportBranding';

describe('report branding', () => {
  it('exposes the banner lockups', () => {
    expect(CHURCH_REPORT_BANNER).toBe('/brand/mcc-lockup.png');
    expect(CHURCH_REPORT_BANNER_DARK).toBe('/brand/mcc-lockup-white.png');
  });

  it('keeps the legacy logo path for existing report consumers', () => {
    expect(CHURCH_REPORT_LOGO).toBe('/logo.jpg');
  });
});
