<script lang="ts">
    import { loading,initialPatientData, counterfactuals,patientInfoWithForcasts, targetAge, targetModel, targetRisk, nCF, forecastAges,selectedCounterfactuals,patientInfo } from '$lib/store';
	import { goto } from '$app/navigation';
    import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
    import SetParams from '$lib/SetParams.svelte';
    import PatientInfo from '$lib/PatientInfo.svelte';
    import CounterfactualOverview from '$lib/CounterfactualOverview.svelte'
    import ForcastFlow from '$lib/ForcastFlow.svelte'
    import { processCounterfactualDashboardData } from '$lib/utils/processPatientData';
    import { authFetch } from '$lib/utils/sessionAuth';

    let previousParams = '';
    let isInitialized = false;
    let dashboardData: any = {};
    let dataWarning: string | null = null;

    const MODEL_MIN_AGE = 45;
    const MODEL_MAX_AGE = 65;
    const VALID_COUNTRIES = ['FIN', 'SLO', 'PRT', 'NLD'];

    // Fetch counterfactuals from API using patient data from store
    async function fetchCounterfactuals() {
        if (Object.keys($initialPatientData).length === 0) {
            console.warn('No patient data available in store');
            $loading = false;
            return;
        }

        const patientAge = $initialPatientData['Age_input'];
        if (patientAge !== undefined && patientAge >= MODEL_MAX_AGE) {
            dataWarning = `Patient age (${patientAge}) is outside the supported range for risk prediction (${MODEL_MIN_AGE}–${MODEL_MAX_AGE}). The model cannot compute counterfactuals for patients aged ${MODEL_MAX_AGE} or older.`;
            $loading = false;
            return;
        }

        const country = $initialPatientData['country'];
        if (!country || !VALID_COUNTRIES.includes(country)) {
            dataWarning = `Patient country "${country ?? 'unknown'}" is missing or not supported. The risk model requires one of: ${VALID_COUNTRIES.join(', ')}.`;
            $loading = false;
            return;
        }

        // Ensure forecast ages are above the patient's current age and within model range
        let validForecastAges = $forecastAges.filter((a: number) => a > patientAge && a <= MODEL_MAX_AGE);
        if (validForecastAges.length === 0) {
            const start = Math.max(Math.ceil(patientAge) + 1, MODEL_MIN_AGE + 1);
            validForecastAges = [start, start + 5, start + 10, MODEL_MAX_AGE].filter((a: number) => a > patientAge && a <= MODEL_MAX_AGE);
        }
        if (validForecastAges.length === 0) {
            dataWarning = `Cannot generate forecast ages for patient age ${patientAge} within the supported range (${MODEL_MIN_AGE}–${MODEL_MAX_AGE}).`;
            $loading = false;
            return;
        }

        const params = {
            target_age: Math.min($targetAge, MODEL_MAX_AGE),
            target_model: $targetModel,
            target_risk: $targetRisk,
            n_cf: $nCF,
            forecast_ages: validForecastAges
        };

        try {
            $loading = true;
            const resPatient = await authFetch(`${base}/backend/counterfactuals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: "tue_cf",
                    patient: $initialPatientData,
                    params: params
                })
            });

            if (!resPatient.ok) {
                throw new Error(`Failed to fetch counterfactuals: ${resPatient.statusText}`);
            }

            dashboardData = await resPatient.json();
            
            const processed = processCounterfactualDashboardData(dashboardData || {});
            $patientInfo = processed.patient;
            $patientInfo['Sex'] = $initialPatientData['Sex']; // somehow this feature is missing in the returned data
            $patientInfoWithForcasts = processed.forecasts;
            $counterfactuals = processed.counterfactuals;
            $loading = false;
        } catch (e) {
            console.error('Failed to fetch counterfactuals:', e);
            $loading = false;
        }
    }

    function updateURL() {
        const urlQuery = new URLSearchParams();
        urlQuery.set('target_age', $targetAge.toString());
        urlQuery.set('target_model', $targetModel.toString());
        urlQuery.set('target_risk', $targetRisk.toString());
        urlQuery.set('n_cf', $nCF.toString());
        urlQuery.set('forecast_ages', $forecastAges.join(','));

        const newParams = urlQuery.toString();
        
        // Only update if the parameters have actually changed and we're initialized
        if (newParams !== previousParams && isInitialized) {
            previousParams = newParams;
            
            // Update URL and fetch new data
            $selectedCounterfactuals = [];
            goto(`dashboard?${newParams}`, { replaceState: true });
            fetchCounterfactuals();
        }
    }

    // Watch for changes in all the relevant store values
    $: {
        $targetAge;
        $targetModel;
        $targetRisk;
        $nCF;
        $forecastAges;
        if (isInitialized) {
            updateURL();
        }
    }

    onMount(() => {
        // Update forecastAges from URL parameters if present and different from current store value
        const forecastAgesParam = $page.url.searchParams.get('forecast_ages');
        if (forecastAgesParam) {
            const currentAgesString = $forecastAges.join(',');
            
            // Only update if the strings are different
            if (forecastAgesParam !== currentAgesString) {
                const ages = forecastAgesParam.split(',').map(age => parseInt(age)).filter(age => !isNaN(age));
                if (ages.length > 0) {
                    forecastAges.set(ages);
                }
            }
        }
        
        // Initialize the previous params on mount
        previousParams = $page.url.searchParams.toString();
        isInitialized = true;
        
        // Fetch initial data if patient data is available
        if (Object.keys($initialPatientData).length > 0) {
            fetchCounterfactuals();
        } else {
            // Set loading to false if no patient data is available yet
            $loading = false;
            // Watch for initialPatientData to be populated
            const unsubscribe = initialPatientData.subscribe((patientData) => {
                if (Object.keys(patientData).length > 0 && isInitialized) {
                    fetchCounterfactuals();
                    unsubscribe(); // Only fetch once when data becomes available
                }
            });
        }
    });
</script>

{#if dataWarning}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-lg mx-4">
            <h2 class="text-xl font-semibold text-red-700 mb-4">Unable to Compute Predictions</h2>
            <p class="text-gray-700">{dataWarning}</p>
        </div>
    </div>
{/if}

{#if $loading}
	<div class="loader pointer-events-none flex items-center justify-center">
		<Icon icon="eos-icons:loading" class="loader-icon" width="5rem"></Icon>
	</div>
{:else}
    <div class="min-w-[400px] w-1/4 flex flex-col">
        <SetParams/>
        <PatientInfo/>
    </div>
    <div class="w-1/3 flex-auto flex flex-col">
        <CounterfactualOverview/>
    </div>
    <div class=" flex-auto flex flex-col">
        <ForcastFlow/>
    </div>
{/if}
