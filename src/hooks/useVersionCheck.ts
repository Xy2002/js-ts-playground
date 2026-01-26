import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

interface VersionResponse {
	version: string;
	buildDate: string;
	commit: string;
}

interface UseVersionCheckOptions {
	/**
	 * Current version of the application
	 */
	currentVersion: string;

	/**
	 * Polling interval in milliseconds (default: 5 minutes)
	 */
	interval?: number;

	/**
	 * Whether to enable version checking (default: true)
	 */
	enabled?: boolean;

	/**
	 * Version check endpoint URL (default: /version.json)
	 */
	endpoint?: string;
}

interface VersionCheckResult {
	/**
	 * Whether a new version is available
	 */
	hasUpdate: boolean;

	/**
	 * The latest version from server
	 */
	latestVersion: string | null;

	/**
	 * Error during version check
	 */
	error: Error | null;

	/**
	 * Whether the check is currently loading
	 */
	isLoading: boolean;

	/**
	 * Reload the page to get the latest version
	 */
	reload: () => void;
}

/**
 * Fetch version information from server
 */
async function fetchVersion(endpoint: string): Promise<VersionResponse> {
	const response = await fetch(endpoint, {
		// Add cache-busting headers to prevent browser/cdn caching
		cache: "no-store",
		headers: {
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Pragma: "no-cache",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();

	if (!data.version) {
		throw new Error("No version field in response");
	}

	return data;
}

/**
 * Hook to check for application updates using @tanstack/react-query
 *
 * Features:
 * - Automatic polling at specified interval
 * - Refetch on window focus (user switches back to tab)
 * - Smart caching and background updates
 * - Automatic retry on failure
 * - Garbage collection to manage memory
 */
export function useVersionCheck({
	currentVersion,
	interval = 5 * 60 * 1000, // 5 minutes
	enabled = true,
	endpoint = "/version.json",
}: UseVersionCheckOptions): VersionCheckResult {
	// Query for version information
	const {
		data: versionData,
		error,
		isLoading,
	} = useQuery({
		queryKey: ["version", endpoint],
		queryFn: () => fetchVersion(endpoint),
		enabled,
		refetchInterval: interval,
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
		gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes after unused
	});

	// Calculate if update is available
	const hasUpdate = versionData
		? versionData.version !== currentVersion
		: false;

	const latestVersion = versionData?.version ?? null;

	// Reload function
	const reload = useCallback(() => {
		// Clear all caches
		if ("caches" in window) {
			caches.keys().then((names) => {
				names.forEach((name) => {
					void caches.delete(name);
				});
			});
		}

		// Force reload from server (bypass cache)
		window.location.reload();
	}, []);

	return {
		hasUpdate,
		latestVersion,
		error,
		isLoading,
		reload,
	};
}
