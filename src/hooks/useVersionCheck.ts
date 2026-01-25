import { useEffect, useRef, useState } from "react";

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
	error: string | null;

	/**
	 * Reload the page to get the latest version
	 */
	reload: () => void;
}

/**
 * Hook to check for application updates
 * Polls the version endpoint at specified intervals and notifies when a new version is available
 */
export function useVersionCheck({
	currentVersion,
	interval = 5 * 60 * 1000, // 5 minutes
	enabled = true,
	endpoint = "/version.json",
}: UseVersionCheckOptions): VersionCheckResult {
	const [hasUpdate, setHasUpdate] = useState(false);
	const [latestVersion, setLatestVersion] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const checkVersion = async () => {
		try {
			const response = await fetch(endpoint, {
				// Add cache-busting to prevent browser caching
				cache: "no-store",
				headers: {
					"Cache-Control": "no-cache",
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			const serverVersion = data.version;

			if (!serverVersion) {
				throw new Error("No version field in response");
			}

			setLatestVersion(serverVersion);

			// Compare versions
			if (serverVersion !== currentVersion) {
				console.log(`[Version Check] New version available: ${serverVersion} (current: ${currentVersion})`);
				setHasUpdate(true);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			console.error("[Version Check] Failed to check version:", errorMessage);
			setError(errorMessage);
		}
	};

	const reload = () => {
		// Clear cache and reload
		if ("caches" in window) {
			caches.keys().then((names) => {
				names.forEach((name) => caches.delete(name));
			});
		}

		// Force reload from server
		window.location.reload();
	};

	useEffect(() => {
		if (!enabled) return;

		// Initial check
		checkVersion();

		// Set up polling
		timeoutRef.current = setInterval(() => {
			checkVersion();
		}, interval);

		return () => {
			if (timeoutRef.current) {
				clearInterval(timeoutRef.current);
			}
		};
	}, [currentVersion, interval, enabled, endpoint]);

	// Also check when window regains focus (user switches back to tab)
	useEffect(() => {
		if (!enabled) return;

		const handleFocus = () => {
			checkVersion();
		};

		window.addEventListener("focus", handleFocus);

		return () => {
			window.removeEventListener("focus", handleFocus);
		};
	}, [enabled]);

	return {
		hasUpdate,
		latestVersion,
		error,
		reload,
	};
}
