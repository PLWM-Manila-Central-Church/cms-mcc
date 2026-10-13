/** One current destination, including when visible paths are nested. */
export function currentNavPath(items, pathname) {
  return items.reduce((current, item) => {
    const path = item.path;
    if (!path || path === '__more__') return current;
    const matches = pathname === path || pathname.startsWith(`${path}/`);
    return matches && path.length > current.length ? path : current;
  }, '');
}
