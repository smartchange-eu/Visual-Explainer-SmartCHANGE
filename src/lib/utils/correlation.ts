import type { DataArrI } from '$lib/types';
import type { A } from 'vitest/dist/reporters-LqC_WI4d.js';

export const calcPearson = (x: number[], y: number[]): number => {
	const n = x.length;
	const sumX = x.reduce((a, b) => a + b, 0);
	const sumY = y.reduce((a, b) => a + b, 0);
	const sumX2 = x.reduce((a, b) => a + b ** 2, 0);
	const sumY2 = y.reduce((a, b) => a + b ** 2, 0);
	const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
	const numerator = n * sumXY - sumX * sumY;
	const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
	return numerator / denominator;
};

export const calcPearsonMatrix = (data: number[][]): number[][] => {
	const n = data[0].length;
	const matrix = Array(n)
		.fill(0)
		.map(() => Array(n).fill(0));
	for (let i = 0; i < n; i++) {
		for (let j = i; j < n; j++) {
			const x = data.map((d) => d[i]);
			const y = data.map((d) => d[j]);
			const p = calcPearson(x, y);
			matrix[i][j] = p;
			matrix[j][i] = p;
		}
	}
	return matrix;
};

export const calcPearsonMatrixFromData = (
	data: DataArrI
): Record<string, Record<string, number>> => {
	const keys = Object.keys(data[0]);
	const n = keys.length;
	const matrix: Record<string, Record<string, number>> = {};
	for (let i = 0; i < n; i++) {
		matrix[keys[i]] = {};
		for (let j = 0; j < n; j++) {
			const x = data.map((d) => d[keys[i]]);
			const y = data.map((d) => d[keys[j]]);
			const p = calcPearson(x, y);
			matrix[keys[i]][keys[j]] = p;
		}
	}
	return matrix;
};
