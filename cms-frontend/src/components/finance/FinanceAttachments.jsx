import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_LABELS = {
  title: 'Receipts',
  add: 'Add receipt',
  download: 'Download',
  remove: 'Archive',
  empty: 'No receipts',
  uploading: 'Uploading…',
  downloadError: 'Receipt could not be downloaded.',
  uploadError: 'Receipt could not be uploaded.',
  uploadSuccess: (count) => `${count} receipt${count === 1 ? '' : 's'} uploaded.`,
  removeSuccess: 'Receipt archived. A System Admin can restore it from Archives.',
  removeTitle: 'Archive receipt?',
  keep: 'Keep receipt',
  confirmRemove: 'Archive receipt',
  invalidType: 'Choose a PDF, JPG, PNG, or WebP file.',
  tooLarge: 'Each receipt must be 10 MB or smaller.',
};

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback;

const safeDownloadName = (name, id) => String(name || `receipt-${id}`)
  .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
  .replace(/[. ]+$/g, '') || `receipt-${id}`;

const getDownloadInfo = (attachment) => {
  const requestUrl = axiosInstance.getUri({
    url: `/finance/attachments/${encodeURIComponent(attachment.id)}/download`,
  });
  const resolvedUrl = new URL(requestUrl, window.location.href);
  return {
    href: resolvedUrl.href,
    sameOrigin: resolvedUrl.origin === window.location.origin,
    fileName: safeDownloadName(attachment.file_name, attachment.id),
  };
};

