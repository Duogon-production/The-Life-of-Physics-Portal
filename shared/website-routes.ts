/** Only pages with an explicit Firebase/Supabase adapter may reach the original routes. */
export function isPhaseOneRoute(path: string) {
  return ['/', '/home', '/dashboard', '/self-learning', '/search', '/group', '/groups', '/teacher/courses', '/teacher/create', '/onboarding/organization', '/unavailable'].includes(path) ||
    /^\/teacher\/courses\/[0-9a-f-]{36}$/.test(path) || /^\/courses\/[^/]+(?:\/detail)?$/.test(path) || /^\/offerings\/[^/]+$/.test(path);
}
