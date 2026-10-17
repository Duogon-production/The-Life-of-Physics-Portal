'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/frontend/components/ui/button';

/** Retry the current server-rendered list/detail without changing identity or exam state. */
export function ExamsRetry() {
 const router = useRouter();
 const [pending, startTransition] = useTransition();
 return <Button className="mt-4" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? 'Retrying…' : 'Try again'}</Button>;
}
