<script lang="ts">
	import { cloneDeep, find } from 'lodash-es';
	import {
		counterfactualsOfAnalyzeAge,
		patientInfoOfAnalyzeAge,
		featureShown,
		selectedCounterfactuals,
		shadowPatient,
		focusFeature,
	} from '../../store';
	import CounterfactualListEntry from './CounterfactualListEntry.svelte';
	import {  axisTop, scaleLinear, scalePoint, select } from 'd3';
	import Tooltip from '../../utils/Tooltip.svelte';
	import DivergingBarPlot from './DivergingBarPlot.svelte';

	let axis: SVGSVGElement;
	let axisG: SVGGElement;
	let viewWidth: number = 500;
	let margin = { r: 40, l: 30 };
	type RawCounterfactual = Record<string, any>;
	type Counterfactual = RawCounterfactual & { id: number };
	type FeatureDescriptor = { name: string; replace: string };

	const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
	const asRecord = (value: unknown): Record<string, any> =>
		value && typeof value === 'object' ? (value as Record<string, any>) : {};
	const getCounterfactualAt = (index: number) => localCounterfactuals[index] as any;

	let orderBy: { key: string; direction: 'asc' | 'desc'; replace: string } | undefined;
	let localCounterfactuals: Counterfactual[] = [];
	let selecting = false;
	let selectingToValue = false;
	const isNumeric = (value: any): value is number => typeof value === 'number' && !Number.isNaN(value);

	$: {
	const sourceCounterfactuals = cloneDeep(asArray<RawCounterfactual>($counterfactualsOfAnalyzeAge));
	localCounterfactuals = sourceCounterfactuals.map((cf, index) => ({
		...cf,
		id: index
	})) as Counterfactual[];
		reorderCounterfactuals();
	}

	$: featureList = asArray<FeatureDescriptor>([{'name':'Risk_level','replace':'risk'},...$featureShown]);
	$: patientInfo = asRecord($patientInfoOfAnalyzeAge);
	$: selectedCounterfactualIds = asArray<number>($selectedCounterfactuals);
		
	$: step = featureList.length > 0 ? (viewWidth - (margin.r + margin.l)) / featureList.length : 0;

	$: replaceMap = Object.fromEntries(
		featureList.map((f) => [
				orderBy?.key !== f.name
					? f.replace
					: orderBy?.direction === 'asc'
						? '<' + f.replace
						: '>' + f.replace,
				f
			])
		);
	
	$:x = scalePoint()
			.domain(['Selected', ...Object.keys(replaceMap)])
			.range([margin.l, viewWidth - margin.r])
			.padding(0);

	$: if (axis && axisG && localCounterfactuals && $featureShown && viewWidth) generateAxis();
	function generateAxis() {
		if (!axis || !axisG) return;

		const height = axis.getBoundingClientRect().height;

		const gx = select(axisG)
			.attr('transform', `translate(0,${height - 0})`)
			.call(axisTop<string>(x))
			.selectAll('text')
			.style('text-anchor', 'start')
			.style('user-select', 'none')
			.attr('dx', '.5em')
			.attr('dy', '.8em')
			.attr('transform', 'rotate(-45)')
			.attr('cursor', 'pointer')
			.attr('font-size', '0.9rem')
			.attr('font-weight', (d) => {
				// Strip < or > prefix for comparison
				const cleanD = (d as string).replace(/^[<>]/, '');
				return cleanD === orderBy?.replace ? 600 : 300})
			.on('click', (e, d: any) => {
				$focusFeature = d;
				if (d === 'Selected') {
					orderBy = { key: 'Selected', direction: 'asc', replace: d };
				}
				else if (orderBy && orderBy?.key === replaceMap[d].name) {
					if (orderBy.direction === 'asc') {
						orderBy.direction = 'desc';
					} else {
						orderBy = undefined;
					}
				} else {
					orderBy = { key: replaceMap[d].name, direction: 'asc', replace: d };
				}
				reorderCounterfactuals();
			});
	}

	function reorderCounterfactuals() {
	const sourceCounterfactuals = cloneDeep(asArray<RawCounterfactual>($counterfactualsOfAnalyzeAge));
	const _localCounterfactuals: Counterfactual[] = sourceCounterfactuals.map((cf, index) => ({
			...cf,
			id: index
	})) as Counterfactual[];
		if (orderBy !== undefined) {
			if(orderBy.key === 'Selected') {
			_localCounterfactuals.sort((a, b) => selectedCounterfactualIds.indexOf(b.id) - selectedCounterfactualIds.indexOf(a.id));
			} else {
				if (orderBy.direction === 'asc') {
				_localCounterfactuals.sort((a, b) => (b[orderBy!.key] as number) - (a[orderBy!.key] as number));
				} else {
				_localCounterfactuals.sort((a, b) => (a[orderBy!.key] as number) - (b[orderBy!.key] as number));
				}
			}
		} else {
		}
		localCounterfactuals = _localCounterfactuals;
		generateAxis();
	}

