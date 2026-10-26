<script lang="ts">
	import { bin, extent, scaleLinear } from 'd3';

	type dataProp = Array<Record<string, number>>;
	export let data: dataProp;

	const width = 800;
	const height = 400;
	let histogram: Array<Array<Record<string, number>>> = [];
	let xScale: any;
	let yScale: any;

	$: if (data) generate(data);
	function generate(data: dataProp) {
		const col = 'Glucose';
		let e = extent(data.map((d) => d[col])) as [number, number];

		xScale = scaleLinear().domain(e).range([0, width]);
		var b = bin<Record<string, number>, number>()
			.value((d) => d[col])
			.domain(e)
			.thresholds(xScale.ticks(10));
		histogram = b(data);

		let maxBin = Math.max(...histogram.map((d) => d.length));
		yScale = scaleLinear().domain([0, maxBin]).range([0, height]);
	}
</script>

{#if histogram && yScale && xScale}
	<svg>
		{#each histogram as bin}
			<rect
				x={xScale(bin.x0) + 1}
				y={height - yScale(bin.length)}
				width={xScale(bin.x1 - bin.x0) - 1}
				height={yScale(bin.length)}
				fill="steelblue"
			/>
		{/each}
	</svg>
{/if}

<style>
	svg {
		width: 100%;
		height: 100%;
	}
</style>
