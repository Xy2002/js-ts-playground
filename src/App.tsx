import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { VersionInfo } from "@/components/VersionInfo";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";

export default function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/settings" element={<Settings />} />
			</Routes>
			<VersionInfo />
		</Router>
	);
}
