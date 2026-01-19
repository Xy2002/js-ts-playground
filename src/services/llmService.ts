import type { LlmProvider } from "@/store/usePlaygroundStore";

export interface ModelInfo {
	id: string;
	name: string;
	description?: string;
}

// 预定义的模型列表（当API调用失败时使用）
const FALLBACK_MODELS: Record<LlmProvider, ModelInfo[]> = {
	anthropic: [
		{ id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", description: "Most capable model" },
		{ id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "High capability" },
		{ id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", description: "Balanced" },
		{ id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", description: "Fastest" },
	],
	openai: [
		{ id: "gpt-4o", name: "GPT-4o", description: "Latest GPT-4 model" },
		{ id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High capability" },
		{ id: "gpt-4", name: "GPT-4", description: "Legacy GPT-4" },
		{ id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast and cost-effective" },
	],
	mistral: [
		{ id: "mistral-large-latest", name: "Mistral Large", description: "Most capable" },
		{ id: "mistral-medium-latest", name: "Mistral Medium", description: "Balanced" },
		{ id: "mistral-small-latest", name: "Mistral Small", description: "Fastest" },
		{ id: "codestral-latest", name: "Codestral", description: "Code-optimized" },
	],
};

/**
 * 获取指定provider的模型列表
 */
export async function fetchModels(
	provider: LlmProvider,
	apiKey?: string,
	apiUrl?: string,
): Promise<ModelInfo[]> {
	// 如果没有API key，返回预定义列表
	if (!apiKey) {
		return FALLBACK_MODELS[provider];
	}

	try {
		switch (provider) {
			case "anthropic":
				return await fetchAnthropicModels(apiKey, apiUrl);
			case "openai":
				return await fetchOpenAIModels(apiKey, apiUrl);
			case "mistral":
				return await fetchMistralModels(apiKey, apiUrl);
			default:
				return FALLBACK_MODELS[provider];
		}
	} catch (error) {
		console.warn(`Failed to fetch models for ${provider}, using fallback:`, error);
		return FALLBACK_MODELS[provider];
	}
}

/**
 * 获取Anthropic模型列表
 */
async function fetchAnthropicModels(
	apiKey: string,
	apiUrl?: string,
): Promise<ModelInfo[]> {
	// Anthropic不提供模型列表API，返回预定义列表
	return FALLBACK_MODELS.anthropic;
}

/**
 * 获取OpenAI模型列表
 */
async function fetchOpenAIModels(
	apiKey: string,
	apiUrl?: string,
): Promise<ModelInfo[]> {
	const baseUrl = apiUrl || "https://api.openai.com/v1";

	const response = await fetch(`${baseUrl}/models`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch models: ${response.statusText}`);
	}

	const data = await response.json();

	// 过滤出GPT模型并排序
	const models = data.data
		.filter((model: any) => model.id.startsWith("gpt-"))
		.sort((a: any, b: any) => a.id.localeCompare(b.id))
		.map((model: any) => ({
			id: model.id,
			name: model.id,
			description: model.owned_by || "OpenAI",
		}));

	return models.length > 0 ? models : FALLBACK_MODELS.openai;
}

/**
 * 获取Mistral模型列表
 */
async function fetchMistralModels(
	apiKey: string,
	apiUrl?: string,
): Promise<ModelInfo[]> {
	const baseUrl = apiUrl || "https://api.mistral.ai/v1";

	const response = await fetch(`${baseUrl}/models`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch models: ${response.statusText}`);
	}

	const data = await response.json();

	const models = data.data
		.map((model: any) => ({
			id: model.id,
			name: model.id,
			description: "Mistral AI",
		}));

	return models.length > 0 ? models : FALLBACK_MODELS.mistral;
}

/**
 * 获取所有provider的预定义模型列表（不使用API）
 */
export function getFallbackModels(provider: LlmProvider): ModelInfo[] {
	return FALLBACK_MODELS[provider];
}
