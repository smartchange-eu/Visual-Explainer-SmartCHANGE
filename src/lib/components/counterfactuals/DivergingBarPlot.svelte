<script lang="ts">
	import { featureShown, patientInfoOfAnalyzeAge } from '$lib/store';
	import { mean } from 'lodash-es';
	import type { Data } from 'plotly.js-dist-min';
	import { onMount, onDestroy } from 'svelte';

	export let colorScale: (k: string, v: number) => string;
	export let counterfactuals: any[];

	let ref: HTMLDivElement | null = null;
	let margin = 0;
	let resizeObserver: ResizeObserver;

	onMount(() => {
		if (ref) {
			resizeObserver = new ResizeObserver(() => {
				if (counterfactuals) generate();
			});
			resizeObserver.observe(ref);
		}
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	});

	$: if (ref && counterfactuals) generate();
	async function generate() {
		if (ref) {
			const Plotly = await import('plotly.js-dist-min');
			const x = $featureShown.map((f) => {
				return f.replace;
			});
			const y = $featureShown.map((f) => {
				return mean(
					counterfactuals.map((d: any) => {
						return d[f.name] - ($patientInfoOfAnalyzeAge as any)[f.name];
					})
				);
			});
			const bottomMargin = Math.max(...x.map((name) => name.length * 4.5)) + margin;
			var trace: Data = {
				x: x,
				y: y,
				type: 'bar',
				marker: {
					color: x.map((_, i) => colorScale($featureShown[i].name, y[i]))
				}
			};
			Plotly.newPlot(
				ref,
				[trace],
				{
					margin: { t: margin / 2, l: 40, r: 25, b: bottomMargin },
					plot_bgcolor: 'rgba(0,0,0,0)',
					paper_bgcolor: 'rgba(0,0,0,0)',
					xaxis: {
						// set angle
						tickangle: -45,
						tickwidth: 1

						// ticktext: featureData.metadata?.values,
						// tickvals: featureData.metadata?.values?.map((v, i) => i)
					},
					font: {
						size: 10
					}
					// height: 00
				},
				{
					displayModeBar: false,
					displaylogo: false
					// modeBarButtonsToRemove: ['pan2d', 'lasso2d']
				}
			);
		}
	}
</script>

<div bind:this={ref} class="h-full w-full"></div>

