// General N-ary tree TreeNode
declare class TreeNode<T = unknown> {
	value: T;
	children: TreeNode<T>[];
	constructor(value?: T, children?: TreeNode<T>[]);
	addChild(child: TreeNode<T> | T): void;
	removeChild(child: TreeNode<T>): void;
	find(predicate: (value: T) => boolean): TreeNode<T> | null;
	traverse(callback: (node: TreeNode<T>) => void): void;
	toString(): string;
}

declare function renderTree(
	root: TreeNode<unknown> | unknown,
	description?: string,
	highlightedNodes?: unknown[],
): void;
