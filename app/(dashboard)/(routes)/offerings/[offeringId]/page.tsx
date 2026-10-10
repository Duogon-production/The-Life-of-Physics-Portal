import { notFound } from 'next/navigation';
import { isFirebaseStaging } from '@/shared/auth-config';
import { WebsiteOffering, type WebsiteSearch } from '../../../_components/website-pages';

export default async function OfferingPage({ params, searchParams }: { params: Promise<{ offeringId: string }>; searchParams: Promise<WebsiteSearch> }) {
  if (!isFirebaseStaging()) notFound();
  return <WebsiteOffering offeringId={(await params).offeringId} search={await searchParams} />;
}
