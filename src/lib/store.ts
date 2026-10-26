import { writable, derived, readable } from 'svelte/store';
import type { DataArrI, DataI, FeatureSettingI, MetadataI } from './types';
import { scaleLinear, type ScaleLinear, groups} from 'd3';
import { isNumber } from 'lodash-es';
import featureAttrsData from './data/featureAttrs.json';

export const loading = writable<boolean>(true);

// params which control counterfactual generation
export const nCF = writable<number>(20);
export const targetModel = writable<'score2' | 'hhs' | 't2p'>('score2');
export const targetRisk = writable<number>(0.02);
export const targetAge = writable<number>(55);
export const forecastAges = writable<number[]>([30, 40, 50, 55])

export const analyzeAge = writable<number>(55)

export const featureAttrs = writable(featureAttrsData);
export const focusFeature = writable<string>('');

export const featureShown = derived(featureAttrs, ($featureAttrs) => {
	return $featureAttrs.filter(f => !f.fixed).sort((a,b) => featureTypes.indexOf(a.type) - featureTypes.indexOf(b.type));
});

const featureTypes = ['Basic Features', 'Behavioural Markers', 'Health Markers' ];
export const featureGroups = derived(featureAttrs, ($featureAttrs) =>{
	return groups($featureAttrs, d => d.type).sort((a,b) => featureTypes.indexOf(a[0]) - featureTypes.indexOf(b[0]));
})

// Create a persistent store for initialPatientData using localStorage
function createPersistentStore<T>(key: string, defaultValue: T) {
	// Only run in browser environment
	if (typeof window === 'undefined') {
		return writable<T>(defaultValue);
	}

	// Try to load from localStorage
	const stored = localStorage.getItem(key);
	const initialValue = stored ? JSON.parse(stored) : defaultValue;

	const store = writable<T>(initialValue);

	// Subscribe to changes and save to localStorage
	store.subscribe(value => {
		if (value && Object.keys(value).length > 0) {
			localStorage.setItem(key, JSON.stringify(value));
		} else {
			localStorage.removeItem(key);
		}
	});

	return store;
}

export const initialPatientData = createPersistentStore<any>('initialPatientData', {}) // save the patient data got from broker

export const patientInfoWithForcasts = writable<any[]>([]);
export const patientInfo = writable<any>({}); // save patient info after process (age_input->age)

// Combined ages for drawing: current age + forecast ages
export const allAges = derived([patientInfo, forecastAges], ([$patientInfo, $forecastAges]) => {
	const currentAge = $patientInfo?.Age;
	if (currentAge !== null && currentAge !== undefined && !isNaN(Number(currentAge))) {
		const currentAgeNum = Number(currentAge);
		const combined = [currentAgeNum, ...$forecastAges];
		// Remove duplicates and sort
		return [...new Set(combined)].sort((a, b) => a - b);
	}
	return $forecastAges;
});

export const patientInfoOfAnalyzeAge = derived([patientInfoWithForcasts, analyzeAge], ([$patientInfoWithForcasts, $analyzeAge],set) =>{
	set($patientInfoWithForcasts.find(d => d.Age === $analyzeAge))
});
export const patientRisk = derived([targetAge, patientInfoWithForcasts], ([$targetAge, $patientInfoWithForcasts]) => {
	return $patientInfoWithForcasts.find(d => d.Age === $targetAge)?.Risk_level;
});

export const whatIfRisk = writable<number | undefined>(undefined);
export const whatIfPatientWithForcasts = writable<any[]>([]);

export const counterfactuals = writable<any[]>([]);
export const counterfactualsOfAnalyzeAge = derived([counterfactuals, analyzeAge], ([$counterfactuals, $analyzeAge],set) => {
	set($counterfactuals.map((v: Array<any>) => v.find(d => d.Age === $analyzeAge)));
});
export const selectedCounterfactuals = writable<(number | string)[] | undefined>([]);
export const shadowPatient = writable<number | string>(-1);

export const forecastedCounterfactuals = writable<DataArrI>([]);

export const currentPatient = writable<DataI>({ data: {}, id: '' });
export const forecastedPatient = writable<DataI>({ data: {}, id: '' });
export const forecastedPatientTrajectory = writable<DataArrI>([]);
export const forecastedPatientTrajectoryColorScale = writable<ScaleLinear<string, string>>(scaleLinear<string>().range(['#f00', '#00f']));
export const patient = writable<DataI>({ data: {}, id: '' }); // which patient to used? forecasted or current


export const hoveredPatientAge = writable<number | undefined>(undefined);
export const whichCFToShow = writable<'current' | 'forecasted' | 'patient'>('forecasted');


export const featureSettings = writable<Record<string, FeatureSettingI>>({});
export const targetFeature = writable<string>('');
export const featureArray = writable<Array<MetadataI>>([]);
export const featurePerCategory = writable<Record<string, MetadataI[]>>({});
export const highlightedFeature = writable<MetadataI | undefined>(undefined);

export const pearsonMatrix = writable<Record<string, Record<string, number>>>({});

export const defaultFeatureSetting: FeatureSettingI = {
	name: '',
	weight: 1,
	locked: false,
	hide: false,
	rangeEnd: 1,
	rangeStart: 0,
	data: {
		name: '',
		type: 'continuous',
		replace: '',
		values: [],
		category: ''
	},
	target: false
};

export function processFeatureValue(v: string | number){
	if(isNumber(v)){
		if (Number.isInteger(v)) return +v;

		const multiplied = v * 100;
		if (multiplied === Math.floor(multiplied)) {
			return v;
		}
		return v.toPrecision(2)
	}
	return v
}
// Proposed values for features edited via sliders
// proposedValues and what-if merging are handled locally in PatientInfo.svelte

