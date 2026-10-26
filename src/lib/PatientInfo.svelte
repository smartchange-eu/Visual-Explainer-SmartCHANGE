<div class="panel flex-1 min-h-0 flex flex-col">
    <div class="panelHeader">Patient Info</div>
    <div class="panelBody flex-1 min-h-0 overflow-y-auto" style="padding: 0;">
        {#each $featureGroups as [featureType, features],i}
            <div class="collapse collapse-arrow p-0 rounded-none">
                <input type="checkbox" checked/>
                <div class="collapse-title bg-[#888888] text-white" >{featureType}</div>
                <div class="collapse-content" style="padding: 0;">
                    {#each features || [] as feature}
                        <div class={`flex p-2 border-y-[1.5px] border-gray-300 items-center text-center align-baseline ${feature.ifImpute?'bg-[#E6F2FA]':'bg-[#ffffff]'}`}>
                            <div class="w-14 flex-none">
                                <div class="align-text-top">
                                    {#if feature.fixed}
                                        <button type="button" aria-label="Unlock feature" class="p-0 m-0" on:click={() => toggleFixed(feature.name)}>
                                            <Icon icon="fa6-solid:lock" class="fill-current" style="color: #909090; font-size: 25px;" />
                                        </button>
                                    {:else}
                                        <button type="button" aria-label="Lock feature" class="p-0 m-0" on:click={() => toggleFixed(feature.name)}>
                                            <Icon icon="fa6-solid:unlock" class="fill-current" style="font-size: 25px"/>
                                        </button>
                                    {/if}
                                </div>
                            </div>
                            <div class="w-1/4">{feature.replace}</div>
                            <div class="flex-1 relative flex items-center gap-2 justify-center">
                                {#if getDataType(feature.name) === 'numerical' && isNumber($patientInfo[feature.name]) && whatIfPatient!==undefined}
                                    <div class="flex items-center gap-2 w-full pl-4 pr-8 justify-center">
                                        <span class="text-xs text-gray-500 w-[20px]">{processFeatureValue(getSliderMin(feature.name))}</span>
                                        <div class="relative flex flex-col justify-center gap-0" style={`width: ${sliderWidth}px;`}>
                                            <Tooltip
                                                placement="top"
                                                text = {`${processFeatureValue($patientInfo[feature.name])}`}
                                                className = {'relative'}
                                                wrapperStyle = {`left: ${getIndicatorPos(feature.name, $patientInfo[feature.name])}px; transform:translate(-50%)`}
                                                >
                                                <div class="relative z-10" >                                           
                                                <div class="mx-auto w-0 h-0 border-l-transparent border-r-transparent border-t-gray-800" style="border-left-width: 7px; border-right-width: 7px; border-top-width: 10px;"></div>
                                                </div>
                                            </Tooltip>
                                            <input
                                                type="range"
                                                min={getSliderMin(feature.name)}
                                                max={getSliderMax(feature.name)}
                                                step={getSliderStep(feature.name)}
                                                value={whatIfPatient[feature.name]}
                                                on:pointerdown={(e) => {startDrag(feature.name, e)}}
                                                on:input={(e)=>onDrag(feature.name, e)}
                                                on:pointerup={(e)=>endDrag(feature.name, e)}
                                                on:pointercancel={(e)=>endDrag(feature.name, e)}
                                                class="bar-range"
                                                style={`--bar-color: ${proposedValues[feature.name] !== undefined ? 'oklch(64.6% 0.222 41.116)' : '#000000'}; --bar-percent: ${thumbPercentBy(feature.name, whatIfPatient[feature.name])}%;`}
                                            />
                                            {#if activeSlider === feature.name}
                                                <div class="absolute -top-3 z-20 translate-x-[-50%]" style={`left: ${getIndicatorPos(feature.name, tmpSliderValue)}px;`}>
                                                    <div class="px-1 py-[2px] text-[10px] leading-none rounded bg-gray-800 text-white whitespace-nowrap">
                                                        {processFeatureValue(tmpSliderValue)}
                                                    </div>
                                                </div>
                                            {/if}

                                        </div>
                                        <span class="text-xs text-gray-500 w-[20px]">{processFeatureValue(getSliderMax(feature.name))}</span>
                                    </div>
                                {:else}
                                    <span>
                                        {#if isNumber($patientInfo[feature.name]) && proposedValues[feature.name] !== undefined}
                                            {processFeatureValue($patientInfo[feature.name])} -> <span class="text-orange-600">{processFeatureValue(proposedValues[feature.name])}</span>
                                        {:else}
                                            {processFeatureValue($patientInfo[feature.name])}
                                        {/if}
                                    </span>
                                {/if}

                                {#if proposedValues[feature.name] !== undefined}
                                        <button
                                        type="button"
                                        class="btn btn-xs p-0 h-6 w-6 min-h-0 border-2 border-neutral-950 rounded-full absolute right-1 top-1/2 -translate-y-1/2 z-20"
                                        aria-label="Reset value"
                                        title="Reset value"
                                            on:click={(e) => { resetProposed(feature.name); e.stopPropagation(); }}
                                    >
                                        <Icon icon="mdi:undo" style="font-size: 14px;"/>
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>

<script lang="ts">
    import {featureAttrs, initialPatientData, patientInfo, featureGroups, whatIfRisk, targetAge, targetModel, whatIfPatientWithForcasts, forecastAges, processFeatureValue} from '$lib/store';
    import Icon from '@iconify/svelte';
	import { isNumber, isEqual} from 'lodash-es';
    import Tooltip from './utils/Tooltip.svelte';
    import { processForecastRecords } from '$lib/utils/processPatientData';
    import { authFetch } from '$lib/utils/sessionAuth';
    
    let sliderWidth: number = 150; // legacy popover slider
    let proposedValues: Record<string, number> = {};
    let tmpSliderValue: number;
    let whatIfPatient: Record<string, any> | undefined = undefined;
    let activeSlider: string | null = null;

    $: if ($patientInfo) {
        const merged: Record<string, any> = { ...$patientInfo };
        for (const key in proposedValues) {
            if (proposedValues[key] !== undefined) merged[key] = proposedValues[key];
        }
        whatIfPatient = merged;
    }

    // Format whatIfPatient to match initialPatientData format
    function formatWhatIfPatientForAPI(whatIf: Record<string, any>): Record<string, any> {
        // Start with initialPatientData as the base structure
        const formatted: Record<string, any> = { ...$initialPatientData };
        
        // Overlay values from whatIfPatient
        for (const key in whatIf) {
            if (whatIf[key] !== undefined && whatIf[key] !== null) {
                // Convert Age to Age_input if it exists
                if (key === 'Age') {
                    formatted['Age_input'] = whatIf[key];
                } else {
                    formatted[key] = whatIf[key];
                }
            }
        }
        
        return formatted;
    }

    $: if (whatIfPatient) {
        if (Object.keys(proposedValues).length === 0) {
            $whatIfRisk = undefined;
            $whatIfPatientWithForcasts = [];
        } else {
            (async () => {
                try {
                    const params = {
                        target_age: $targetAge,
                        target_model: $targetModel,
                        forecast_ages: $forecastAges
                    }
                    
                    // Format whatIfPatient to match initialPatientData format
                    const formattedPatient = formatWhatIfPatientForAPI(whatIfPatient);
                    
                    const res = await authFetch(`backend/whatifrisk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            hook: "tue_whatif",
                            patient: formattedPatient, 
                            params: params})
                    });
                    const data = await res.json();

                    const processedWhatIfForecasting = processForecastRecords(
                        data.current,
                        data.whatif_forecasting
                    );
                    $whatIfPatientWithForcasts = processedWhatIfForecasting;
                    $whatIfRisk = processedWhatIfForecasting.find(
                                    d => d.Age === $targetAge
                                  ).Risk_level;
                } catch (e) {
                    console.error('Failed to fetch what-if risk', e);
                }
            })();
        }
    }

    function computeNiceStep(range: number){
        const safe = Math.max(1e-6, Math.abs(range));
        const magnitude = Math.pow(10, Math.floor(Math.log10(safe)));
        const step = magnitude / 100;
        return Number(step.toFixed(6));
    }


    // Inline slider helpers based on featureAttrs metadata
    function getAttr(name: string){
        const arr = $featureAttrs || [];
        return arr.find((f: any) => f.name === name);
    }

    function getDataType(name: string){
        return getAttr(name)?.dataType;
    }

    function getSliderMin(name: string){
        const r = getAttr(name)?.range;
        if (Array.isArray(r) && r.length === 2) return Number(r[0]);
        const v = ($patientInfo as any)?.[name];
        return isNumber(v) ? v - Math.abs(v || 1) : 0;
    }

    function getSliderMax(name: string){
        const r = getAttr(name)?.range;
        if (Array.isArray(r) && r.length === 2) return Number(r[1]);
        const v = ($patientInfo as any)?.[name];
        return isNumber(v) ? v + Math.abs(v || 1) : 100;
    }

    function getSliderStep(name: string){
        const min = getSliderMin(name);
        const max = getSliderMax(name);
        return computeNiceStep(max - min);
    }

    function getIndicatorPos(name: string, val: number){
        const perc = thumbPercentBy(name, val);
        return perc * 0.01 * (sliderWidth - 12) + 6

    }

    function onDrag(name: string, e:Event){
        tmpSliderValue = Number((e.target as HTMLInputElement).value);
    }

    function startDrag(name: string, e: Event){
        tmpSliderValue = Number((e.target as HTMLInputElement).value);
        activeSlider = name; 
    }

    // End dragging when pointer is released anywhere
    function endDrag(name: string, e: Event){
        activeSlider = null;
        const v = Number((e.target as HTMLInputElement).value);
        if(isEqual(v,$patientInfo[name])){
            const copy = { ...proposedValues };
            delete copy[name];
            proposedValues = copy;
        }else{
            proposedValues = { ...proposedValues, [name]: v };
        }
    }

    function thumbPercentBy(name: string, val: number){
        const min = getSliderMin(name);
        const max = getSliderMax(name);
        if (!isFinite(min) || !isFinite(max) || max === min) return 0;
        // Account for left/right padding and space taken by min/max labels around the slider track.
        // We approximate by constraining the triangle within [2%, 98%] of the track.
        const p = ((val - min) / (max - min)) * 100;
        return p;
    }

    function resetProposed(name: string){
        if (proposedValues[name] !== undefined){
            const copy = { ...proposedValues };
            delete copy[name];
            proposedValues = copy;
        }
    }

    function toggleFixed(featureName: string) {
        featureAttrs.update(features => {
            return features.map(feature => {
                if (feature.name === featureName) {
                    return { ...feature, fixed: !feature.fixed };
                }
                return feature;
            });
        });
    }

</script>

<style>
    /* Bar-style range input with dynamic color fill */
    .bar-range {
        -webkit-appearance: none;
        appearance: none;
        height: 10px;
        border-radius: 2px;
        border-color: #dddddd;
        border-width: 1px;
        background: linear-gradient(to right, var(--bar-color, #ffffff) var(--bar-percent, 0%), #ffffff var(--bar-percent, 0%));
        outline: none;
    }

    .bar-range::-webkit-slider-runnable-track {
        height: 10px;
        border-radius: 4px;
        background: transparent;

    }

    .bar-range::-moz-range-track {
        height: 10px;
        border-radius: 4px;
        background: transparent;
        background-color: #e5e7eb;
    }

    /* Keep a small thumb so the value can still be dragged */
    .bar-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ffffff;
        border: 1px solid #565656; /* gray-400 */
        margin-top: -1px; /* align with 10px track */
    }

    .bar-range::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ffffff;
        border: 1px solid #565656;
    }
</style>