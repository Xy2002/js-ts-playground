declare class ListNode {
	val: number;
	next: ListNode | null;
	constructor(val?: number, next?: ListNode | null);
}

declare function arrayToListNode(arr: number[]): ListNode | null;
declare function listNodeToArray(head: ListNode | null): number[];

// Minimal Vitest / Chai types for IntelliSense
interface Assertion<T = unknown> {
	not: Assertion<T>;
	toBe(expected: T): void;
	toEqual(expected: unknown): void;
	toBeTruthy(): void;
	toBeFalsy(): void;
	toBeNull(): void;
	toBeUndefined(): void;
	toBeDefined(): void;
	toBeNaN(): void;
	toContain(item: unknown): void;
	toBeGreaterThan(number: number): void;
	toBeGreaterThanOrEqual(number: number): void;
	toBeLessThan(number: number): void;
	toBeLessThanOrEqual(number: number): void;
	toBeInstanceOf(ctor: abstract new (...args: unknown[]) => unknown): void;
	toThrow(message?: string | RegExp): void;
}

interface ExpectStatic {
	<T = unknown>(actual: T): Assertion<T>;
	extend(matchers: Record<string, unknown>): void;
	soft<T = unknown>(actual: T): Assertion<T>;
	poll<T = unknown>(actual: T): Assertion<T>;
}

declare const expect: ExpectStatic;
declare const vi: unknown;
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;

declare function renderHeap(heap: unknown[], description: string): void;
