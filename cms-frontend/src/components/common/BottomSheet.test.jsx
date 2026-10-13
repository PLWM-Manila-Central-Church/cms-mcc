import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import BottomSheet from './BottomSheet';
test('desktop-hidden sheet does not lock the page', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  document.body.style.overflow = 'auto';
  const view = render(<BottomSheet open title="Details" onClose={() => {}}>Content</BottomSheet>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('auto');
  view.unmount();
  document.body.style.overflow = '';
});
test('visible sheet focuses close and restores scrolling when unmounted', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  document.body.style.overflow = '';
  const close = vi.fn();
  const view = render(<BottomSheet open title="Details" onClose={close}><button>Open record</button></BottomSheet>);
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  expect(document.body.style.overflow).toBe('hidden');
  view.unmount();
  expect(document.body.style.overflow).toBe('');
});
