import { describe, expect, it } from 'vitest';
import { archiveDownloadName, archiveDownloadPath } from './archiveDownload';

describe('archive download helpers', () => {
  it('uses authenticated API resource paths for current and historical files', () => {
    expect(archiveDownloadPath(12)).toBe('/archives/12/file');
    expect(archiveDownloadPath(12, 4)).toBe('/archives/12/versions/4/file');
  });

  it('encodes IDs and creates safe, versioned download names', () => {
    expect(archiveDownloadPath('record/12', 'version 4'))
      .toBe('/archives/record%2F12/versions/version%204/file');
    expect(archiveDownloadName('Minutes: May/June', 'PDF', 2))
      .toBe('v2_Minutes_May_June.pdf');
  });

  it('provides a usable filename when title or file type is missing', () => {
    expect(archiveDownloadName('', '')).toBe('archive');
  });
});
