import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfirmationProvider, useConfirmation } from './ConfirmationContext';

function ConfirmationHarness() {
  const { confirm } = useConfirmation();
  const [result, setResult] = useState('');
  const ask = async () => {
    const confirmed = await confirm({ title: 'Delete record?', message: 'Remove the selected record?', confirmLabel: 'Delete record' });
    setResult(String(confirmed));
  };
  return (
    <>
      <button type="button" onClick={ask}>Start</button>
      <span data-testid="result">{result}</span>
    </>
  );
}

function ReasonHarness() {
  const { prompt } = useConfirmation();
  const [result, setResult] = useState('');
  const ask = async () => {
    const reason = await prompt({
      title: 'Void attendance?',
      message: 'A reason is required for the audit record.',
      inputLabel: 'Reason',
      minLength: 5,
      maxLength: 500,
      confirmLabel: 'Void attendance',
    });
    setResult(reason ?? 'cancelled');
  };
  return <><button type="button" onClick={ask}>Ask for reason</button><span data-testid="reason-result">{result}</span></>;
}

describe('ConfirmationProvider', () => {
  it('defaults focus to Cancel and resolves false on Escape', async () => {
    render(<ConfirmationProvider><ConfirmationHarness /></ConfirmationProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Remove the selected record?');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolves true only after the explicit confirm action', async () => {
    render(<ConfirmationProvider><ConfirmationHarness /></ConfirmationProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete record' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('requires a valid reason before allowing QR audit actions', async () => {
    render(<ConfirmationProvider><ReasonHarness /></ConfirmationProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Ask for reason' }));
    const reasonInput = await screen.findByRole('textbox', { name: 'Reason' });
    const submit = screen.getByRole('button', { name: 'Void attendance' });
    expect(reasonInput).toHaveFocus();
    expect(submit).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: 'late' } });
    expect(submit).toBeDisabled();
    fireEvent.change(reasonInput, { target: { value: 'Verified duplicate' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(screen.getByTestId('reason-result')).toHaveTextContent('Verified duplicate'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