$: data = localCounterfactuals?.map((c: Counterfactual) =>{
		return featureList.map((f) => {
			const patientValue = patientInfo[f.name];
			const counterfactualValue = c[f.name];
			const hasValidValues = isNumeric(counterfactualValue) && isNumeric(patientValue);
			const diff = hasValidValues ? counterfactualValue - patientValue : 0;
			const increase = hasValidValues ? patientValue < counterfactualValue : false;
			const percentageNum =
				hasValidValues && patientValue !== 0
					? (Math.abs(patientValue - counterfactualValue) / Math.abs(patientValue)) * 100
					: 0;
			const percentage = hasValidValues && patientValue !== 0
				? `${percentageNum.toFixed(2).replace(/[.,]00$/, '')}%`
				: '—';

			return {
				key: f.name,
				value: hasValidValues ? counterfactualValue : null,
				patientValue: hasValidValues ? patientValue : null,
				hasValue: hasValidValues,
				increase,
				diff,
				percentageNum,
				percentage
			};
		});
}	);
	$: perFeatureMaxAbs = data
		? Object.fromEntries(
			featureList.map((f) => [
					f.name,
					Math.max(...data.map((d) => Math.abs(d.find((e) => e.key === f.name)?.diff || 0)))
				])
			)
		: undefined;
$: axisHeight = featureList.length
	? Math.max(...featureList.map((f) => f.replace.length)) * 4.5
	: 0;

	const minColor = '#998ec3';
	const medColor = '#f7f7f7';
	const maxColor = '#f1a340';

	$: colorScale = !perFeatureMaxAbs
		? undefined
		: (k: string, v: number) => {
				const maxAbs = perFeatureMaxAbs[k];
				const color = scaleLinear<string>()
					.domain([-maxAbs, 0, maxAbs])
					.range([minColor, medColor, maxColor]);
				return color(v);
			};

	function mouseUpEvent() {
		selecting = false;
		window.removeEventListener('mouseup', mouseUpEvent);
	}
</script>

