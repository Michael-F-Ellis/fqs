import { CoordinateManager } from '../src/coordinate_manager.js';
describe('CoordinateManager', () => {
	let manager;

	beforeEach(() => {
		// Mock canvas with 1000x800 dimensions
		const canvas = {
			width: 1000,
			height: 800
		};
		manager = new CoordinateManager(canvas);
	});

	test('converts screen to normalized coordinates', () => {
		const result = manager.toNormalized(500, 400);
		expect(result.x).toBe(0.5);
		expect(result.y).toBe(0.5);
	});

	test('converts normalized to screen coordinates', () => {
		const result = manager.toScreen(0.5, 0.5);
		expect(result.x).toBe(500);
		expect(result.y).toBe(400);
	});

	test('computes new position after drag', () => {
		const result = manager.computeNewPosition(
			0.5, 0.5,    // Starting at center
			100, -50     // Drag right and up
		);
		expect(result.x).toBe(0.6);   // Moved 10% right
		expect(result.y).toBe(0.4375); // Moved 6.25% up
	});

	test('maintains bounds during drag', () => {
		const result = manager.computeNewPosition(
			0.9, 0.9,     // Start near edge
			200, 200      // Large drag
		);
		expect(result.x).toBeLessThanOrEqual(1.0);
		expect(result.y).toBeLessThanOrEqual(1.0);
	});

	test('updates canvas dimensions on resize', () => {
		// Initial conversion at 1000x800
		let result = manager.toScreen(0.5, 0.5);
		expect(result.x).toBe(500);
		expect(result.y).toBe(400);

		// Resize to 2000x1600
		manager.resizeCanvas(2000, 1600);

		// Same normalized coords should give scaled screen coords
		result = manager.toScreen(0.5, 0.5);
		expect(result.x).toBe(1000);
		expect(result.y).toBe(800);
	});
});
