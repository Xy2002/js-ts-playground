// LeetCode-style binary tree TreeNode
declare class TreeNode {
	val: number;
	left: TreeNode | null;
	right: TreeNode | null;
	constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null);
}

declare function renderTree(
	root: TreeNode | unknown,
	description?: string,
	highlightedNodes?: unknown[],
): void;
