<div class={`feature-row ${ifImpute?'bg-[#E6F2FA]':'bg-[#ffffff]'}`}>
    <div class="feature-name">{featureName}</div>
    <div class="chart-container" >
        <svg bind:this={svgEl}
        width={chartWidth}
        height={chartHeight}
        style="user-select: none;"
      >
        {#each histogramData as d, i}
            <g class="histogram-group" transform={`translate(${xScale(d[0])}, 0)`}>
                <path d={area(d[1])} stroke="none" fill="#A7C6E0" fill-opacity="1"></path>
            </g>
        {/each}
        <g class="stroke-neutral-900/70 fill-neutral-900/70">
            <path d={line(patientValueSeries)} stroke-width="1.5" fill="none"></path>
            {#each patientValueSeries as value}
                <circle 
                use:tooltip={{
                    anchor: 'right',
                    text: `${featureData.name}: ${processFeatureValue(value.value)}`
                }}
                cx={xScale(value.age)} cy={yScale(value.value)} r="5"></circle>
            {/each}
        </g>
        <g class="stroke-orange-600 fill-orange-600/70">
            <path d={line(whatIfValueSeries)} stroke-width="1.5" fill="none"></path>
            {#each whatIfValueSeries as value}
                <circle 
                use:tooltip={{
                    anchor: 'right',
                    text: `${featureData.name}: ${processFeatureValue(value.value)}`
                }}
                cx={xScale(value.age)} cy={yScale(value.value)} r="5"></circle>
            {/each}
        </g>
        {#each selectedCounterfactualValues || [] as d}
            <g class="selected-group">
                <path d={line(d.value)} stroke="#25A042" stroke-width="1.5" fill="none" stroke-opacity="0.7"></path>
                {#each d.value as value}
                    <circle 
                    use:tooltip={{
                        anchor: 'right',
                        text: `${featureData.name}: ${processFeatureValue(value.value)}`
                    }}
                    cx={xScale(value.age)} cy={yScale(value.value)} r="4" fill="#25A042" stroke="black" stroke-width="1" fill-opacity="0.6"></circle>
                {/each}
            </g>
        {/each}
      </svg>
    </div>
</div>

<script lang="ts">
    import {selectedCounterfactuals, processFeatureValue} from '$lib/store';
    import { tooltip } from '$lib/utils/tooltipAction.js';
    import * as d3 from 'd3'
    export let featureData: any;
    export let chartWidth: number;
    export let chartHeight: number;
    export let margin: any;
    export let xScale: any;
    export let featureAttr = {'ifImpute': false, 'name': 'Unknown feature'};
    let svgEl: SVGSVGElement;

    const toFixed = 3;

    const isNumber = (value: any): value is number => typeof value === 'number' && !Number.isNaN(value);

    type ValuePoint = { age: number; value: number };
    type CounterfactualPoint = { age: number; value: any };

    const isValuePoint = (d: any): d is ValuePoint => Boolean(d) && isNumber(d.age) && isNumber(d.value);
    const isCounterfactualPoint = (d: any): d is CounterfactualPoint =>
        Boolean(d) && isNumber(d.age) && d.value !== undefined && d.value !== null;

    const sanitizeValueSeries = (series: any): ValuePoint[] => (
        Array.isArray(series) ? series.filter(isValuePoint) : []
    );

    const sanitizeCounterfactualSeries = (series: any): CounterfactualPoint[] => (
        Array.isArray(series) ? series.filter(isCounterfactualPoint) : []
    );

    const extractNumericValues = (value: any): number[] => {
        if (Array.isArray(value)) {
            return value.filter(isNumber);
        }
        if (value && typeof value === 'object') {
            return Object.values(value).filter(isNumber);
        }
        return [];
    };

    const getValueById = (value: any, id: string | number) => {
        if (value === null || value === undefined) {
            return undefined;
        }

        if (Array.isArray(value)) {
            const index = typeof id === 'number' ? id : Number(id);
            return Number.isFinite(index) ? value[index] : undefined;
        }

        if (typeof value === 'object') {
            return value[id as keyof typeof value];
        }

        return undefined;
    };

    $: ifImpute = featureAttr?.ifImpute??  false;
    $: featureName = featureData?.name ?? 'Unknown feature';
    $: patientValueSeries = sanitizeValueSeries(featureData?.patientValues);
    $: whatIfValueSeries = sanitizeValueSeries(featureData?.whatIfValues);
    $: counterfactualSeries = sanitizeCounterfactualSeries(featureData?.counterfactualValues);

    $: counterfactualNumericValues = counterfactualSeries.flatMap((d: any) => extractNumericValues(d.value));
    $: allValues = [
        ...patientValueSeries.map((d: any) => d.value),
        ...whatIfValueSeries.map((d: any) => d.value),
        ...counterfactualNumericValues
    ].filter(isNumber);

    $: computedExtent = d3.extent(allValues) as [number, number] | undefined;
    $: yDomain = computedExtent && isNumber(computedExtent[0]) && isNumber(computedExtent[1])
        ? (computedExtent[0] === computedExtent[1]
            ? [computedExtent[0] - 1, computedExtent[1] + 1]
            : computedExtent)
        : [0, 1];

    $: yScale = d3.scaleLinear().domain(yDomain as [number, number]).range([chartHeight - margin.top, margin.bottom])

    $: selectedCounterfactualValues = ($selectedCounterfactuals || []).map((id: string | number) => {
        return {
            'id': id,
            'value': counterfactualSeries.map((d: CounterfactualPoint) =>{
                const cfValue = getValueById(d.value, id);
                if(isNumber(cfValue)){
                    return {
                        age: d.age, 
                        value: cfValue
                    }
                }
                }).filter((d: ValuePoint | undefined): d is ValuePoint => d !== undefined)
        }
    }) || []

    $: line = d3.line<{age: number, value: number}>()
        .x(d => xScale(d.age))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX)

    $: bins = d3.bin()
        .domain(yScale.domain() as [number, number])
        .thresholds(10)
        .value(d => d)
    
    $: histogramData = counterfactualSeries.map((d: any) => [d.age, bins(extractNumericValues(d.value))])
    

    $: area = (() => {
        const maxN = Number(d3.max(histogramData, (d: Array<any>) => d[1].length)) || 0;
        const xScaleforViolin = d3.scaleLinear().domain([-maxN, maxN]).range([-20, 20]);
        
        return d3.area<{x0: number, x1: number, length: number}>()
            .x(d => xScaleforViolin(-d.length))
            .x1(d => xScaleforViolin(d.length))
            .y(d => yScale(d.x0))
            .curve(d3.curveCatmullRom);
    })();
</script>

<style>
    .feature-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 5px;
        height:120px;
    }

    .feature-name {
        width: 150px;
        text-align: center;
    }
    .chart-container {
        flex: 1;
    }
</style>