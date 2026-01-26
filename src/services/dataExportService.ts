import type { LlmSettings, UserSettings } from "@/store/usePlaygroundStore";
import type { FileInfo, FolderInfo } from "@/types/multiFile";

/**
 * 完整的应用数据导出结构
 */
export interface ExportData {
	version: string;
	exportDate: string;
	// 代码内容
	codeHistory: {
		javascript: string;
		typescript: string;
	};
	language: "javascript" | "typescript";
	// 用户设置
	settings: UserSettings;
	// LLM设置 (敏感信息，可选导出)
	llmSettings?: LlmSettings;
	// 多文件系统
	files: Record<string, FileInfo>;
	folders: Record<string, FolderInfo>;
	fileContents: Record<string, string>;
	activeFileId: string | null;
	openTabs: Array<{
		fileId: string;
		fileName: string;
		filePath: string;
		isDirty: boolean;
		isActive: boolean;
	}>;
	// UI状态
	uiState: {
		isFileExplorerOpen: boolean;
		fileExplorerWidth: number;
		expandedFolders: string[];
	};
}

/**
 * 数据导入选项
 */
export interface ImportOptions {
	// 是否包含LLM设置 (可能包含敏感API密钥)
	includeLlmSettings: boolean;
	// 合并策略
	mergeStrategy: "overwrite" | "merge" | "skip";
	// 是否保留当前设置
	preserveCurrentSettings: boolean;
}

/**
 * 数据导出/导入服务
 */
class DataExportService {
	/**
	 * 导出完整的应用数据
	 */
	exportData(
		codeHistory: { javascript: string; typescript: string },
		language: "javascript" | "typescript",
		settings: UserSettings,
		llmSettings: LlmSettings,
		files: Record<string, FileInfo>,
		folders: Record<string, FolderInfo>,
		fileContents: Record<string, string>,
		activeFileId: string | null,
		openTabs: Array<{
			fileId: string;
			fileName: string;
			filePath: string;
			isDirty: boolean;
			isActive: boolean;
		}>,
		uiState: {
			isFileExplorerOpen: boolean;
			fileExplorerWidth: number;
			expandedFolders: Set<string>;
		},
		includeLlmSettings: boolean = false,
	): ExportData {
		return {
			version: "1.0.0",
			exportDate: new Date().toISOString(),
			codeHistory,
			language,
			settings,
			llmSettings: includeLlmSettings ? llmSettings : undefined,
			files,
			folders,
			fileContents,
			activeFileId,
			openTabs,
			uiState: {
				...uiState,
				expandedFolders: Array.from(uiState.expandedFolders),
			},
		};
	}

	/**
	 * 将导出数据下载为JSON文件
	 */
	downloadAsJson(data: ExportData, filename?: string): void {
		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const link = document.createElement("a");
		link.href = url;
		link.download =
			filename ||
			`playground-data-${new Date().toISOString().split("T")[0]}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	}

	/**
	 * 从JSON文件导入数据
	 */
	async importFromFile(file: File): Promise<ExportData> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const json = e.target?.result as string;
					const data = JSON.parse(json) as ExportData;

					// 验证数据格式
					this.validateImportData(data);

					resolve(data);
				} catch (error) {
					reject(
						new Error(
							`Failed to parse import file: ${error instanceof Error ? error.message : String(error)}`,
						),
					);
				}
			};

			reader.onerror = () => {
				reject(new Error("Failed to read file"));
			};

			reader.readAsText(file);
		});
	}

	/**
	 * 验证导入数据的格式
	 */
	validateImportData(data: unknown): asserts data is ExportData {
		if (!data || typeof data !== "object") {
			throw new Error("Invalid data format");
		}

		if (!data.version) {
			throw new Error("Missing version information");
		}

		if (!data.codeHistory) {
			throw new Error("Missing code history");
		}

		if (!data.settings) {
			throw new Error("Missing settings");
		}

		if (!data.files || typeof data.files !== "object") {
			throw new Error("Invalid files data");
		}

		if (!data.folders || typeof data.folders !== "object") {
			throw new Error("Invalid folders data");
		}

		if (!data.fileContents || typeof data.fileContents !== "object") {
			throw new Error("Invalid file contents");
		}
	}

	/**
	 * 生成导入数据的摘要信息
	 */
	generateImportSummary(data: ExportData): {
		codeSnippets: number;
		files: number;
		folders: number;
		totalFileSize: number;
		hasSettings: boolean;
		hasLlmSettings: boolean;
		exportDate: string;
		version: string;
	} {
		const totalFileSize = Object.values(data.fileContents).reduce(
			(sum, content) => sum + content.length,
			0,
		);

		return {
			codeSnippets: 2, // JS and TS
			files: Object.keys(data.files).length,
			folders: Object.keys(data.folders).length,
			totalFileSize,
			hasSettings: !!data.settings,
			hasLlmSettings: !!data.llmSettings,
			exportDate: data.exportDate,
			version: data.version,
		};
	}

	/**
	 * 导出为URL (用于分享)
	 */
	exportAsUrl(data: ExportData): string {
		// 压缩数据 (简单实现，生产环境可使用压缩库)
		const json = JSON.stringify(data);
		const compressed = btoa(encodeURIComponent(json));

		// 限制URL长度，避免浏览器限制
		if (compressed.length > 200000) {
			throw new Error("Data too large for URL export");
		}

		return `${window.location.origin}${window.location.pathname}#import=${compressed}`;
	}

	/**
	 * 从URL导入数据
	 */
	importFromUrl(): ExportData | null {
		const hash = window.location.hash;
		if (!hash.startsWith("#import=")) {
			return null;
		}

		try {
			const compressed = hash.substring(8); // Remove "#import="
			const json = decodeURIComponent(atob(compressed));
			const data = JSON.parse(json) as ExportData;

			// 清除URL中的导入标记
			window.history.replaceState(
				{},
				document.title,
				window.location.pathname + window.location.search,
			);

			// 验证数据
			this.validateImportData(data);

			return data;
		} catch (error) {
			console.error("Failed to import from URL:", error);
			return null;
		}
	}
}

export const dataExportService = new DataExportService();
