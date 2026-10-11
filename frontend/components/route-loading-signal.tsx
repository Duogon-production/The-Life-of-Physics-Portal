'use client';

import { useEffect } from 'react';

import { useGlobalLoading } from '@/frontend/components/providers/loading-provider';

/**
 * Rendered by app/loading.tsx. It draws nothing itself; it tells the global loading screen
 * that a page is still loading, so there is only ever ONE loading screen on top of the page.
 */
const RouteLoadingSignal = () => {
	const { setRouteLoading } = useGlobalLoading();

	useEffect(() => {
		setRouteLoading(true);
		return () => setRouteLoading(false);
	}, [setRouteLoading]);

	return null;
};

export default RouteLoadingSignal;
