// Function to process API response to match test_patient format
type PatientRecord = Record<string, string | number | boolean | null>;

const REQUIRED_FEATURES = [
	'Age',
	'Alcohol',
	'BMI',
	'Diastolic_blood_pressure',
	'Diet_HHS',
	'Diet_T2P',
	'Fitness_speed',
	'Glucose',
	'HDL',
	'Height',
	'LDL',
	'PA_h_per_w',
	'Resting_heart_rate',
	'Sleep',
	'Smoking',
	'Systolic_blood_pressure',
	'Total_cholesterol',
	'Triglycerides',
	'Waist_circumference',
	'Weight'
];
const REQUIRED_FEATURES_SET = new Set(REQUIRED_FEATURES);

const AGE_FIELD_ALIASES = new Set([
	'Age',
	'age',
	'Age_input',
	'Age_output',
	'age_of_real_person',
	'age_of_forecast',
	'age_of_forcast',
	'age_of_counterfactual'
]);

const FIELD_ALIASES: Record<string, string> = {
	risk: 'Risk_level',
	risk_level: 'Risk_level'
};

export function processApiResponseToPatient(apiData: any): { patient: Record<string, any>, model?: string, country?: string } {
	// Support both new format { model, country, features: {...} } and old flat format
	const features = apiData.features ?? apiData;
	const topLevelCountry = apiData.country;
	const topLevelModel = apiData.model;

	// Extract values from the API response structure
	// Uses nullish coalescing (??) instead of || to preserve valid falsy values like 0
	const extractValue = (key: string) => {
		const feature = features[key];
		return feature?.value ?? undefined;
	};

	// Age_input is the patient's current age; Age_output is the prediction target age (not the same)
	const age = extractValue('Age_input') ?? 15;

	// Create the processed patient object matching test_patient structure
	const patient = {
		'Sex': extractValue('Sex') ?? 1,
		'Age_input': age,
		'country': topLevelCountry ?? extractValue('country') ?? 'FIN',
		'Total_cholesterol': extractValue('Total_cholesterol') ?? 4,
		'Systolic_blood_pressure': extractValue('Systolic_blood_pressure') ?? 110,
		'Diastolic_blood_pressure': extractValue('Diastolic_blood_pressure') ?? 77,
		'Smoking': extractValue('Smoking') ?? 0,
		'Alcohol': extractValue('Alcohol') ?? 0.0,
		'Waist_circumference': extractValue('Waist_circumference') ?? 60,
		'Resting_heart_rate': extractValue('Resting_heart_rate') ?? 78,
		'Height': extractValue('Height') ?? 145,
		'Weight': extractValue('Weight') ?? 45,
		'BMI': extractValue('BMI'),
		'Glucose': extractValue('Glucose') ?? 4.44,
		'Sleep': extractValue('Sleep') ?? 7.6,
		'Diet_HHS': extractValue('Diet_HHS') ?? 7.96212701477799,
		'Diet_T2P': extractValue('Diet_T2P') ?? 3,
		'PA_h_per_w': extractValue('PA_h_per_w') ?? 2.184829974298004,
		'Fitness_speed': extractValue('Fitness_speed') ?? 10,
		'HDL': extractValue('HDL') ?? 1.5007814983868384,
		'LDL': extractValue('LDL') ?? 2.3355886144670652,
		'Triglycerides': extractValue('Triglycerides') ?? 0.7298285124700058,
		'Diabetes': extractValue('Diabetes') ?? 1
	};

	return { patient, model: topLevelModel, country: topLevelCountry };
}

function normalizeAgeValue(value: unknown) {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') return value;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function normalizeRecord(
	record: Record<string, any> | undefined,
	featureKeys: Set<string>
): PatientRecord {
	const normalized: PatientRecord = {};
	let ageSet = false;

	if (record) {
		for (const [rawKey, rawValue] of Object.entries(record)) {
			if (AGE_FIELD_ALIASES.has(rawKey)) {
				if (!ageSet) {
					normalized.Age = normalizeAgeValue(rawValue);
					ageSet = true;
				}
				continue;
			}

			const normalizedKey = FIELD_ALIASES[rawKey] ?? rawKey;
			normalized[normalizedKey] = rawValue ?? null;
		}
	}

	if (!ageSet) {
		normalized.Age = null;
	}

	for (const key of Object.keys(normalized)) {
		featureKeys.add(key);
	}

	return normalized;
}

function fillMissingKeys(record: PatientRecord, orderedKeys: string[]): PatientRecord {
	const filled: PatientRecord = {};
	for (const key of orderedKeys) {
		filled[key] = key in record ? record[key] : null;
	}
	return filled;
}

function buildOrderedKeys(featureKeys: Set<string>) {
	return [
		...REQUIRED_FEATURES,
		...Array.from(featureKeys).filter((key) => !REQUIRED_FEATURES_SET.has(key))
	];
}

export function processForecastRecords(currentData:any, rawForecasts: any) {
	const featureKeys = new Set<string>(REQUIRED_FEATURES);


	const normalizedPatient = normalizeRecord(currentData, featureKeys);

	const normalizedForecasts = Array.isArray(rawForecasts)
		? rawForecasts.map((entry: any) => normalizeRecord(entry, featureKeys))
		: [];

	const orderedKeys = buildOrderedKeys(featureKeys);

    const patient = fillMissingKeys(normalizedPatient, orderedKeys);
	const forecasts = [
		patient,
		...normalizedForecasts.map((record: PatientRecord) =>
			fillMissingKeys(record, orderedKeys)
		)
	];

	return forecasts;
}

export function processCounterfactualDashboardData(rawData: any) {
	const featureKeys = new Set<string>(REQUIRED_FEATURES);

	const normalizedPatient = normalizeRecord(rawData?.real?.current ?? rawData?.current, featureKeys);

	const fallbackInput = Array.isArray(rawData?.input) ? rawData.input.slice(1) : [];
	const rawForecasts =
		Array.isArray(rawData?.real?.forecasting) && rawData.real.forecasting.length > 0
			? rawData.real.forecasting
			: fallbackInput;

	const normalizedForecasts = rawForecasts.map((entry: any) => normalizeRecord(entry, featureKeys));

	const normalizedCounterfactuals = Array.isArray(rawData?.counterfactuals)
		? rawData.counterfactuals.map((cf: any) => {
				const snapshots: PatientRecord[] = [];
				if (cf?.current) {
					snapshots.push(normalizeRecord(cf.current, featureKeys));
				}
				if (Array.isArray(cf?.forecasting)) {
					snapshots.push(
						...cf.forecasting.map((entry: any) => normalizeRecord(entry, featureKeys))
					);
				}
				return snapshots;
		  })
		: [];

	const orderedKeys = buildOrderedKeys(featureKeys);
	const patient = fillMissingKeys(normalizedPatient, orderedKeys);
	const forecasts = [
		patient,
		...normalizedForecasts.map((record: PatientRecord) =>
			fillMissingKeys(record, orderedKeys)
		)
	];
	const counterfactuals = normalizedCounterfactuals.map((cf: PatientRecord[]) =>
		cf.map((record: PatientRecord) => fillMissingKeys(record, orderedKeys))
	);

	return {
		patient,
		forecasts,
		counterfactuals
	};
}