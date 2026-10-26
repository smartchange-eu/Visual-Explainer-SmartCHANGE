import testPatientData from '$lib/data/test_patient.json';

// This is used for the main route - uses test_patient from JSON file instead of fetching from backend
export async function load() {
	// Load test_patient data from JSON file
	const processedPatient = testPatientData;
	
	return { processedPatient };
}