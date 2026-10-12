export const archiveDownloadPath = (recordId, versionId) => {
  const record = encodeURIComponent(String(recordId));
  if (versionId == null) return `/archives/${record}/file`;
  return `/archives/${record}/versions/${encodeURIComponent(String(versionId))}/file`;
};

export const archiveDownloadName = (title, fileType, versionNumber) => {
  const safeTitle = String(title || 'archive')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s*_+\s*/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '') || 'archive';
  const extension = String(fileType || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const versionPrefix = versionNumber == null ? '' : `v${String(versionNumber).replace(/[^0-9]/g, '')}_`;
  return `${versionPrefix}${safeTitle}${extension ? `.${extension}` : ''}`;
};
