import { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { VersionInfo } from "@/components/VersionInfo";
import { UpdateBanner } from "@/components/UpdateBanner";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import { useTheme } from "@/hooks/useTheme";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

// Current version from package.json
const APP_VERSION = "1.0.0";

function AppContent() {
	// CRITICAL: Load storage data BEFORE any other hooks that might call saveToStorage
	const { loadFromStorage } = usePlaygroundStore();

	// Load data from localStorage on mount (must run first before other hooks)
	useEffect(() => {
		loadFromStorage();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Initialize theme sync (after storage is loaded)
	useTheme();

	// Check for updates
	const { hasUpdate, latestVersion, reload } = useVersionCheck({
		currentVersion: APP_VERSION,
		interval: 5 * 60 * 1000, // Check every 5 minutes
		enabled: true,
	});

	// State for update banner visibility
	const [showBanner, setShowBanner] = useState(hasUpdate);

	// Update banner visibility when hasUpdate changes
	if (hasUpdate && !showBanner) {
		setShowBanner(true);
	}

	const handleDismiss = () => {
		setShowBanner(false);
	};

	return (
		<>
			{hasUpdate && showBanner && latestVersion && (
				<UpdateBanner
					currentVersion={APP_VERSION}
					latestVersion={latestVersion}
					onReload={reload}
					onDismiss={handleDismiss}
				/>
			)}
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/settings" element={<Settings />} />
			</Routes>
		</>
	);
}

export default function App() {
	return (
		<Router>
			<AppContent />
			<VersionInfo />
		</Router>
	);
}
