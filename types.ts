export interface ClassItem {
  id: string;
  name: string;
  samples: string[]; // Base64 strings
}

export interface PredictionResult {
  className: string;
  confidence: number;
  modelName: string;
  reasoning?: string;
  color?: string;
}

export enum ModelType {
  CNN = 'MobileNet CNN',
  GEMINI = 'Gemini 2.5 Flash',
  SIMPLE = 'Color Histogram'
}

export interface ConfusionMatrixData {
  actual: string;
  predicted: string;
  count: number;
}

export interface TrainingMetrics {
  accuracy: number;
  totalSamples: number;
  confusionMatrix: ConfusionMatrixData[];
}