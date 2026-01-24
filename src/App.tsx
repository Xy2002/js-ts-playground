import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { VersionInfo } from "@/components/VersionInfo";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import { useTheme } from "@/hooks/useTheme";

function AppContent() {
	// Initialize theme sync
	useTheme();

	return (
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/settings" element={<Settings />} />
		</Routes>
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
