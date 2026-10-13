import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleWorkspace, getWorkspaceModule, workspaceActions } from '../../utils/roleWorkspace';

export default function WorkspaceContext() {
  const { user, hasPermission } = useAuth();
  const { pathname } = useLocation();
  const workspace = getRoleWorkspace(user);
  const module = getWorkspaceModule(pathname);
  if (!module) return null;
  const actions = workspaceActions(user, hasPermission).filter(item => item.path !== module.path);
  return <section className="workspace-context" aria-label={`${workspace.title} workspace`}>
    <div className="workspace-context-copy">
      <div className="workspace-breadcrumb"><Link to="/dashboard">{workspace.title}</Link><span aria-hidden="true">/</span><span>{module.label}</span></div>
      <p>{module.description}</p>
      <span className="workspace-scope-note">{workspace.note}</span>
    </div>
    {!!actions.length && <nav className="workspace-context-actions" aria-label="Related work">{actions.slice(0, 3).map(item => <Link key={item.path} to={item.path}>{item.label}<span aria-hidden="true"> ↗</span></Link>)}</nav>}
  </section>;
}
