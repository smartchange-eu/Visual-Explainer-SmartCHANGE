<div class="panel flex-initial">
    <div class="panelHeader">Basic Setting</div>
    <div class="panelBody flex flex-col">
        <div class="panelRow">
            <label for="model">Risk Model</label>
            <select id="model" bind:value={$targetModel}>
                <option value="score2">Score2</option>
                <option value="hhs">HHS</option>
                <option value="t2p">T2P</option>
            </select>
        </div>
        <div class="panelRow">
            <label for="target-risk">Target Risk</label>
            <div class="slider-wrapper">
                <span class="min-value">0</span>
                <div class="w-full relative" >
                  <input type="range" min="0" max={maxRisk} step="0.001" bind:value={tempSliderValue} bind:this={slider} on:input={handleInput} on:change={handleChange}/>
                  <div
                      bind:this={tooltip} class="range-value"
                  > 
                  {tempSliderValue}
                  </div>
                  <div class="fixed-tooltip" bind:this={fixedTooltip}>
                    Patient Risk: {Number($patientRisk).toFixed(3)}
                    {#if $whatIfRisk !== undefined}
                      -> <span class="text-orange-500"> {Number($whatIfRisk).toFixed(3)}</span>    
                    {/if}
                  </div>
                </div>
                <span class="max-value">{maxRisk}</span>
            </div>
        </div>
        <div class="panelRow">
            <label for="counterfactuals">Number of <br/> Counterfactuals</label>
            <input type="number" id="counterfactuals" bind:value={tempNCF} on:change={handleNCFChange} />
        </div>
    </div>
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { targetModel, targetRisk, nCF, patientRisk, whatIfRisk } from '$lib/store';

  let slider: HTMLInputElement;
  let tooltip: HTMLDivElement;
  let fixedTooltip: HTMLDivElement;
  let tempNCF = $nCF;
  let maxRisk = 0.5;

  // Keep tempSliderValue in sync with the store value
  $: tempSliderValue = $targetRisk;
  
  // Keep tempNCF in sync with the store value
  $: tempNCF = $nCF;

  $: if(fixedTooltip){
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    // fixedValue is also between 0 and maxRisk
    const fixedValuePercent = ($patientRisk - min) * 100 / (max-min); // from 0 to maxRisk*100
    // adjust pixel offset
    const fixedPositionOffset = 8 - (fixedValuePercent * 0.15);
    fixedTooltip.style.left = `calc(${fixedValuePercent}% + ${fixedPositionOffset}px)`;
  }

  const updateTooltip = () => {
    if (!slider || !tooltip) return;

    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const newValue = (tempSliderValue - min) * 100 / (max - min);

    // Get exact position of the thumb on the track
    const newPosition = 8 - (newValue * 0.15);

    tooltip.style.left = `calc(${newValue}% + (${newPosition}px))`;
  };

  const handleInput = (event: Event) => {
    // Update tooltip position during dragging, but don't update the store value
    updateTooltip();
  };

  const handleChange = (event: Event) => {
    // Update the store value only when dragging stops
    $targetRisk = tempSliderValue;
  };

  const handleNCFChange = () => {
    // Update the store value only when input changes (on blur or Enter)
    $nCF = tempNCF;
  };

  onMount(() => {
    updateTooltip();
  });

</script>

<style lang="less">

.panelRow{
    display: flex;
    justify-content: space-between;
    padding: 4px 20px;
    align-items: center;
}

/* Dropdown styling */
select {
  padding: 4px 8px;
  border: 1px solid #707070;
  width: 75%;
  height: 40px;
  text-align: center;
  color: #707070
}


/* Slider wrapper for label and tooltip */
.slider-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 75%;
  height: 80px;
}

.min-value, .max-value {
	color: #6c6d70;
  text-align: center;
  width: 1.5rem;
}

.fixed-tooltip {
  position: absolute;
  display: inline-table;
  min-width: 140px;
  top: 135%; /* below the slider */
  height: 1.4rem;
  line-height: 1.4rem;
  text-align: center;
  background: black; /* different color for clarity */
  color: #fff;
  border-radius: 6px;
  transform: translateX(-50%);
  pointer-events: none;
  padding: 0 5px;
}

/* Arrow below fixed tooltip */
.fixed-tooltip::before {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border-bottom: 10px solid black;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
}


/* Number input */
input[type="number"] {
  border-radius: 4px;
  padding: 4px 8px;
  border: 1px solid #707070;
  width: 75%;
  height: 40px;
  text-align: center;
  color: #707070
}
</style>