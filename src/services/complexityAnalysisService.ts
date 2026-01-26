import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { LlmSettings } from "@/store/usePlaygroundStore";

export interface ComplexityResult {
	timeComplexity: string;
	spaceComplexity: string;
	explanation: string;
	codeAnalysis: string;
	detectedPatterns: string[];
}

export interface ComplexityChartData {
	inputSize: number[];
	timeComplexities: {
		[key: string]: number[];
	};
	spaceComplexities: {
		[key: string]: number[];
	};
	detectedTimeComplexity: string;
	detectedSpaceComplexity: string;
}

/**
 * Analyze code complexity using LLM
 */
export async function analyzeComplexity(
	code: string,
	language: string,
	llmSettings: LlmSettings,
	userLanguage: string = "en",
): Promise<ComplexityResult> {
	const { provider, apiKey, apiUrl, model } = llmSettings;

	if (!apiKey) {
		throw new Error(
			"API key is not configured. Please add your API key in settings.",
		);
	}

	// Create the appropriate client
	let client:
		| ReturnType<typeof createOpenAI>
		| ReturnType<typeof createAnthropic>
		| ReturnType<typeof createMistral>;
	switch (provider) {
		case "openai":
			client = createOpenAI({
				apiKey,
				baseURL: apiUrl || "https://api.openai.com/v1",
			});
			break;
		case "anthropic":
			client = createAnthropic({
				apiKey,
				baseURL: apiUrl || "https://api.anthropic.com",
			});
			break;
		case "mistral":
			client = createMistral({
				apiKey,
				baseURL: apiUrl || "https://api.mistral.ai/v1",
			});
			break;
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}

	// Determine the language instruction based on user's language setting
	const languageInstruction =
		userLanguage === "zh"
			? "Return ONLY valid JSON, no additional text, and use Chinese for all explanations."
			: "Return ONLY valid JSON, no additional text, and use English for all explanations.";

	const prompt = `Analyze the following ${language} code for time and space complexity.

Code:
\`\`\`${language}
${code}
\`\`\`

Please provide a detailed analysis in the following JSON format:
{
  "timeComplexity": "Big O notation (e.g., O(n), O(n²), O(log n))",
  "spaceComplexity": "Big O notation for space",
  "explanation": "Brief explanation of the complexity analysis",
  "codeAnalysis": "Analysis of the algorithm patterns used",
  "detectedPatterns": ["pattern1", "pattern2", ...]
}

Focus on:
1. Time complexity - identify loops, nested loops, recursive calls
2. Space complexity - identify data structures, recursion depth
3. Algorithm patterns - sorting, searching, dynamic programming, etc.

${languageInstruction}`;

	try {
		const result = await streamText({
			model: client(model),
			prompt,
		});

		// Collect the full response
		let fullResponse = "";
		for await (const textPart of result.textStream) {
			fullResponse += textPart;
		}

		// Parse the JSON response
		const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Failed to parse LLM response as JSON");
		}

		const parsed = JSON.parse(jsonMatch[0]) as ComplexityResult;

		return {
			timeComplexity: parsed.timeComplexity || "O(?)",
			spaceComplexity: parsed.spaceComplexity || "O(?)",
			explanation: parsed.explanation || "",
			codeAnalysis: parsed.codeAnalysis || "",
			detectedPatterns: parsed.detectedPatterns || [],
		};
	} catch (error) {
		console.error("Error analyzing complexity:", error);
		throw error;
	}
}

/**
 * Generate chart data for complexity visualization
 */
export function generateComplexityChart(
	result: ComplexityResult,
): ComplexityChartData {
	const inputSize = [1, 2, 5, 10, 20, 50, 100];

	// Define common complexity functions
	const complexityFunctions = {
		"O(1)": (_n: number) => 1,
		"O(log n)": (n: number) => Math.log2(n || 1),
		"O(n)": (n: number) => n,
		"O(n log n)": (n: number) => n * Math.log2(n || 1),
		"O(n²)": (n: number) => n * n,
		"O(n³)": (n: number) => n * n * n,
		"O(2^n)": (n: number) => 2 ** n,
		"O(n!)": (n: number) => {
			let result = 1;
			for (let i = 1; i <= n; i++) result *= i;
			return result;
		},
	};

	// Calculate values for each complexity class
	const timeComplexities: { [key: string]: number[] } = {};
	const spaceComplexities: { [key: string]: number[] } = {};

	Object.keys(complexityFunctions).forEach((key) => {
		timeComplexities[key] = inputSize.map((n) =>
			complexityFunctions[key as keyof typeof complexityFunctions](n),
		);
		spaceComplexities[key] = [...timeComplexities[key]];
	});

	// Normalize values to fit in chart (0-100 scale)
	const normalize = (values: number[]): number[] => {
		const max = Math.max(...values);
		if (max === 0) return values;
		return values.map((v) => (v / max) * 100);
	};

	Object.keys(timeComplexities).forEach((key) => {
		timeComplexities[key] = normalize(timeComplexities[key]);
		spaceComplexities[key] = normalize(spaceComplexities[key]);
	});

	return {
		inputSize,
		timeComplexities,
		spaceComplexities,
		detectedTimeComplexity: result.timeComplexity,
		detectedSpaceComplexity: result.spaceComplexity,
	};
}

/**
 * Parse Big O notation to match with our predefined classes
 */
export function parseBigO(notation: unknown): string {
	// Defensive check: ensure notation is a string
	if (typeof notation !== "string") {
		console.warn("parseBigO: expected string, got", typeof notation, notation);
		return "O(?)";
	}

	// Handle empty or invalid strings
	if (!notation || notation.trim() === "") {
		return "O(?)";
	}

	const normalized = notation.toLowerCase().replace(/\s/g, "");

	const patterns = [
		{ regex: /o\(1\)/, result: "O(1)" },
		{ regex: /o\(logn\)|o\(lnn\)/, result: "O(log n)" },
		{ regex: /o\(n\)/, result: "O(n)" },
		{ regex: /o\(nlogn\)|o\(n\*logn\)/, result: "O(n log n)" },
		{ regex: /o\(n\^2\)|o\(n²\)|o\(n\*\*2\)/, result: "O(n²)" },
		{ regex: /o\(n\^3\)|o\(n³\)|o\(n\*\*3\)/, result: "O(n³)" },
		{ regex: /o\(2\^n\)|o\(2\*\*n\)/, result: "O(2^n)" },
		{ regex: /o\(n!\)/, result: "O(n!)" },
	];

	for (const { regex, result } of patterns) {
		if (regex.test(normalized)) {
			return result;
		}
	}

	return "O(?)"; // Unknown complexity
}
