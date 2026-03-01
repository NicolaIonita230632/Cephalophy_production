export interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
  visible: boolean;
  isCustom?: boolean;
}

export interface Model {
  id: string;
  name: string;
  accuracy: number;
  loss: number;
  active: boolean;
  createdAt: string;
  metrics?: {
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface CephalometricMeasurement {
  id: string;
  name: string;
  type: 'angle' | 'distance';
  points: string[]; // Array of landmark IDs
  value: number;
  unit: 'degrees' | 'mm' | 'px';
}

export interface CephalometricAnalysis {
  id: string;
  name: string;
  type: 'steiner' | 'downs' | 'ricketts' | 'custom';
  measurements: CephalometricMeasurement[];
}

export interface ImageData {
  id: string;
  url: string;
  width: number;
  height: number;
  landmarks?: Landmark[];
  pixelToMmRatio?: number;
}

export interface CephalometricMeasurement {
  id: string;
  name: string;
  type: 'angle' | 'distance';
  points: string[]; // Array of landmark IDs
  value: number;
  unit: 'degrees' | 'mm' | 'px';
  norm?: number;      // Normal/reference value
  deviation?: number; // Deviation from norm
}
