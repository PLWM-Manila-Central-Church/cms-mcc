import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleWorkspace, getWorkspaceModule } from '../../utils/roleWorkspace';

export default function WorkspaceContext() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const workspace = getRoleWorkspace(user);
  const module = getWorkspaceModule(pathname);
  if (!module) return null;

  return (
    <section className="workspace-context" aria-label={`${workspace.title} workspace`}>
      <div className="workspace-context-copy">
        <div className="workspace-breadcrumb">
          <Link to="/dashboard">{workspace.title}</Link>
          <span aria-hidden="true">/</span>
          <span>{module.label}</span>
        </div>
        <details className="workspace-help" style={{ marginTop: 0 }}>
          <summary style={{ fontSize: 11.5, padding: '1px 6px', borderRadius: 6, background: '#f1f5f9' }}>About</summary>
          <p>{module.description}</p>
          <span className="workspace-scope-note">{workspace.note}</span>
        </details>
      </div>
    </section>
  );
}