export default function FinanceAttachments({
  attachments = [],
  targetType,
  targetId,
  canUpload = false,
  canDelete = false,
  onChanged,
  labels = {},
  compact = false,
}) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const inputRef = useRef(null);
  const cancelDeleteRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (attachmentToDelete) cancelDeleteRef.current?.focus();
  }, [attachmentToDelete]);

  useEffect(() => {
    if (!attachmentToDelete) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !removing) setAttachmentToDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attachmentToDelete, removing]);

  const uploadFiles = async (event) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    setError('');
    setNotice('');
    if (!files.length) return;

    if (targetType !== 'income') {
      setError('Receipts can be added to received-income records only.');
      return;
    }
    if (!Number(targetId)) {
      setError('Save the financial record before adding receipts.');
      return;
    }

    const isAllowedType = (file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.has(extension) && (!file.type || ALLOWED_MIME_TYPES.has(file.type));
    };
    const invalidFiles = files.filter((file) => !isAllowedType(file) || file.size > MAX_FILE_SIZE);
    const validFiles = files.filter((file) => !invalidFiles.includes(file));
    const messages = [];
    if (invalidFiles.some((file) => file.size > MAX_FILE_SIZE)) messages.push(text.tooLarge);
    if (invalidFiles.some((file) => !isAllowedType(file))) {
      messages.push(text.invalidType);
    }
    if (!validFiles.length) {
      setError(messages.join(' '));
      return;
    }

    setUploading(true);
    let uploadedCount = 0;
    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('income_id', String(targetId));
      try {
        await axiosInstance.post('/finance/attachments/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedCount += 1;
      } catch (uploadError) {
        messages.push(`${file.name}: ${getErrorMessage(uploadError, text.uploadError)}`);
      }
    }

    if (uploadedCount > 0) {
      setNotice(text.uploadSuccess(uploadedCount));
      try {
        await onChanged?.();
      } catch {
        messages.push('Receipts uploaded, but the list could not be refreshed.');
      }
    }
    setError(messages.join(' '));
    setUploading(false);
  };

  const downloadAttachment = async (attachment) => {
    setError('');
    setNotice('');
    setDownloadingId(attachment.id);
    try {
      const response = await axiosInstance.get(
        `/finance/attachments/${encodeURIComponent(attachment.id)}/download`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = safeDownloadName(attachment.file_name, attachment.id);
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, text.downloadError));
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteAttachment = async () => {
    if (!attachmentToDelete) return;
    setRemoving(true);
    setError('');
    setNotice('');
    try {
      await axiosInstance.patch(`/finance/attachments/${encodeURIComponent(attachmentToDelete.id)}/archive`);
      setAttachmentToDelete(null);
      setNotice(text.removeSuccess);
      try {
        await onChanged?.();
      } catch {
        setError('Receipt removed, but the list could not be refreshed.');
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Receipt could not be removed.'));
    } finally {
      setRemoving(false);
    }
  };

  if (!attachments.length && !canUpload) {
    return <span style={{ color: '#94a3b8' }}>—</span>;
  }

  return (
    <div aria-label={text.title} style={{ display: 'grid', gap: 6, minWidth: compact ? 0 : 150 }}>
      {attachments.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 5 }}>
          {attachments.map((attachment) => {
            const download = getDownloadInfo(attachment);
            return (
              <li key={attachment.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span title={attachment.file_name} style={{ minWidth: 0, maxWidth: compact ? 150 : 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569', fontSize: 12 }}>
                  {attachment.file_name}
                </span>
                {download.sameOrigin ? (
                  <a
                    href={download.href}
                    download={download.fileName}
                    aria-label={`${text.download} ${attachment.file_name}`}
                    style={{ border: 0, background: 'transparent', color: '#075985', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '3px 4px', textDecoration: 'none' }}
                  >
                    {text.download}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => downloadAttachment(attachment)}
                    disabled={downloadingId === attachment.id}
                    aria-label={`${text.download} ${attachment.file_name}`}
                    style={{ border: 0, background: 'transparent', color: '#075985', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '3px 4px' }}
                  >
                    {downloadingId === attachment.id ? '…' : text.download}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setAttachmentToDelete(attachment)}
                    aria-label={`${text.remove} ${attachment.file_name}`}
                    style={{ border: 0, background: 'transparent', color: '#b91c1c', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '3px 4px' }}
                  >
                    {text.remove}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!attachments.length && <span style={{ color: '#94a3b8', fontSize: 12 }}>{text.empty}</span>}
      {canUpload && targetId && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ justifySelf: 'start', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', padding: '5px 8px', fontSize: 12, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer' }}
          >
            {uploading ? text.uploading : text.add}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            aria-label={`${text.add} to financial record ${targetId}`}
            onChange={uploadFiles}
            style={{ display: 'none' }}
          />
        </>
      )}
      {error && !attachmentToDelete && <div role="alert" style={{ color: '#b91c1c', fontSize: 12, maxWidth: 260 }}>{error}</div>}
      {notice && <div role="status" style={{ color: '#166534', fontSize: 12 }}>{notice}</div>}

      {attachmentToDelete && (
        <div
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && !removing && setAttachmentToDelete(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.48)' }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`finance-attachment-delete-${attachmentToDelete.id}-title`}
            aria-describedby={`finance-attachment-delete-${attachmentToDelete.id}-description`}
            style={{ width: 'min(100%,430px)', background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 24px 70px rgba(15,23,42,0.28)' }}
          >
            <h2 id={`finance-attachment-delete-${attachmentToDelete.id}-title`} style={{ margin: '0 0 10px', fontSize: 19 }}>{text.removeTitle}</h2>
            <p id={`finance-attachment-delete-${attachmentToDelete.id}-description`} style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
              {attachmentToDelete.file_name}. The uploaded file will be retained and can be restored from Archives.
            </p>
            {error && <div role="alert" style={{ marginTop: 12, color: '#b91c1c', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button ref={cancelDeleteRef} type="button" disabled={removing} onClick={() => setAttachmentToDelete(null)} style={{ border: '1px solid #dbe4ee', borderRadius: 8, background: '#fff', color: '#334155', padding: '9px 12px', fontWeight: 700, cursor: 'pointer' }}>{text.keep}</button>
              <button type="button" disabled={removing} onClick={deleteAttachment} style={{ border: 0, borderRadius: 8, background: '#b91c1c', color: '#fff', padding: '9px 12px', fontWeight: 700, cursor: 'pointer' }}>{removing ? 'Archiving…' : text.confirmRemove}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
