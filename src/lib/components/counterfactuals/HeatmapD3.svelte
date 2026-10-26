<script lang="ts">
import {  featureSettings, focusFeature } from '$lib/store';
import { scaleLinear, type ScalePoint } from 'd3';
// @ts-ignore
import { tooltip } from '$lib/utils/tooltipAction.js';
export let data: Array<Array<{
	key: string;
	value: number | null;
	patientValue: number | null;
	diff: number;
	hasValue: boolean;
}>>;

	export let colorScale: (k: string, v: number) => string;
	export let width: number;
	export let rectMargin = 0.5;
	export let highlight = false;
	export let xWidth: number;
	let ref: SVGSVGElement | null = null;
	export let xScale: ScalePoint<string>;

	$: size = ref?.getBoundingClientRect()
		? { width: ref.getBoundingClientRect().width, height: ref.getBoundingClientRect().height }
		: undefined;
	// $: xScale = scaleLinear()
	// 	.domain([0, data[0].length])
	// 	.range([margin.l, (width || 0) - margin.r-step/2]);

	$: yScale = scaleLinear()
		.domain([0, data.length])
		.range([0, size?.height || 0]);
	$: yWidth = yScale(1) - yScale(0);

	let hovering: boolean = false;
const toFixed = 2;
const formatValue = (value: number | null, key: string) => {
	if (value === null) {
		return 'No value';
	}

	const setting = $featureSettings[key]?.data;
	if (setting?.values && setting.values[value] !== undefined) {
		return setting.values[value];
	}

	return value.toFixed(toFixed);
};

const buildTooltip = (d: {
	key: string;
	value: number | null;
	patientValue: number | null;
	diff: number;
	hasValue: boolean;
}) => {
	const label = $featureSettings[d.key]?.data.replace || d.key;
	if (!d.hasValue) {
		return `${label}: No value`;
	}

	const patientDisplay = formatValue(d.patientValue, d.key);
	const cfDisplay = formatValue(d.value, d.key);
	const diffLabel = `${d.diff > 0 ? '+' : ''}${d.diff.toFixed(toFixed)} compared to patient's ${patientDisplay}`;

	return `${label}: ${cfDisplay}<br>(${diffLabel})`;
};
</script>

<svg class="h-full w-full bg-transparent" bind:this={ref}>
	{#if size}
		{#each data as dd, ii}
			<rect
				x={0}
				y={yScale(ii)}
				width={(width || 0)}
				height={yWidth}
				class={`${hovering ? 'fill-green-800' : highlight ? 'fill-green-800' : 'fill-transparent'}`}
			/>
			<rect
				x={ rectMargin}
				y={yScale(ii) + rectMargin}
				width={(width || 0) - 2 * rectMargin}
				height={yWidth - 2 * rectMargin}
				class={`${hovering ? 'fill-green-800' : highlight ? 'fill-gray-100' : 'fill-transparent'}`}
				on:mouseover={(e) => (hovering = true)}
				on:mouseout={() => (hovering = false)}
				on:blur={() => (hovering = false)}
				on:focus={() => {}}
				role="row"
				tabindex={ii}
			/>
			{#each dd as d, i}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<rect
					use:tooltip={{
						anchor: 'right',
						text: buildTooltip(d)
					}}
					x={xScale(i) + rectMargin}
					y={yScale(ii) + rectMargin}
					width={xWidth - 2 * rectMargin}
					height={yWidth - 2 * rectMargin}
					fill={d.hasValue ? colorScale(d.key, d.diff) : '#000000'}
					class="stroke-black stroke-0 hover:stroke-[1px]"
					role="cell"
					on:mousedown={() => {
						$focusFeature = d.key;
					}}
					on:mouseover={() => {
						hovering = true;
					}}
					on:mouseout={() => (hovering = false)}
					on:blur={() => (hovering = false)}
					on:focus={() => {}}
					tabindex={i}
				/>
			{/each}
		{/each}
	{/if}
</svg>

<style>
	rect:focus {
		outline: none;
	}
</style>
