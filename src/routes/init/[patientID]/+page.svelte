<script lang="ts">
	import { onMount } from 'svelte';
	import { targetAge, targetModel, targetRisk, nCF, forecastAges, initialPatientData} from '$lib/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { processApiResponseToPatient } from '$lib/utils/processPatientData';
	import { authFetch } from '$lib/utils/sessionAuth';

	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			const predictionId = $page.params.patientID;
			if (!predictionId) {
				error = 'Patient ID is required';
				loading = false;
				return;
			}

			const resPatient = await authFetch(`${base}/backend/features/${predictionId}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!resPatient.ok) {
				throw new Error(`Failed to fetch patient data: ${resPatient.statusText}`);
			}

			const patientData = await resPatient.json();
			const { patient: processedPatient, model } = processApiResponseToPatient(patientData);

			initialPatientData.set(processedPatient);
			if (model) targetModel.set(model as 'score2' | 'hhs' | 't2p');

			const urlQuery = new URLSearchParams();
			urlQuery.set('target_age', $targetAge.toString());
			urlQuery.set('target_model', $targetModel.toString());
			urlQuery.set('target_risk', $targetRisk.toString());
			urlQuery.set('n_cf', $nCF.toString());
			urlQuery.set('forecast_ages', $forecastAges.join(','));

			goto(`${base}/dashboard?${urlQuery.toString()}`);
		} catch (e) {
			console.error('Error fetching patient data:', e);
			error = (e instanceof Error) ? e.message : 'Failed to load patient data';
			loading = false;
		}
	});
</script>

{#if error}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-center">
			<h2 class="text-xl font-semibold mb-4">Error Loading Patient Data</h2>
			<p class="text-red-600">{error}</p>
		</div>
	</div>
{:else if loading}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-center">
			<h2 class="text-xl font-semibold mb-4">Loading Patient Data...</h2>
			<p class="text-gray-600">Redirecting to dashboard...</p>
		</div>
	</div>
{/if}

