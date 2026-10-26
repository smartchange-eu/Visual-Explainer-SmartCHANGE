<div class="panel flex-1 min-h-0 flex flex-col">
    <div class="panelHeader flex-initial">Forecasted Features</div>
    <div class="panelBody flex-1 flex flex-col min-h-0" style="padding: 0;">
            <div class="feature-row" style='height:100px;'>
                <div class="feature-name">Age</div>
                <div class="chart-container" bind:clientWidth={chartWidth} >
                    <svg
                        width={svgWidth}
                        height={100}
                        style="user-select: none;"
                    >
                      <line x1={points[0].x} y1={100/2} x2={points[points.length - 1].x} y2={100/2} stroke="black" />
                      <!-- Circles -->
                      {#each points as point}
                      <g transform={`translate(${point.x}, ${100/2})`}>
                          <circle
                          cx="0"
                          cy="0"
                          r="14"
                          fill="black"
                          />
                          <text x="0" y="0" fill="white" text-anchor="middle" alignment-baseline="central" font-size="1.2rem">{point.age}</text>
                      </g>
                      {/each}
                    </svg>
                </div>
            </div>
            <FeatureRow featureData={featureDataMap.get('Risk_level')} chartWidth={svgWidth} chartHeight={chartHeight} xScale={xScale} margin={margin}/>
            <hr class=" border-b-2 border-[#888888]"/>
            <div class="feature-row-collapse flex-1 overflow-y-auto" bind:this={scrollContainer}>
                {#each featureTypes as [featureType, features]}
                <div class="collapse collapse-arrow p-0 rounded-none">
                    <input type="checkbox" checked>
                    <div class="collapse-title bg-[#888888] text-white">{featureType}</div>
                    <div class="collapse-content" style="padding: 0;">
                        {#each features || [] as feature}
                            <div bind:this={featureElements[feature.name]} class="feature-row-wrapper border-y-[1.5px] border-gray-300">
                                <FeatureRow featureData={featureDataMap.get(feature.name)} chartWidth={svgWidth} chartHeight={chartHeight} xScale={xScale} margin={margin} featureAttr={$featureAttrs.find(d=>d.name===feature.name)}/>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
            </div>
    </div>
</div>

<script lang="ts">
import {allAges,counterfactuals,patientInfoWithForcasts,featureShown,focusFeature,whatIfPatientWithForcasts,featureAttrs} from '$lib/store';
import {scaleLinear} from 'd3'
import FeatureRow from '$lib/components/forecastflow/FeatureRow.svelte'

let chartWidth = 0;
let chartHeight = 120;
let margin = {'left': 50, 'right':50, 'top': 10, 'bottom':10}
let scrollContainer: HTMLElement;
let featureElements: Record<string, HTMLElement> = {};

// chartWidth - 20 is the width of the svg chart for accommodating the scrollbar
$: svgWidth = chartWidth - 30 > 0 ? chartWidth - 30 : 0;
$: xScale = scaleLinear().domain([$allAges[0], $allAges[$allAges.length - 1]]).range([margin.left, svgWidth - margin.right])
  
$: points = $allAges.map(v => { 
    return { age: v, x: xScale(v) };
})

$: featureTypes = Object.entries(Object.groupBy($featureShown, (item) => item.type)).sort((a,b) => a[0].localeCompare(b[0]));

// Auto-scroll to focused feature
$: if ($focusFeature && $focusFeature !== '' && scrollContainer && featureElements[$focusFeature]) {
    const targetElement = featureElements[$focusFeature];
    if (targetElement) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
            targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        }, 100);
    }
}

// Create reactive feature data that updates when stores change
$: featureDataMap = (() => {
    const map = new Map();
    
    // Handle empty arrays gracefully
    if ($counterfactuals.length === 0 || $patientInfoWithForcasts.length === 0) {
        // Set default empty data for all features
        $featureShown.forEach(feature => {
            map.set(feature.name, {
                'name': feature.replace,
                'patientValues': [],
                'whatIfValues': [],
                'counterfactualValues': $allAges.map(age => ({
                    age: age,
                    value: []
                })),
            });
        });
        
        // Also set Risk_level if it's not in featureShown
        map.set('Risk_level', {
            'name': 'Risk', 
            'patientValues': [],
            'whatIfValues': [],
            'counterfactualValues': $allAges.map(age => ({
                age: age,
                value: []
            })),
        });
    } else {
        // Process each feature when data is available
        $featureShown.forEach(feature => {
            let counterfactualValues: any = []
            $allAges.forEach(age => {
                let counterfactualsWithCertainAge = $counterfactuals.map((v: Array<any>) => v.find(d => d.Age === age))
                counterfactualValues.push({
                    age: age,
                    value: counterfactualsWithCertainAge.map(d => d?.[feature.name]).filter(d => d !== undefined)
                })
            })

            map.set(feature.name, {
                'name': feature.replace,
                'patientValues': $patientInfoWithForcasts.reduce((acc: any, cur: any)=>{
                    if(cur && feature.name in cur){
                        acc.push(
                            {
                                age: cur.Age,
                                value: cur[feature.name]
                            }
                        )
                    }
                    return acc
                },[]),
                'whatIfValues': $whatIfPatientWithForcasts.length > 0 ? $whatIfPatientWithForcasts.reduce((acc: any, cur: any)=>{
                    if(cur && feature.name in cur){
                        acc.push(
                            {
                                age: cur.Age,
                                value: cur[feature.name]
                            }
                        )
                    }
                    return acc
                },[]): [],
                'counterfactualValues': counterfactualValues,
            });
        });
        
        // Also set Risk_level if it's not in featureShown
        let riskLevelCounterfactualValues: any = []
        $allAges.forEach(age => {
            let counterfactualsWithCertainAge = $counterfactuals.map((v: Array<any>) => v.find(d => d.Age === age))
            riskLevelCounterfactualValues.push({
                age: age,
                value: counterfactualsWithCertainAge.map(d => d?.Risk_level).filter(d => d !== undefined)
            })
        })

        map.set('Risk_level', {
            'name': 'Risk',
            'patientValues': $patientInfoWithForcasts.reduce((acc: any, cur: any)=>{
                if(cur && 'Risk_level' in cur){
                    acc.push(
                        {
                            age: cur.Age,
                            value: cur.Risk_level
                        }
                    )
                }
                return acc
            },[]),
            'whatIfValues': $whatIfPatientWithForcasts.length > 0 ? $whatIfPatientWithForcasts.reduce((acc: any, cur: any)=>{
                if(cur && 'Risk_level' in cur){
                    acc.push(
                        {
                            age: cur.Age,
                            value: cur.Risk_level
                        }
                    )
                }
                return acc
            },[]): [],
            'counterfactualValues': riskLevelCounterfactualValues,
        });
    }
    return map;
})();

</script>   

<style>
    .feature-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding: 5px;
        margin: 5px;
        margin-bottom: 0;
        height:80px;
    }

    .feature-name {
        width: 150px;
        text-align: center;
    }
    .chart-container {
        flex: 1;
    }
    
    .feature-row-wrapper {
        scroll-margin-top: 20px;
        scroll-margin-bottom: 20px;
    }
</style>