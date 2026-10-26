<script lang="ts">
	import { onMount } from 'svelte';
	import { targetAge, targetModel, targetRisk, nCF, forecastAges, initialPatientData} from '$lib/store';
	import { goto } from '$app/navigation';
    import { get } from 'svelte/store';

	export let data;

	onMount(async () => {
		// Set the processed patient data in the store
		if (data.processedPatient) {
			// Set initialPatientData on the client side
			initialPatientData.set(data.processedPatient);
		
			// Redirect to dashboard with the patient data
			const urlQuery = new URLSearchParams();
            urlQuery.set('target_age', $targetAge.toString());
            urlQuery.set('target_model', $targetModel.toString());
            urlQuery.set('target_risk', $targetRisk.toString());
            urlQuery.set('n_cf', $nCF.toString());
            urlQuery.set('forecast_ages', $forecastAges.join(','));
			
			goto(`dashboard?${urlQuery.toString()}`);
		}
	});
</script>

{#if data.processedPatient}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-center">
			<h2 class="text-xl font-semibold mb-4">Loading Patient Data...</h2>
			<p class="text-gray-600">Redirecting to dashboard...</p>
		</div>
	</div>
{:else}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-center">
			<h2 class="text-xl font-semibold mb-4">Error Loading Patient Data</h2>
			<p class="text-red-600">Please try again.</p>
		</div>
	</div>
{/if}
