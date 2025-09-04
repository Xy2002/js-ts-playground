import { Search, X } from "lucide-react";

interface FileSearchBoxProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export default function FileSearchBox({
	value,
	onChange,
	placeholder = "搜索文件...",
}: FileSearchBoxProps) {
	const handleClear = () => {
		onChange("");
	};

	return (
		<div className="relative">
			<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<Search className="h-4 w-4 text-muted-foreground" />
			</div>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full pl-10 pr-8 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
			/>
			{value && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}
