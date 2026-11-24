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
        <details className="workspace-help">
          <summary>About this page</summary>
          <p>{module.description}</p>
          <span className="workspace-scope-note">{workspace.note}</span>
        </details>
      </div>
    </section>
  );
}
