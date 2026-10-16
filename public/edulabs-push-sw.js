/* Web Push only. No fetch interception, cached private pages, tokens or credentials. */
self.addEventListener('push', event => {
 event.waitUntil(self.registration.showNotification('EduLabs', {
  body: 'You have a new update. Sign in to view your notifications.',
  tag: 'edulabs-update', data: { path: '/notifications' },
 }));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil((async () => {
  const url = new URL('/notifications', self.location.origin).href;
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) {
   if (new URL(client.url).origin === self.location.origin) {
    await client.navigate(url); return client.focus();
   }
  }
  return self.clients.openWindow(url);
 })());
});
