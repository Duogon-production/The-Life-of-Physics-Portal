import { redirect } from 'next/navigation';
import { getApplicationViewer } from '@/server/services/application-auth';
import { isFirebaseStaging } from '@/shared/auth-config';
import { NotificationsView } from '@/frontend/features/notifications/notifications-view';
export default async function NotificationsPage(){
 if(!isFirebaseStaging())return redirect('/unavailable');
 if(!await getApplicationViewer())return redirect('/sign-in');
 return <NotificationsView/>;
}
