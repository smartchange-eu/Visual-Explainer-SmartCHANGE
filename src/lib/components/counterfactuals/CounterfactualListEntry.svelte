<script lang="ts">
	import { scaleLinear } from 'd3';
	import type { DataI } from '../../types';
	import HeatmapD3 from './HeatmapD3.svelte';
	import { createEventDispatcher } from 'svelte';

	export let counterfactual: DataI;
	export let selected: boolean;
	export let margin: { r: number; l: number };
	export let width: number;
	export let step: number;
	export let highlight = false;
export let data: {
	key: string;
	value: number | null;
	patientValue: number | null;
	hasValue: boolean;
	increase: boolean;
	diff: number;
	percentageNum: number;
	percentage: string;
}[];
	export let colorScale: (k: string, v: number) => string;

	const dispatch = createEventDispatcher();

	let ref: HTMLDivElement | null = null;
	$: xScale = scaleLinear()
		.domain([0, data.length])
		.range([0, width-margin.l-margin.r]);
	
	$: xWidth = step;
</script>

<div class="flex flex-row">
	<div
		style={`width: ${step}px; margin-left: ${margin.l-step/2}px;`}
		class={`mouse-pointer flex justify-center hover:bg-slate-100 ${highlight ? 'bg-[green]' : ''}`}
		aria-roledescription="checkbox"
		role="checkbox"
		aria-checked={selected}
		tabindex="0"
		on:change={() => {}}
		on:mouseover={() => dispatch('mouseover')}
		on:mousedown|stopPropagation|preventDefault={() => dispatch('mousedown')}
		on:click|stopPropagation|preventDefault={() => dispatch('click')}
		on:keydown={() => dispatch('keydown')}
		on:focus={() => dispatch('focus')}
		on:blur={() => dispatch('blur')}
	>
		<div class="relative w-3.5 h-3.5">
		<input type="checkbox" class=" absolute shrink-0 peer appearance-none h-3.5 w-3.5 checked:bg-[#25A042] border-2 border-[#25A042] rounded-sm mt-0.1" checked={selected} />
		<svg class="
			absolute 
			w-3.5 h-3.5
			hidden peer-checked:block"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="white"
			stroke-width="4"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="20 6 9 17 4 12"></polyline>
		</svg>
		</div>
	</div>
	<button
		class=" m-0 bg-transparent p-0 text-sm font-light"
		on:mousedown|stopPropagation|preventDefault={() => dispatch('mousedown')}
	>
		<div class="h-3.5 w-full bg-transparent" bind:this={ref} style={`width: ${width-margin.l-margin.r}px;`}>
			<HeatmapD3
				width={width-margin.l-step/2}
				{highlight}
				data={[data.map((d) => ({
					key: d.key,
					diff: d.diff,
					value: d.value,
					patientValue: d.patientValue,
					hasValue: d.hasValue
				}))]}
				xScale={xScale}
				{colorScale}
				{xWidth}
			/>
		</div>
		<!-- <div class="flex w-full flex-row">
			<h3 class="flex-grow text-left text-lg font-semibold">
				Estimated Effort: {counterfactual.effort.toFixed(0)}
			</h3>
			{#if hovering}
				<button
					class="btn btn-circle btn-outline btn-error btn-sm"
					on:click={() => {
						$counterfactuals = $counterfactuals.filter((c) => c !== counterfactual);
					}}
				>
					<Icon icon="material-symbols:delete" class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<span>Target: {counterfactual[$targetFeature]}</span>
		{#each data as d}
			{#if d.value !== $patient[d.key] && d.key !== $targetFeature}
				<span class="truncate">
					<span class="font-semibold">{d.key}: {d.value}</span>
					from {$patient[d.key]} (<Icon
						icon={d.increase ? 'tabler:arrow-narrow-up' : 'tabler:arrow-narrow-down'}
						class="m-0 inline p-0 align-middle"
						color={d.increase ? 'purple' : 'orange'}
						inline
					/>{d.diff}
					or {d.percentage})
				</span>
			{/if}
		{/each} -->
	</button>
</div>

<style>
</style>
