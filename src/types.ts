export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

export interface DatasetSummary {
  id: number;
  name: string;
  filename: string;
  description: string;
  row_count: number;
  column_count: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnStats {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q25?: number;
  q75?: number;
  mode?: string | number;
  topValues?: { value: string; count: number }[];
}

export interface ColumnMeta {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'datetime';
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  stats?: ColumnStats;
}

export interface DatasetDetail {
  id: number;
  name: string;
  filename: string;
  description: string;
  rowCount: number;
  columnCount: number;
  columnsMeta: ColumnMeta[];
  preview: Record<string, any>[];
  createdAt: string;
  updatedAt: string;
}

export interface ETLStep {
  id: number;
  stepNumber: number;
  actionType: string;
  details: {
    config?: any;
    summary?: string;
    timestamp?: string;
  };
  createdAt: string;
}

export interface MLModel {
  id: number;
  modelName: string;
  algorithm: string;
  taskType: 'regression' | 'classification' | 'clustering';
  targetColumn?: string;
  featureColumns: string[];
  hyperparameters?: Record<string, any>;
  metrics: {
    r2?: number;
    rmse?: number;
    mae?: number;
    mse?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    confusionMatrix?: number[][];
    classes?: string[];
    clusters?: number;
    inertia?: number;
    silhouetteScore?: number;
    sampleCount?: number;
    trainCount?: number;
    testCount?: number;
  };
  createdAt: string;
}

export interface PredictionResult {
  prediction: string | number;
  type: 'continuous' | 'categorical' | 'cluster';
  confidence?: number;
  probabilities?: { label: string; probability: number }[];
  explanations?: { feature: string; contribution: number }[];
  clusterIndex?: number;
  distanceToCentroid?: number;
}

export interface AnalyticsInsights {
  datasetId: number;
  name: string;
  rowCount: number;
  columnCount: number;
  correlation: {
    features: string[];
    matrix: number[][];
  };
  strongCorrelations: {
    featureA: string;
    featureB: string;
    correlation: number;
    relationship: string;
  }[];
  automatedInsights: string[];
  columnsMeta: ColumnMeta[];
}
