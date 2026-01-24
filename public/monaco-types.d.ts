declare class ListNode {
	val: number;
	next: ListNode | null;
	constructor(val?: number, next?: ListNode | null) {
		this.val = val === undefined ? 0 : val;
		this.next = next === undefined ? null : next;
	}
}

declare function arrayToListNode(arr: number[]): ListNode | null;
declare function listNodeToArray(head: ListNode | null): number[];

// Minimal Vitest / Chai types for IntelliSense
interface Assertion<T = any> {
	not: Assertion<T>;
	toBe(expected: any): void;
	toEqual(expected: any): void;
	toBeTruthy(): void;
	toBeFalsy(): void;
	toBeNull(): void;
	toBeUndefined(): void;
	toBeDefined(): void;
	toBeNaN(): void;
	toContain(item: any): void;
	toBeGreaterThan(number: number): void;
	toBeGreaterThanOrEqual(number: number): void;
	toBeLessThan(number: number): void;
	toBeLessThanOrEqual(number: number): void;
	toBeInstanceOf(constructor: any): void;
	toThrow(message?: string | RegExp): void;
	// Add more matchers as needed
}

interface ExpectStatic {
	<T = any>(actual: T): Assertion<T>;
	extend(matchers: Record<string, any>): void;
	soft<T = any>(actual: T): Assertion<T>;
	poll<T = any>(actual: T): Assertion<T>;
}

declare const expect: ExpectStatic;
declare const vi: any; // Basic mock support placeholder
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;

declare function renderHeap(heap: any[], description: string): void;

// Tree data structure
declare class TreeNode<T = any> {
	value: T;
	children: TreeNode<T>[];
	constructor(value: T, children?: TreeNode<T>[]);
	addChild(child: TreeNode<T> | T): void;
	removeChild(child: TreeNode<T>): void;
	find(predicate: (value: T) => boolean): TreeNode<T> | null;
	traverse(callback: (node: TreeNode<T>) => void): void;
	toString(): string;
}

declare function renderTree(root: TreeNode<any>, description: string): void;
