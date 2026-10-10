import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, Users, ShieldCheck } from 'lucide-react';
import StudentHome from '@/frontend/features/dashboard/student-home';
import AdminHome from '@/frontend/features/dashboard/admin-home';
import CourseCard from '@/frontend/components/course-card';
import GroupRosterView from '@/frontend/features/groups/group-roster-view';
import { getWebsiteContext, loadWebsiteScope, courseCapability, offeringCapability } from '@/server/services/website';
import { studentLessons, validRosterPage } from '@/shared/website-model';

export type WebsiteSearch = { organization?: string; offering?: string; page?: string; title?: string };
const panel = 'rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function requireWebsiteContext() {
  const context = await getWebsiteContext();
  if (!context) redirect('/sign-in');
  return context;
}
async function scopeFor(search: WebsiteSearch, courseId?: string) {
  const context = await requireWebsiteContext();
  if (Object.values(search).some(v => v !== undefined && (typeof v !== 'string' || v.length > 200))) notFound();
  if ((search.organization && !uuid.test(search.organization)) || (courseId && !uuid.test(courseId))) notFound();
  const scope = await loadWebsiteScope(context, search.organization, courseId);
  if (!scope || (courseId && !scope.courses.length)) notFound();
  return { context, scope };
}
function LimitNotice({ limited }: { limited: boolean }) {
  return limited ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This overview shows at most 100 courses/offerings and 500 lessons. Narrow your organization or open an individual course. Progress totals are unavailable for truncated data.</p> : null;
}
function Offerings({ scope }: { scope: NonNullable<Awaited<ReturnType<typeof loadWebsiteScope>>> }) {
  return <section className={panel}><h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-cyan-600" />Your Groups &amp; Offerings</h2>
    {!scope.offerings.length && <p className="text-sm text-slate-500">No accessible offerings yet. Your teacher will arrange your course enrollment.</p>}
    <div className="divide-y divide-slate-100">{scope.offerings.map(o => <Link className="flex flex-wrap justify-between gap-2 py-4 text-sm hover:text-sky-700" key={o.id} href={`/offerings/${o.id}`}><span className="font-semibold">{o.name}</span><span>{o.status} · {o.delivery_mode.replace('_', ' ')}{scope.enrollments.find(e => e.offering_id === o.id) ? ` · Your enrollment: ${scope.enrollments.find(e => e.offering_id === o.id)?.status}` : ''}</span></Link>)}</div>
  </section>;
}
function Assessments({ scope }: { scope: NonNullable<Awaited<ReturnType<typeof loadWebsiteScope>>> }) {
  const now = Date.now();
  const upcoming = scope.scheduled.filter(s => !s.closes_at || Date.parse(s.closes_at) > now);
  return <section className={panel}><h2 className="mb-3 text-xl font-bold">Available &amp; Upcoming Assessments</h2><p className="mb-4 text-xs text-slate-500">Assessment participation is awaiting integration. These are published schedules for accessible offerings.</p>
    {!upcoming.length && <p className="text-sm text-slate-500">No upcoming published assessments.</p>}
    {upcoming.map(s => <div className="border-t py-3 text-sm" key={s.id}><strong>{scope.assessments.find(a => a.id === s.assessment_id)?.title || 'Assessment'}</strong><p>{scope.offerings.find(o => o.id === s.offering_id)?.name} · Opens {s.opens_at ? new Date(s.opens_at).toISOString() : 'any time'} · Closes {s.closes_at ? new Date(s.closes_at).toISOString() : 'without a deadline'}</p></div>)}
  </section>;
}
export async function WebsiteHome({ search = {} }: { search?: WebsiteSearch }) {
  const { context, scope } = await scopeFor(search);
  const supported = scope.offerings.filter(o => {
    const course = scope.courses.find(c => c.id === o.course_id);
    return course && offeringCapability(context, course, o.id);
  });
  const staff = scope.courses.some(c => courseCapability(context, c)) || supported.length > 0 || context.memberships.some(m => m.status === 'active' && ['owner', 'admin'].includes(m.role) && (!search.organization || search.organization === m.organization_id));
  const [active, invited] = staff ? await Promise.all([context.repository.enrollmentCount(supported.map(o => o.id), 'active'), context.repository.enrollmentCount(supported.map(o => o.id), 'invited')]) : [0, 0];
  return <div className="space-y-8"><LimitNotice limited={scope.limited} />
    {staff && <AdminHome phase1 adminName={context.viewer.displayName} metrics={{ totalStudents: active, pendingWaitlistCount: invited, pendingHomeworkCount: null, activeGroupsCount: supported.filter(o => o.status === 'active').length }} recentSignups={[]} recentSubmissions={[]} />}
    <StudentHome phase1 summaryAvailable={!scope.limited} lessons={scope.limited ? [] : studentLessons({ ...scope, offerings: scope.offerings.filter(o => scope.enrollments.some(e => e.offering_id === o.id && e.status === 'active' && (!e.expires_at || Date.parse(e.expires_at) > Date.now()) && (!e.enrolled_at || Date.parse(e.enrolled_at) <= Date.now()))) })} groupName={null} />
    {scope.limited && <p className="text-sm text-slate-500">Open a course for its available lessons. Dashboard lesson progress is not calculated on partial data.</p>}
    <Offerings scope={scope} /><Assessments scope={scope} />
  </div>;
}
export async function WebsiteCourses({ search = {}, teacher = false }: { search?: WebsiteSearch; teacher?: boolean }) {
  const context = await requireWebsiteContext();
  if (Object.values(search).some(v => v !== undefined && (typeof v !== 'string' || v.length > 200)) || (search.organization && !context.organizations.some(o => o.id === search.organization))) notFound();
  let page: number; try { page = validRosterPage(search.page); } catch { notFound(); }
  const rows = await context.repository.courses(search.organization, page, search.title);
  const courses = rows.slice(0, 100);
  const [modules, offerings] = await Promise.all([context.repository.modules(courses.map(c => c.id)), context.repository.offerings(courses.map(c => c.id))]);
  const visible = courses.filter(c => !teacher || courseCapability(context, c) || offerings.some(o => o.course_id === c.id && offeringCapability(context, c, o.id)));
  const catalogPath = teacher ? '/teacher/courses' : '/self-learning';
  const pageUrl = (value: number) => `${catalogPath}?${new URLSearchParams({ page: String(value), ...(search.organization ? { organization: search.organization } : {}), ...(search.title ? { title: search.title } : {}) })}`;
  return <div className="mx-auto max-w-7xl space-y-6 pb-16 pt-2"><div className="space-y-2"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">{teacher ? <ShieldCheck className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}{teacher ? 'Teacher Portal' : 'Curriculum & Self Learning'}</div><h1 className="text-3xl font-bold">{teacher ? 'Lesson Management' : 'Self Learning Curriculum'}</h1><p className="text-sm text-slate-500">{teacher ? 'Inspect your authorized courses and offerings. Course editing is awaiting integration.' : 'Explore the published lessons available through your course offerings.'}</p></div>
    <form className="flex flex-wrap gap-3" action={catalogPath}>{search.organization && <input type="hidden" name="organization" value={search.organization} />}<input aria-label="Search your courses" name="title" defaultValue={search.title} maxLength={200} placeholder="Search your courses" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm" /><button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Search</button></form>
    <div className={panel}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(c => <CourseCard key={c.id} id={c.id} title={c.title} category={context.organizations.find(o => o.id === c.organization_id)?.name} chaptersLength={modules.length > 500 ? undefined : modules.filter(m => m.course_id === c.id).length} />)}</div>{!visible.length && <p className="py-12 text-center text-slate-500">No accessible courses on this page. Try another organization or search.</p>}<nav aria-label="Course pages" className="mt-6 flex gap-6 text-sm text-sky-700">{page > 0 && <Link href={pageUrl(page - 1)}>Previous</Link>}{rows.length > 100 && <Link href={pageUrl(page + 1)}>Next</Link>}</nav></div>
  </div>;
}
export async function WebsiteCourse({ courseId, search = {} }: { courseId: string; search?: WebsiteSearch }) {
  const { context, scope } = await scopeFor(search, courseId);
  const course = scope.courses[0];
  if (search.offering && !scope.offerings.some(o => o.id === search.offering)) notFound();
  const offering = scope.offerings.find(o => o.id === search.offering);
  return <div className="space-y-6 p-2 sm:p-8"><div className="grid gap-8 sm:grid-cols-2"><div><h1 className="text-3xl font-bold">{course.title}</h1><p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">{course.description || 'No description'}</p><p className="mt-4 text-xs text-slate-500">{context.organizations.find(o => o.id === course.organization_id)?.name} · {course.status}</p></div><div className="grid min-h-40 place-items-center rounded-2xl border bg-white text-cyan-600"><BookOpen className="h-12 w-12" /></div></div>
    <LimitNotice limited={scope.limited} /><Offerings scope={scope} />
    <section className={panel}><h2 className="mb-4 text-xl font-bold">Available Lessons{offering ? ` · ${offering.name}` : ''}</h2>{!offering && <p className="mb-4 text-sm text-slate-500">Select a group above to view progress for that specific course run.</p>}
      {scope.modules.map(m => <div key={m.id} className="border-t py-4"><h3 className="font-semibold">{m.title}</h3>{scope.lessons.filter(l => l.module_id === m.id).map(l => <div key={l.id} className="flex justify-between gap-2 py-2 text-sm"><span>{l.title}</span><span className="text-slate-500">{offering ? scope.progress.find(p => p.offering_id === offering.id && p.lesson_id === l.id)?.status.replace('_', ' ') || 'not started' : 'Published'}{l.estimated_duration_seconds !== null ? ` · ${Math.ceil(l.estimated_duration_seconds / 60)} min` : ''}</span></div>)}</div>)}
      {!scope.lessons.length && <p className="text-sm text-slate-500">No published lessons available.</p>}<p className="mt-4 text-sm text-slate-500">Video playback, homework and lesson editing are awaiting integration. Existing progress is shown read-only.</p>
    </section><Assessments scope={scope} />
  </div>;
}
export async function WebsiteGroups({ search = {} }: { search?: WebsiteSearch }) {
  const { scope } = await scopeFor(search);
  return <div className="mx-auto max-w-5xl space-y-6"><LimitNotice limited={scope.limited} /><Offerings scope={scope} />
    <section className={panel}><h2 className="mb-3 text-xl font-bold">Your Enrollment Status</h2><p className="mb-3 text-sm text-slate-500">Suspended, expired, invited and cancelled enrollments do not grant course access.</p>{scope.enrollments.filter(e => !search.organization || scope.offerings.some(o => o.id === e.offering_id)).map(e => <p className="border-t py-3 text-sm" key={e.id}>{scope.offerings.find(o => o.id === e.offering_id)?.name || 'Unavailable offering'} · {e.status}{e.expires_at ? ` · Expires ${e.expires_at}` : ''}</p>)}{!scope.enrollments.length && <p className="text-sm text-slate-500">You have no enrollments yet.</p>}</section>
  </div>;
}
export async function WebsiteOffering({ offeringId, search = {} }: { offeringId: string; search?: WebsiteSearch }) {
  const context = await requireWebsiteContext();
  if (!uuid.test(offeringId) || Object.values(search).some(v => v !== undefined && (typeof v !== 'string' || v.length > 200))) notFound();
  let page: number; try { page = validRosterPage(search.page); } catch { notFound(); }
  const [offering] = await context.repository.offering(offeringId);
  if (!offering) notFound();
  const [course] = await context.repository.course(offering.course_id);
  if (!course) notFound();
  const staff = offeringCapability(context, course, offeringId);
  const [enrollments, total] = staff ? await Promise.all([context.repository.roster(offeringId, page), context.repository.enrollmentCount([offeringId])]) : [[], null];
  const mine = (await context.repository.myEnrollments()).find(e => e.offering_id === offeringId);
  return <div className="space-y-6"><Link className="text-sm font-semibold text-sky-700" href={`/courses/${course.id}?offering=${offering.id}`}>View {course.title} lessons &amp; progress →</Link>
    {staff ? <><GroupRosterView phase1 groupName={offering.name} nextSession={null} peers={enrollments.slice(0, 50).map(e => ({ id: e.id, name: e.profiles?.display_name || 'Learner', email: '', role: 'student', isCurrentUser: e.user_id === context.viewer.id, enrollmentStatus: e.status, latestSubmission: null }))} /><div className={panel}><p>{total} enrollment records · Page {page + 1}</p><nav className="mt-3 flex gap-6" aria-label="Roster pages">{page > 0 && <Link href={`/offerings/${offeringId}?page=${page - 1}`}>Previous</Link>}{enrollments.length > 50 && <Link href={`/offerings/${offeringId}?page=${page + 1}`}>Next</Link>}</nav></div></> : <section className={panel}><h1 className="text-2xl font-bold">{offering.name}</h1><p className="mt-4">Your enrollment: {mine?.status || 'Unavailable'}</p><p className="mt-2 text-sm text-slate-500">Classmate records are private. Live sessions and homework are awaiting integration.</p></section>}
  </div>;
}
