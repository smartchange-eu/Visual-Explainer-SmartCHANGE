import { scalePoint } from 'd3';
import type { FeatureSettingI } from '../types';

export interface OrderByConfig {
	key: string;
	direction: 'asc' | 'desc';
	replace: string;
}

export interface ScaleConfig {
	width: number;
	margin: { r: number; l: number };
}

/**
 * Creates a scale for the counterfactual list axis
 * @param featureShown - Array of features to display
 * @param orderBy - Current ordering configuration
 * @param config - Scale configuration (width and margins)
 * @returns D3 scale for the axis
 */
export function createCounterfactualAxisScale(
	featureShown: FeatureSettingI[],
	orderBy: OrderByConfig | undefined,
	config: ScaleConfig
) {
	const { width, margin } = config;
	
	const replaceMap = Object.fromEntries(
		featureShown.map((f) => [
			orderBy?.key !== f.name
				? f.data.replace
				: orderBy?.direction === 'asc'
					? '<' + f.data.replace
					: '>' + f.data.replace,
			f
		])
	);

	const x = scalePoint()
		.domain(['Selected', ...Object.keys(replaceMap)])
		.range([margin.l, width - margin.r])
		.padding(0);

	return { x, replaceMap };
}

/**
 * Calculates the step size for each feature column
 * @param width - Total width
 * @param margin - Margins
 * @param featureCount - Number of features
 * @returns Step size
 */
export function calculateStepSize(width: number, margin: { r: number; l: number }, featureCount: number) {
	return (width - (margin.r + margin.l)) / featureCount;
} 