import { motion, AnimatePresence } from "framer-motion";
import {
	CheckCircle2,
	XCircle,
	AlertCircle,
	ChevronsUpDown,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export interface TestResult {
	status: "passed" | "failed" | "skipped";
	name: string;
	error?: string;
	duration?: number;
}

export interface TestSuite {
	name: string;
	tests: TestResult[];
	status: "passed" | "failed" | "skipped";
	duration: number;
}

export interface TestExecutionResults {
	hasTests: boolean;
	suites: TestSuite[];
	totalTests: number;
	passed: number;
	failed: number;
	duration: number;
}

interface TestVisualizationProps {
	results: TestExecutionResults | null;
}

export default function TestVisualization({ results }: TestVisualizationProps) {
	const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
	const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

	const toggleSuite = (suiteName: string) => {
		setExpandedSuites((prev) => {
			const next = new Set(prev);
			if (next.has(suiteName)) {
				next.delete(suiteName);
			} else {
				next.add(suiteName);
			}
			return next;
		});
	};

	const toggleTest = (testName: string) => {
		setExpandedTests((prev) => {
			const next = new Set(prev);
			if (next.has(testName)) {
				next.delete(testName);
			} else {
				next.add(testName);
			}
			return next;
		});
	};

	if (!results || !results.hasTests) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center px-4"
				>
					<div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
						<AlertCircle className="w-5 h-5 opacity-50" />
					</div>
					<p className="text-sm font-medium mb-1">No tests detected</p>
					<p className="text-xs">
						Use describe() and it() to run tests
					</p>
				</motion.div>
			</div>
		);
	}

	const statusColor = {
		passed: "text-green-500",
		failed: "text-destructive",
		skipped: "text-muted-foreground",
	};

	const statusBgColor = {
		passed: "bg-green-500/10",
		failed: "bg-destructive/10",
		skipped: "bg-muted/50",
	};

	const statusBorderColor = {
		passed: "border-green-500/20",
		failed: "border-destructive/20",
		skipped: "border-muted",
	};

	const statusIcon = {
		passed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
		failed: <XCircle className="w-4 h-4 text-destructive" />,
		skipped: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
	};

	return (
		<Card className="h-full flex flex-col rounded-none border-0 shadow-none bg-transparent">
			{/* Test Summary Header */}
			<CardHeader className="flex flex-row items-center justify-between p-3 space-y-0 flex-shrink-0 border-b">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
					<span className="text-sm font-semibold tracking-tight">Test Results</span>
				</div>

				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="text-xs font-mono bg-muted/50">
						{results.duration}ms
					</Badge>
					<Badge
						variant="secondary"
						className={`text-xs font-mono ${
							results.failed > 0
								? "bg-destructive/10 text-destructive"
								: "bg-green-500/10 text-green-500"
						}`}
					>
						{results.passed}/{results.totalTests} passed
					</Badge>
				</div>
			</CardHeader>

			{/* Test Results List */}
			<CardContent className="flex-1 p-0 min-h-0">
				<ScrollArea className="h-full">
					<div className="p-3 space-y-2">
						{results.suites.map((suite, suiteIndex) => (
							<motion.div
								key={suite.name}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: suiteIndex * 0.05 }}
								className={`rounded-lg border ${statusBorderColor[suite.status]} ${statusBgColor[suite.status]} overflow-hidden`}
							>
								{/* Suite Header */}
								<button
									onClick={() => toggleSuite(suite.name)}
									className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
								>
									<div className="flex items-center gap-2 flex-1">
										{expandedSuites.has(suite.name) ? (
											<ChevronDown className="w-4 h-4 text-muted-foreground" />
										) : (
											<ChevronRight className="w-4 h-4 text-muted-foreground" />
										)}
										{statusIcon[suite.status]}
										<span className="text-sm font-medium">{suite.name}</span>
										<Badge
											variant="secondary"
											className="text-xs font-mono bg-muted/50"
										>
											{suite.tests.filter((t) => t.status === "passed").length}/
											{suite.tests.length}
										</Badge>
									</div>
									<span className="text-xs text-muted-foreground font-mono">
										{suite.duration}ms
									</span>
								</button>

								{/* Test Cases */}
								<AnimatePresence>
									{expandedSuites.has(suite.name) && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.2 }}
											className="overflow-hidden"
										>
											<Separator />
											<div className="p-2 space-y-1">
												{suite.tests.map((test, testIndex) => (
													<motion.div
														key={test.name}
														initial={{ opacity: 0, x: -10 }}
														animate={{ opacity: 1, x: 0 }}
														transition={{
															delay: testIndex * 0.02,
														}}
														className={`rounded-md border ${statusBorderColor[test.status]} ${statusBgColor[test.status]} overflow-hidden`}
													>
														<button
															onClick={() => toggleTest(test.name)}
															className="w-full flex items-center gap-2 p-2 hover:bg-muted/30 transition-colors text-left"
														>
															{test.status === "failed" &&
															expandedTests.has(test.name) ? (
																<ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
															) : (
																<div className="w-3 h-3 flex-shrink-0" />
															)}
															{statusIcon[test.status]}
															<span className="text-xs font-medium flex-1">
																{test.name}
															</span>
															{test.duration && (
																<span className="text-xs text-muted-foreground font-mono">
																	{test.duration}ms
																</span>
															)}
														</button>

														{/* Error Details */}
														<AnimatePresence>
															{test.status === "failed" &&
																test.error &&
																expandedTests.has(test.name) && (
																	<motion.div
																		initial={{ height: 0, opacity: 0 }}
																		animate={{ height: "auto", opacity: 1 }}
																		exit={{ height: 0, opacity: 0 }}
																		className="border-t border-destructive/20"
																	>
																		<div className="p-2 bg-destructive/5">
																			<pre className="text-xs text-destructive font-mono whitespace-pre-wrap break-all">
																				{test.error}
																			</pre>
																		</div>
																	</motion.div>
																)}
														</AnimatePresence>
													</motion.div>
												))}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						))}

						{/* Overall Summary */}
						{results.suites.length > 0 && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className={`mt-4 p-3 rounded-lg border ${
									results.failed > 0
										? "bg-destructive/10 border-destructive/20"
										: "bg-green-500/10 border-green-500/20"
								} ${
									results.failed > 0 ? "text-destructive" : "text-green-700 dark:text-green-400"
								}`}
							>
								<div className="flex items-center gap-2">
									{results.failed > 0 ? (
										<XCircle className="w-4 h-4" />
									) : (
										<CheckCircle2 className="w-4 h-4" />
									)}
									<span className="text-sm font-medium">
										{results.failed === 0
											? "All tests passed!"
											: `${results.failed} test${results.failed > 1 ? "s" : ""} failed`}
									</span>
								</div>
							</motion.div>
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
