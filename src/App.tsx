import { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { UpdateBanner } from "@/components/UpdateBanner";
import { Toaster } from "@/components/ui/sonner";
import { VersionInfo } from "@/components/VersionInfo";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

function AppContent() {
	// CRITICAL: Load storage data BEFORE any other hooks that might call saveToStorage
	const { loadFromStorage } = usePlaygroundStore();
	const [isStorageLoaded, setIsStorageLoaded] = useState(false);

	// Load data from localStorage on mount (must run first before other hooks)
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadFromStorage is stable from Zustand store
	useEffect(() => {
		loadFromStorage();
		// Small delay to ensure state is updated before other hooks run
		setTimeout(() => setIsStorageLoaded(true), 0);
	}, []);

	// Load app version from version.json
	const [appVersion, setAppVersion] = useState<string>("1.0.0");

	useEffect(() => {
		fetch("/version.json")
			.then((res) => res.json())
			.then((data) => {
				if (data.version) {
					setAppVersion(data.version);
				}
			})
			.catch(() => {
				// Fallback to default if fetch fails
				console.warn("Failed to load version from version.json");
			});
	}, []);

	// Check for updates
	const { hasUpdate, latestVersion, reload } = useVersionCheck({
		currentVersion: appVersion,
		interval: 5 * 60 * 1000, // Check every 5 minutes
		enabled: true,
	});

	// State for update banner visibility
	const [showBanner, setShowBanner] = useState(hasUpdate);

	// When hasUpdate becomes true, show the banner (but don't auto-reshow if user dismissed it)
	useEffect(() => {
		if (hasUpdate) {
			setShowBanner(true);
		}
	}, [hasUpdate]);

	const handleDismiss = () => {
		setShowBanner(false);
	};

	return (
		<>
			{hasUpdate && showBanner && latestVersion && (
				<UpdateBanner
					currentVersion={appVersion}
					latestVersion={latestVersion}
					onReload={reload}
					onDismiss={handleDismiss}
				/>
			)}
			{/* Only render routes after storage is loaded to prevent saveToStorage before loadFromStorage */}
			{isStorageLoaded && (
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/settings" element={<Settings />} />
				</Routes>
			)}
			<Toaster />
		</>
	);
}

export default function App() {
	return (
		<Router>
			<AppContent />
			<VersionInfo />
			<Analytics />
			<SpeedInsights />
		</Router>
	);
}
