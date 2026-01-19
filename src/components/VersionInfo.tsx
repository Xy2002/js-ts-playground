export function VersionInfo() {
	if (!__COMMIT_HASH__) return null;

	return (
		<div className="fixed bottom-1 left-1 z-50 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
			<div className="text-[10px] text-muted-foreground font-mono bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded border shadow-sm flex flex-col gap-0.5 max-w-[300px]">
				<div className="flex items-center gap-1.5">
					<span className="font-semibold">Build:</span>
					<span>{__COMMIT_HASH__.substring(0, 7)}</span>
				</div>
				{__COMMIT_MESSAGE__ && (
					<div className="truncate" title={__COMMIT_MESSAGE__}>
						{__COMMIT_MESSAGE__}
					</div>
				)}
			</div>
		</div>
	);
}
