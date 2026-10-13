import 'server-only';
import { createHash } from 'node:crypto';

export type HomeworkCloneTask = { id: string; path: string; sourcePath: string; mime: string };
type Storage = {
 download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
 upload: (path: string, bytes: Uint8Array, options: { contentType: string; upsert: false }) => Promise<{ error: unknown }>;
};
/** Paths come exclusively from the authorized RPC. Never overwrite a retry target. */
export async function copyHomeworkCloneTasks(tasks: HomeworkCloneTask[], storage: Storage, finish: (id: string) => Promise<unknown>) {
 for (const task of tasks) {
  const source = await storage.download(task.sourcePath);
  if (source.error || !source.data) throw new Error('Source solution could not be read. Retry copying its files.');
  const bytes = new Uint8Array(await source.data.arrayBuffer());
  const result = await storage.upload(task.path, bytes, { contentType: task.mime, upsert: false });
  if (result.error) {
   // An earlier request may have uploaded successfully before losing its response.
   const target = await storage.download(task.path);
   if (target.error || !target.data) throw new Error('Solution copy is incomplete. Retry copying its files.');
   const existing = new Uint8Array(await target.data.arrayBuffer());
   const digest = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
   if (bytes.length !== existing.length || digest(bytes) !== digest(existing)) throw new Error('Solution copy differs from its source. The existing file was preserved; contact support.');
  }
  await finish(task.id);
 }
 return { mediaCopyPending: false };
}
