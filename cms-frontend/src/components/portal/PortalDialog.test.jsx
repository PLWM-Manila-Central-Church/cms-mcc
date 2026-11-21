import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import PortalDialog from './PortalDialog';

test('closes on Escape and on backdrop click, and returns focus to the opener', async () => {
  const onClose = vi.fn();
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open day</button>
        {open && (
          <PortalDialog label="Saturday, November 28, 2026" onClose={() => { onClose(); setOpen(false); }}>
            <button type="button">Close day details</button>
            <p>Day content</p>
          </PortalDialog>
        )}
      </>
    );
  }

  render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Open day' });
  opener.focus();
  fireEvent.click(opener);

  const dialog = screen.getByRole('dialog', { name: 'Saturday, November 28, 2026' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByRole('button', { name: 'Close day details' })).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(opener).toHaveFocus());
});

test('renders the backdrop as a dimmed layer and keeps panel clicks inside', () => {
  const onClose = vi.fn();
  render(
    <PortalDialog label="Day" onClose={onClose}>
      <button type="button">Inside</button>
    </PortalDialog>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('dialog').parentElement);
  expect(onClose).toHaveBeenCalledTimes(1);
});
