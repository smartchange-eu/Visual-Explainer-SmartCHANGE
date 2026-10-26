<div class="flex flex-initial flex-col gap-2 my-1">
  <div class="flex items-center">
      <div class="w-1/4 text-center">
          <div class="bgBlue">Target Age</div>
      </div>
      <div class="flex-1 text-left descText">Drag to select 26 &le; target age &le; 65 for counterfactuals </div>
  </div>
  <div class="flex items-center">
      <div class="w-1/4">
          <div class="arrow-up"></div>
      </div>
      <div class="flex-1 text-left descText">Drag to select analyzed age</div>
  </div>
  <div class="flex items-center">
    <div class="w-1/4 text-center">
        Delete
    </div>
    <div class="flex-1 text-left descText">Right click on the circle to remove the age</div>
</div>
</div>
<div class="flex flex-initial items-center mt-0 justify-between h-12">
    <div class="w-24 flex-initial text-center">Ages</div>
    <div class="flex-1 text-center flex gap-2 items-center justify-end">
        {#if alertMessage}
        <div role="alert" class="alert text-base p-1 max-w-72">
            <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-info h-6 w-6 shrink-0">
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{alertMessage}</span>
            <div>
                <button 
                    class="btn btn-circle btn-sm"
                    on:click={removeAlert}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    </button>
            </div>
        </div>
        {/if}
        <input
        type="number"
        placeholder="Add Age"
        class="input input-bordered input-sm w-28 max-w-xs"
        on:focus={()=>alertMessage=''}
        bind:value={newAge}
        />
        <button class="btn btn-circle btn-sm" on:click={addAge}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#418AC8" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M11.25 12.75V18H12.75V12.75H18V11.25H12.75V6H11.25V11.25H6V12.75H11.25Z" fill="#418AC8" stroke-width="1" stroke="#418AC8"/>
                </svg>
        </button>
    </div>
</div>
<div class="flex flex-initial items-center" bind:clientWidth={width}>
    <svg
      bind:this={svgEl}
      width={width}
      height={height}
      on:mousemove={onDrag}
      on:mouseup={onDragEnd}
      on:contextmenu|preventDefault
      style="user-select: none;"
    >
        <line x1={points[0].x} y1={lineY} x2={points[points.length - 1].x} y2={lineY} stroke="black" />
        <!-- Circles -->
        {#each points as point}
        <g 
          transform={`translate(${point.x}, ${lineY})`}
          on:contextmenu={(e) => onCircleContextMenu(e, point)}>
            <circle
            cx="0"
            cy="0"
            r="14"
            fill="black"
            />
            <text x="0" y="0" fill="white" text-anchor="middle" font-size="1.2rem" alignment-baseline="central">{point.age}</text>
        </g>
        {/each}
        <!-- top Tooltip for target age -->
        <g
            on:mousedown={() => onDragStart('top')}
            style="cursor: pointer;"
            transform={`translate(${topTooltip.x}, ${margin.top})`}
        >
            <rect x="-40" y="-22" width="80" height="26" rx="4" ry="4" fill="#418AC8" />
            <text x="0" y="-4" fill="white" text-anchor="middle" font-size="1.15rem" >Target Age</text>
            <polygon points="-5,4 5,4 0,14" fill="#418AC8" />
        </g>
    
        <!-- bottom tooltip for analyzed age -->
        <polygon
            points={`${bottomTooltip.x - 10},${height-margin.bottom+4} ${bottomTooltip.x + 10},${height-margin.bottom+4} ${bottomTooltip.x},${height-margin.bottom-14}`}
            fill="#418AC8"
            on:mousedown={() => onDragStart('bottom')}
            style="cursor: pointer;"
        />
		<!-- visual brace showing affected data below -->
		<path
			d={`M ${margin.left/2-12}, ${y0}
				q 0,-${braceHeight} 12,-${braceHeight}
				l ${braceWidth},0
				q 12,0 12,${braceHeight}
				q 0,${braceHeight} -12,${braceHeight}
				l -${braceWidth},0
				q -12,0 -12,-${braceHeight}`}
			fill="none"
			stroke="#418AC8"
			stroke-width="3"
		/>
    </svg>
</div>


{#if menuOpen}
    <div
        style="position: fixed; top: {menuY}px; left: {menuX}px; background: white; border: 1px solid #ccc; z-index: 1000;"
        on:click|stopPropagation
        on:contextmenu|preventDefault
    >
        <div style="padding: 8px; cursor: pointer;" on:click={deleteAge}>Delete</div>
        <div style="padding: 8px; cursor: pointer;" on:click={closeMenu}>Cancel</div>
    </div>
    <div
        style="position: fixed; inset: 0; z-index: 999;"
        on:click={closeMenu}
    />
{/if}


<script lang='ts'>
    import {targetAge,analyzeAge,forecastAges,allAges} from '$lib/store';
    import {scaleLinear} from 'd3'
    
    let width: number = 400;

    let height = 100;
    let margin ={'left': 50, 'right':50, 'top': 24, 'bottom':15}
    $: lineY = margin.top + (height - margin.top - margin.bottom)/2

    $: xScale = scaleLinear().domain([$allAges[0], $allAges[$allAges.length - 1]]).range([margin.left, width - margin.right])
  
    $: points = $allAges.map(v => {
        return { age: v, x: xScale(v) };
    })
  
    let topTooltip: { x: number; dragging: boolean };
    $: {
        const targetPoint = points.find(p => p.age === $targetAge);
        topTooltip = {
            x: targetPoint ? targetPoint.x : 0,
            dragging: false
        };
    }
    let bottomTooltip: { x: number; dragging: boolean };
    $:{
        const targetPoint = points.find(p=>p.age == $analyzeAge);
        bottomTooltip = {
            x: targetPoint? targetPoint.x: 0,
            dragging: false
        }
    }

    let svgEl: SVGSVGElement;
    $: braceWidth = width-margin.left/2-margin.right/2;
    const braceHeight = 10;
    $: y0 = height - margin.bottom + 15;
  
    // Context menu state
    let menuOpen = false;
    let menuX = 0;
    let menuY = 0;

    let alertMessage = '';
    let newAge: number | null = null;
    let selectedAge: number | null = null;
  
    function onDragStart(which:string) {
        if (which === 'top') topTooltip.dragging = true;
        if (which === 'bottom') bottomTooltip.dragging = true;
    }
  
    const MIN_TARGET_AGE = 25;
    $: minTargetAge = $allAges.find(age => age > MIN_TARGET_AGE) ?? $allAges[$allAges.length - 1];
    $: minTopTooltipX = xScale ? xScale(minTargetAge) : width - margin.right;

    function onDrag(e: MouseEvent) {
        const bounds = svgEl.getBoundingClientRect();
        const x = e.clientX - bounds.left;

        if (topTooltip.dragging) {
            const minX = minTopTooltipX ?? margin.left;
            topTooltip.x = Math.max(minX, x);
        }
        if (bottomTooltip.dragging) {
            bottomTooltip.x = x;
        }
    }

    function snapToClosest(tooltip: {x: number; dragging: boolean}) {
        const closest = points.reduce((prev, curr) =>
            Math.abs(curr.x - tooltip.x) < Math.abs(prev.x - tooltip.x) ? curr : prev
        );
        tooltip.x = closest.x;
        return closest.age;
    }
  
    function onDragEnd() {
        if (topTooltip.dragging) {
            topTooltip.dragging = false;
            targetAge.set(snapToClosest(topTooltip));
        }
        if (bottomTooltip.dragging) {
            bottomTooltip.dragging = false;
            analyzeAge.set(snapToClosest(bottomTooltip));
        }
    }

    function onCircleContextMenu(event: MouseEvent, point: {age:number, x:number}) {
        event.preventDefault();
        menuOpen = true;
        menuX = event.clientX;
        menuY = event.clientY;
        selectedAge = point.age;
    }

    function addAge(){
        if(newAge==null) return;
        const ageToAdd = newAge;
        let ages = $forecastAges
        if(ages.includes(ageToAdd)){
            alertMessage = 'New age already exist.';
        }else if(ageToAdd<ages[0] || ageToAdd>65){
            alertMessage = `Added age should be between ${ages[0]} and 65`;
        }else{
            let index = ages.findIndex((age,i)=>age<ageToAdd && ((i<ages.length-1&&ages[i+1]>ageToAdd) || i===ages.length-1));
            ages.splice(index+1,0,ageToAdd)
            forecastAges.set(ages);
        }
        newAge = null
        return;
    }

    function deleteAge() {
        if (selectedAge !== null) {
            const remainingAges = $forecastAges.filter(a => a !== selectedAge)
            // Check if the deleted age is the target age or analyze age
            if (selectedAge === $targetAge) {
                // Reset target age to the first available age
                if (remainingAges.length > 0) {
                    targetAge.set(remainingAges[remainingAges.length-1]);
                }
            }
            
            if (selectedAge === $analyzeAge) {
                // Reset analyze age to the first available age
                if (remainingAges.length > 0) {
                    analyzeAge.set(remainingAges[remainingAges.length-1]);
                }
            }
            
            forecastAges.set(remainingAges);
            menuOpen = false;
            selectedAge = null;
        }
    }

    function closeMenu() {
        menuOpen = false;
        selectedAge = null;
    }

    function removeAlert(){
        alertMessage = ''
    }
</script>

<style lang="less">
    .descText{
        font-size: 0.9rem;
        color: #767474;
    }

    .bgBlue{
        font-size: 1.15rem;
        text-align: center;
        background: #418AC8;
        color: #fff;
        border-radius: 6px;
        width: 100px;
        margin: 0 auto;
    }

    .arrow-up {
        margin: 0 auto;
        width: 0;
        height: 0;
        border-left: 13px solid transparent;
        border-right: 13px solid transparent;
        border-bottom: 22px solid #418AC8;
    }

    .addImg{
        width:26px;
        margin: 0 auto;
    }
</style>