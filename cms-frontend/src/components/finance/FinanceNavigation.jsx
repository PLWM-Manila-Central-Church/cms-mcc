import { NavLink } from 'react-router-dom';

const sections = [
  { to: '/finance', label: 'Giving records', end: true },
  { to: '/finance/expenses', label: 'Expenses', end: false },
  { to: '/finance/funds', label: 'Funds & Accounts', end: false },
  { to: '/finance/approvals', label: 'Approvals', end: false },
  { to: '/finance/reports', label: 'Reports & Ledger', end: false },
];

export default function FinanceNavigation() {
  return (
    <nav aria-label="Finance sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 20px' }}>
      {sections.map((section) => (
        <NavLink
          key={section.to}
          to={section.to}
          end={section.end}
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 38,
            padding: '8px 14px',
            borderRadius: 10,
            border: `1px solid ${isActive ? '#005599' : 'var(--mcc-border, #e2e8f0)'}`,
            background: isActive ? '#e8f4fd' : 'var(--mcc-surface, #fff)',
            color: isActive ? '#003d70' : 'var(--mcc-secondary, #52647a)',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
          })}
        >
          {section.label}
        </NavLink>
      ))}
    </nav>
  );
}
