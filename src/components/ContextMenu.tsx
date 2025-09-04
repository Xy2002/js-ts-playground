import type React from "react";
import { useEffect, useRef } from "react";

export interface MenuItem {
	id: string;
	label: string;
	icon?: React.ReactNode;
	disabled?: boolean;
	separator?: boolean;
	onClick?: () => void;
}

export interface ContextMenuProps {
	isOpen: boolean;
	position: { x: number; y: number };
	items: MenuItem[];
	onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
	isOpen,
	position,
	items,
	onClose,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				onClose();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscape);

			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				document.removeEventListener("keydown", handleEscape);
			};
		}
	}, [isOpen, onClose]);

	useEffect(() => {
		if (isOpen && menuRef.current) {
			// 调整菜单位置，确保不超出视窗边界
			const menu = menuRef.current;
			const rect = menu.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			let adjustedX = position.x;
			let adjustedY = position.y;

			// 如果菜单超出右边界，向左调整
			if (position.x + rect.width > viewportWidth) {
				adjustedX = viewportWidth - rect.width - 8;
			}

			// 如果菜单超出下边界，向上调整
			if (position.y + rect.height > viewportHeight) {
				adjustedY = viewportHeight - rect.height - 8;
			}

			// 确保不超出左边界和上边界
			adjustedX = Math.max(8, adjustedX);
			adjustedY = Math.max(8, adjustedY);

			menu.style.left = `${adjustedX}px`;
			menu.style.top = `${adjustedY}px`;
		}
	}, [isOpen, position]);

	if (!isOpen) return null;

	const handleItemClick = (item: MenuItem) => {
		if (!item.disabled && item.onClick) {
			item.onClick();
			onClose();
		}
	};

	return (
		<div
			ref={menuRef}
			className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
			style={{
				left: position.x,
				top: position.y,
			}}
		>
			{items.map((item, index) => {
				if (item.separator) {
					return (
						<div
							key={`separator-${item.id || index}`}
							className="border-t border-gray-200 my-1"
						/>
					);
				}

				return (
					<button
						type="button"
						key={item.id}
						className={`
              flex items-center px-3 py-2 text-sm cursor-pointer w-full text-left
              ${
								item.disabled
									? "text-muted-foreground cursor-not-allowed"
									: "text-foreground hover:bg-accent"
							}
            `}
						onClick={() => handleItemClick(item)}
						disabled={item.disabled}
					>
						{item.icon && (
							<span className="mr-2 w-4 h-4 flex items-center justify-center">
								{item.icon}
							</span>
						)}
						<span className="flex-1">{item.label}</span>
					</button>
				);
			})}
		</div>
	);
};

export default ContextMenu;
