import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReportSection from './ReportSection';

describe('ReportSection', () => {
  it('renders the title, hint and body inside one section', () => {
    render(
      <ReportSection title="Member growth" hint="New members per month">
        <p>chart body</p>
      </ReportSection>,
    );

    const section = screen.getByRole('heading', { name: 'Member growth' }).closest('section');
    expect(section).toHaveClass('ar-section');
    expect(screen.getByText('New members per month')).toBeInTheDocument();
    expect(screen.getByText('chart body')).toBeInTheDocument();
    expect(section).toContainElement(screen.getByText('chart body'));
  });

  it('renders actions only when supplied', () => {
    const { rerender } = render(<ReportSection title="Finance">body</ReportSection>);
    expect(document.querySelector('.ar-section-actions')).toBeNull();

    rerender(<ReportSection title="Finance" actions={<button type="button">Export</button>}>body</ReportSection>);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});
