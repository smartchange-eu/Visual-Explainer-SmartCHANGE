// export type DataI = Record<string, number | string>;
export type MetadataI = {
	name: string;
	type: 'continuous' | 'text' | 'categorical';
	replace: string;
	values: string[];
	category: string;
};

export type DataI = {
	id: string | number;
	data: Record<string, number>;
};
export type DataArrI = Array<DataI>;
export type FeatureArrI = Array<{ value: number; id: number; selected: boolean }>;
export type FeatureI = {
	name: string;
	data: FeatureArrI;
	metadata: MetadataI;
};

export const extractFeatureArr = (
	data: DataArrI,
	feature: string,
	metadataArray: Array<MetadataI>
): FeatureI => {
	return {
		name: feature,
		data: data.map((d) => ({
			value: d.data[feature],
			id: d.id
		})) as FeatureArrI,
		metadata: metadataArray.find((f) => f.name === feature) as MetadataI
	};
};

export type FeatureSettingModI = {
	name: string;
	weight: number;
	locked: boolean;
	rangeStart?: number;
	rangeEnd?: number;
};

export type FeatureSettingI = FeatureSettingModI & {
	hide: boolean;
	data: MetadataI;
	target: boolean;
};
