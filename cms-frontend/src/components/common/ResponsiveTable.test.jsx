import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import ResponsiveTable from './ResponsiveTable';
test('adds cell labels for phone cards and preserves the original actions', () => {
  const edit=vi.fn();
  const {container}=render(<ResponsiveTable aria-label="Records"><thead><tr><th>Name ↑</th><th>Actions</th></tr></thead><tbody><tr><td>Sample member</td><td><button onClick={edit}>Edit</button></td></tr></tbody></ResponsiveTable>);
  expect(screen.getByRole('table',{name:'Records'})).toHaveClass('mcc-responsive-table');
  expect(container.querySelector('tbody td')).toHaveAttribute('data-label','Name');
  expect(container.querySelectorAll('tbody td')[1]).toHaveAttribute('data-label','Actions');
  fireEvent.click(screen.getByRole('button',{name:'Edit'}));
  expect(edit).toHaveBeenCalledTimes(1);
});
test('retains selection controls and empty colspan rows', () => {
  const {container}=render(<ResponsiveTable><thead><tr><th><input type="checkbox" aria-label="Select all"/></th><th>Name</th></tr></thead><tbody><tr><td colSpan={2}>No records found.</td></tr></tbody></ResponsiveTable>);
  expect(container.querySelector('th')).toHaveClass('mcc-selection-header');
  expect(screen.getByRole('checkbox',{name:'Select all'})).toBeInTheDocument();
  expect(screen.getByText('No records found.')).toHaveAttribute('colspan','2');
});
