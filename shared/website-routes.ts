/** Only pages with an explicit Firebase/Supabase adapter may reach the original routes. */
export function isPhaseOneRoute(path: string) {
  return ['/', '/home', '/dashboard', '/self-learning', '/search', '/group', '/groups', '/teacher/courses', '/unavailable'].includes(path) ||
    /^\/courses\/[^/]+(?:\/detail)?$/.test(path) || /^\/offerings\/[^/]+$/.test(path);
}
