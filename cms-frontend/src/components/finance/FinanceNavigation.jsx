import { NavLink } from 'react-router-dom';

const sections = [
  { to: '/finance', label: 'Giving records', end: true },
  { to: '/finance/expenses', label: 'Expenses', end: false },
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
            minHeight: 40,
            padding: '9px 15px',
            borderRadius: 10,
            border: `1px solid ${isActive ? '#a7d7bd' : 'var(--mcc-border, #e2e8f0)'}`,
            background: isActive ? '#eef8f1' : 'var(--mcc-surface, #fff)',
            color: isActive ? '#176b3a' : 'var(--mcc-secondary, #52647a)',
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