<div class="flex-1 w-full min-h-0 flex flex-col"  bind:clientWidth={viewWidth}>
	{#if localCounterfactuals && colorScale}
		{#if localCounterfactuals.length > 0}
			<div class="flex flex-row items-center">
				<label class="relative w-4 h-4 ml-[30px] cursor-pointer">
					<input
						type="checkbox"
						class="absolute shrink-0 peer appearance-none h-3.5 w-3.5 checked:bg-[#25A042] border-2 border-[#25A042]"
						checked={selectedCounterfactualIds.length === localCounterfactuals.length}
						indeterminate={selectedCounterfactualIds.length > 0 && selectedCounterfactualIds.length < localCounterfactuals.length}
						on:change={(e) => {
							const target = e.target;
							if (target instanceof HTMLInputElement && target.checked) {
								$selectedCounterfactuals = localCounterfactuals.map(c => c.id);
							} else {
								$selectedCounterfactuals = [];
							}
						}}
					/>
					<svg
						class="absolute w-3.5 h-3.5 hidden peer-checked:block pointer-events-none"
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
				</label>
				<div class="descText select-none">Select/Deselect all</div>
			</div>
		{/if}
		<div class="flex-initial relative" style={`height: ${axisHeight}px`}>
			<svg bind:this={axis} height={axisHeight} width={viewWidth}>
				<g bind:this={axisG} />
			</svg>
		</div>
		<div class="basis-auto grow-0 shrink-1 overflow-auto " style="scrollbar-width: thin;">
			{#each data as d, i}
				<CounterfactualListEntry
					data={d}
					width={viewWidth}
					step = {step}
					{colorScale}
					highlight={$shadowPatient === localCounterfactuals[i].id}
					counterfactual={getCounterfactualAt(i)}
					{margin}
					selected={selectedCounterfactualIds.includes(localCounterfactuals[i].id)}
					on:mousedown={() => {
						if ($selectedCounterfactuals) {
							selecting = true;
							selectingToValue = !$selectedCounterfactuals.includes(localCounterfactuals[i].id);
							if (selectingToValue) $selectedCounterfactuals.push(localCounterfactuals[i].id);
							else {
								$selectedCounterfactuals = $selectedCounterfactuals.filter(
									(s) => s !== localCounterfactuals[i].id
								);
								if ($shadowPatient === localCounterfactuals[i].id) {
									$shadowPatient = -1;
								}
							}
							$selectedCounterfactuals = $selectedCounterfactuals;
							window.addEventListener('mouseup', mouseUpEvent);
						}
					}}
					on:mouseover={() => {
						if (selecting && $selectedCounterfactuals) {
							if (selectingToValue) $selectedCounterfactuals.push(localCounterfactuals[i].id);
							else {
								$selectedCounterfactuals = $selectedCounterfactuals.filter(
									(s) => s !== localCounterfactuals[i].id
								);		
								if ($shadowPatient === localCounterfactuals[i].id) {
									$shadowPatient = -1;
								}
							}
							$selectedCounterfactuals = $selectedCounterfactuals;
						}
					}}
				/>
			{/each}
		</div>
		<div class="h-12 flex-initial mx-6 mt-3 grid grid-cols-3 items-stretch text-center text-[0.8rem]">
			<Tooltip
				placement="left"
				text="This color indicates that the counterfactual has a lower value than the patient value of a given feature, which is indicated by the column of the hovered box."
			>
				<div
					class="flex h-full w-full items-center rounded-l-md p-1 text-white"
					style={`background-color: ${minColor};`}
				>
					CF value Less than Patient
				</div>
			</Tooltip>
			<Tooltip
				placement="left"
				text="This color indicates that the counterfactual has a lower value than the patient value of a given feature, which is indicated by the column of the hovered box."
			>
				<div class="flex h-full w-full items-center p-1" style={`background-color: ${medColor};`}>
					CF value Same as Patient
				</div>
			</Tooltip>
			<Tooltip
				placement="left"
				text="This color indicates that the counterfactual has a lower value than the patient value of a given feature, which is indicated by the column of the hovered box."
			>
				<div
					class="flex h-full w-full items-center rounded-r-md p-1 text-white"
					style={`background-color: ${maxColor};`}
				>
					CF value Greater than Patient
				</div>
			</Tooltip>
		</div>
		<div class='h-4 my-2 p-0 flex-initial grow-0 basis-auto'>
			<Tooltip placement="left" text="Patient compared to the average of selected counterfactuals">
				<h3 class="mt-1 font-semibold">Counterfactual Summary:</h3>
			</Tooltip>
		</div>
		<div class="w-full flex-auto basis-auto grow-1 min-h-64">
			<DivergingBarPlot
				{colorScale}
				counterfactuals={localCounterfactuals}
			/>
		</div>
	{/if}
</div>

<style>
	.descText{
        font-size: 0.9rem;
    }
</style>
