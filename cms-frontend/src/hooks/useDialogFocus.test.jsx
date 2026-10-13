import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import useDialogFocus from './useDialogFocus';

function Harness() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDialogFocus(open, ref, () => setOpen(false));
  return <><button onClick={() => setOpen(true)}>Open</button>{open && <section role="dialog" ref={ref} tabIndex={-1}><button>First</button><button>Last</button></section>}</>;
}
test('dialog contains focus, closes with Escape, restores focus and body scroll', () => {
  document.body.style.overflow = 'auto';
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe('auto');
  document.body.style.overflow = '';
});
