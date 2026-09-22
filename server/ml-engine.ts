import {
  fitLogisticRegression,
  fitDecisionTreeClassifier,
  fitRandomForestClassifier,
  fitGradientBoostingClassifier,
  fitLinearSVMClassifier,
  fitGaussianNaiveBayes,
  fitKNNClassifier,
  fitAdaBoostClassifier,
  fitMLPNeuralNet,
  fitExtraTreesClassifier,
  fitRidgeClassifier,
  fitLinearRegression,
  fitRidgeRegression,
  fitLassoRegression,
  fitElasticNet,
  fitDecisionTreeRegressor,
  fitRandomForestRegressor,
  fitGradientBoostingRegressor,
  fitSupportVectorRegressor,
  fitKNNRegressor,
  fitBayesianRidge,
  fitHuberRegressor,
  fitKMeansClustering,
  fitMiniBatchKMeans,
  fitKMedoids,
  fitHierarchicalClustering,
  fitDBSCAN,
  fitOPTICS,
  fitGaussianMixture,
  fitMeanShift,
  fitBirch,
  fitSpectralClustering,
  fitFuzzyCMeans,
} from './ml-algorithms.ts';

export interface ColumnMeta {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'datetime';
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  stats?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    std?: number;
    q25?: number;
    q75?: number;
    mode?: string | number;
    topValues?: { value: string; count: number }[];
  };
}

export interface CorrelationResult {
  features: string[];
  matrix: number[][];
}

// Compute metadata for columns
export function analyzeDataset(data: Record<string, any>[]): ColumnMeta[] {
  if (!data || data.length === 0) return [];

  const rowCount = data.length;
  const colNames = Object.keys(data[0]);

  return colNames.map((col) => {
    let missing = 0;
    const values: any[] = [];
    const numValues: number[] = [];
    const valCounts: Record<string, number> = {};

    for (let i = 0; i < rowCount; i++) {
      const v = data[i][col];
      if (v === null || v === undefined || v === '' || v === 'NaN' || v === 'null') {
        missing++;
      } else {
        values.push(v);
        const strVal = String(v);
        valCounts[strVal] = (valCounts[strVal] || 0) + 1;
        const n = Number(v);
        if (!isNaN(n) && typeof v !== 'boolean') {
          numValues.push(n);
        }
      }
    }

    const uniqueCount = Object.keys(valCounts).length;
    const missingPct = Math.round((missing / rowCount) * 1000) / 10;

    // Detect type: if 90%+ valid non-empty values are numbers, treat as numeric
    const isNumeric = values.length > 0 && numValues.length / values.length >= 0.85;

    // Sort counts for top values/mode
    const sortedCounts = Object.entries(valCounts).sort((a, b) => b[1] - a[1]);
    const mode = sortedCounts.length > 0 ? sortedCounts[0][0] : undefined;
    const topValues = sortedCounts.slice(0, 10).map(([value, count]) => ({ value, count }));

    if (isNumeric && numValues.length > 0) {
      numValues.sort((a, b) => a - b);
      const min = numValues[0];
      const max = numValues[numValues.length - 1];
      const sum = numValues.reduce((acc, x) => acc + x, 0);
      const mean = Math.round((sum / numValues.length) * 1000) / 1000;

      const median = getPercentile(numValues, 50);
      const q25 = getPercentile(numValues, 25);
      const q75 = getPercentile(numValues, 75);

      const variance =
        numValues.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / (numValues.length || 1);
      const std = Math.round(Math.sqrt(variance) * 1000) / 1000;

      return {
        name: col,
        type: 'numeric',
        missingCount: missing,
        missingPercentage: missingPct,
        uniqueCount,
        stats: {
          min,
          max,
          mean,
          median,
          std,
          q25,
          q75,
          mode,
          topValues,
        },
      };
    } else {
      return {
        name: col,
        type: 'categorical',
        missingCount: missing,
        missingPercentage: missingPct,
        uniqueCount,
        stats: {
          mode,
          topValues,
        },
      };
    }
  });
}

function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 1000) / 1000;
}

// Pearson correlation matrix
export function computeCorrelationMatrix(
  data: Record<string, any>[],
  numericCols: string[]
): CorrelationResult {
  const n = data.length;
  if (n === 0 || numericCols.length === 0) {
    return { features: [], matrix: [] };
  }

  // Precompute mean and standard deviations
  const stats = numericCols.map((col) => {
    const vals: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = Number(data[i][col]);
      vals.push(isNaN(v) ? 0 : v);
    }
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std = Math.sqrt(variance) || 1e-9;
    return { col, vals, mean, std };
  });

  const matrix: number[][] = [];

  for (let i = 0; i < numericCols.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < numericCols.length; j++) {
      if (i === j) {
        row.push(1);
      } else {
        const s1 = stats[i];
        const s2 = stats[j];
        let cov = 0;
        for (let k = 0; k < n; k++) {
          cov += (s1.vals[k] - s1.mean) * (s2.vals[k] - s2.mean);
        }
        cov /= n;
        const r = cov / (s1.std * s2.std);
        row.push(Math.round(Math.max(-1, Math.min(1, r)) * 1000) / 1000);
      }
    }
    matrix.push(row);
  }

  return { features: numericCols, matrix };
}

// ETL Operations
export interface ETLConfig {
  action: 'impute_missing' | 'encode_categorical' | 'scale_features' | 'drop_columns' | 'remove_outliers';
  columns?: string[];
  strategy?: string; // 'mean', 'median', 'mode', 'constant', 'one_hot', 'label', 'min_max', 'standard'
  constantValue?: any;
  threshold?: number;
}

export function executeETL(data: Record<string, any>[], config: ETLConfig): {
  processedData: Record<string, any>[];
  summary: string;
} {
  let result = JSON.parse(JSON.stringify(data)) as Record<string, any>[];
  let summary = '';

  switch (config.action) {
    case 'impute_missing': {
      const cols = config.columns || Object.keys(result[0] || {});
      const strategy = config.strategy || 'mean';

      if (strategy === 'drop_rows') {
        const initialCount = result.length;
        result = result.filter((row) =>
          cols.every((c) => row[c] !== null && row[c] !== undefined && row[c] !== '' && !isNaN(row[c]))
        );
        summary = `Dropped ${initialCount - result.length} rows with missing values in [${cols.join(', ')}]`;
      } else {
        cols.forEach((col) => {
          // Calculate replacement
          let replacement: any = 0;
          const validNums = result
            .map((r) => Number(r[col]))
            .filter((n) => !isNaN(n));

          if (strategy === 'mean' && validNums.length > 0) {
            replacement = Math.round((validNums.reduce((a, b) => a + b, 0) / validNums.length) * 100) / 100;
          } else if (strategy === 'median' && validNums.length > 0) {
            validNums.sort((a, b) => a - b);
            replacement = getPercentile(validNums, 50);
          } else if (strategy === 'mode') {
            const counts: Record<string, number> = {};
            result.forEach((r) => {
              if (r[col] !== null && r[col] !== undefined && r[col] !== '') {
                counts[String(r[col])] = (counts[String(r[col])] || 0) + 1;
              }
            });
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            replacement = top ? top[0] : 0;
          } else if (strategy === 'constant') {
            replacement = config.constantValue ?? 0;
          }

          let replacedCount = 0;
          result.forEach((row) => {
            if (row[col] === null || row[col] === undefined || row[col] === '' || isNaN(row[col])) {
              row[col] = replacement;
              replacedCount++;
            }
          });
          summary += `Imputed ${replacedCount} values in '${col}' with ${strategy} (${replacement}). `;
        });
      }
      break;
    }

    case 'encode_categorical': {
      const cols = config.columns || [];
      const strategy = config.strategy || 'label';

      cols.forEach((col) => {
        const uniqueValues = Array.from(new Set(result.map((r) => String(r[col]))));

        if (strategy === 'one_hot') {
          uniqueValues.forEach((val) => {
            const newColName = `${col}_${val.replace(/[^a-zA-Z0-9]/g, '_')}`;
            result.forEach((row) => {
              row[newColName] = String(row[col]) === val ? 1 : 0;
            });
          });
          // Remove original column
          result.forEach((row) => delete row[col]);
          summary += `One-hot encoded '${col}' into ${uniqueValues.length} binary features. `;
        } else {
          // Label encoding
          const map: Record<string, number> = {};
          uniqueValues.forEach((v, idx) => {
            map[v] = idx;
          });
          result.forEach((row) => {
            row[col] = map[String(row[col])] ?? 0;
          });
          summary += `Label encoded '${col}' with ${uniqueValues.length} classes. `;
        }
      });
      break;
    }

    case 'scale_features': {
      const cols = config.columns || [];
      const strategy = config.strategy || 'standard';

      cols.forEach((col) => {
        const vals = result.map((r) => Number(r[col]) || 0);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = sum / (vals.length || 1);
        const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vals.length || 1);
        const std = Math.sqrt(variance) || 1e-9;

        if (strategy === 'min_max') {
          const range = max - min || 1;
          result.forEach((row) => {
            const v = Number(row[col]) || 0;
            row[col] = Math.round(((v - min) / range) * 1000) / 1000;
          });
          summary += `Min-Max scaled '${col}' to [0, 1]. `;
        } else {
          // Standard scaler (Z-score)
          result.forEach((row) => {
            const v = Number(row[col]) || 0;
            row[col] = Math.round(((v - mean) / std) * 1000) / 1000;
          });
          summary += `Standardized '${col}' (mean: 0, std: 1). `;
        }
      });
      break;
    }

    case 'drop_columns': {
      const cols = config.columns || [];
      result.forEach((row) => {
        cols.forEach((c) => delete row[c]);
      });
      summary = `Dropped columns: [${cols.join(', ')}]`;
      break;
    }

    case 'remove_outliers': {
      const cols = config.columns || [];
      const threshold = config.threshold || 1.5;
      const initialCount = result.length;

      cols.forEach((col) => {
        const vals = result.map((r) => Number(r[col])).filter((n) => !isNaN(n));
        vals.sort((a, b) => a - b);
        const q25 = getPercentile(vals, 25);
        const q75 = getPercentile(vals, 75);
        const iqr = q75 - q25;
        const lowerBound = q25 - threshold * iqr;
        const upperBound = q75 + threshold * iqr;

        result = result.filter((row) => {
          const v = Number(row[col]);
          return isNaN(v) || (v >= lowerBound && v <= upperBound);
        });
      });

      summary = `Removed ${initialCount - result.length} outlier instances using IQR threshold ${threshold}.`;
      break;
    }

    default:
      summary = 'No transformation applied';
  }

  return { processedData: result, summary };
}

// Machine Learning Training & Inference Engine
export interface TrainModelParams {
  data: Record<string, any>[];
  taskType: 'regression' | 'classification' | 'clustering';
  algorithm: string;
  targetColumn?: string;
  featureColumns: string[];
  hyperparameters?: Record<string, any>;
}

export function trainMLModel(params: TrainModelParams) {
  const { data, taskType, algorithm, targetColumn, featureColumns, hyperparameters = {} } = params;

  if (taskType !== 'clustering' && !targetColumn) {
    throw new Error('Target column is required for supervised learning');
  }

  if (!featureColumns || featureColumns.length === 0) {
    throw new Error('At least one feature column is required');
  }

  // 1. Prepare numeric vectors
  const X: number[][] = [];
  const y: (number | string)[] = [];

  // Categorical mappings for string feature columns
  const featureMappings: Record<string, Record<string, number>> = {};
  featureColumns.forEach((col) => {
    const isStringCol = data.some((r) => typeof r[col] === 'string' && isNaN(Number(r[col])));
    if (isStringCol) {
      featureMappings[col] = {};
      const uniqueVals = Array.from(new Set(data.map((r) => String(r[col]))));
      uniqueVals.forEach((uv, idx) => {
        featureMappings[col][uv] = idx;
      });
    }
  });

  // Target mapping for classification
  let targetClasses: string[] = [];
  const targetMap: Record<string, number> = {};

  if (taskType === 'classification' && targetColumn) {
    targetClasses = Array.from(new Set(data.map((r) => String(r[targetColumn]))));
    targetClasses.forEach((cls, idx) => {
      targetMap[cls] = idx;
    });
  }

  data.forEach((row) => {
    const featureVec: number[] = [];
    featureColumns.forEach((col) => {
      let val = row[col];
      if (featureMappings[col]) {
        featureVec.push(featureMappings[col][String(val)] ?? 0);
      } else {
        const num = Number(val);
        featureVec.push(isNaN(num) ? 0 : num);
      }
    });
    X.push(featureVec);

    if (targetColumn) {
      y.push(row[targetColumn]);
    }
  });

  // Train / Test split (80% train, 20% test)
  const testSplitRatio = hyperparameters.testSplit || 0.2;
  const n = X.length;
  const testSize = Math.max(1, Math.floor(n * testSplitRatio));
  const trainSize = n - testSize;

  const X_train = X.slice(0, trainSize);
  const y_train = y.slice(0, trainSize);
  const X_test = X.slice(trainSize);
  const y_test = y.slice(trainSize);

  // Train algorithm
  if (taskType === 'regression') {
    const y_train_num = y_train.map((v) => Number(v) || 0);
    const y_test_num = y_test.map((v) => Number(v) || 0);

    let regResult: {
      weights: number[];
      intercept: number;
      featureImportances: number[];
      predict: (x: number[]) => number;
    };

    switch (algorithm) {
      case 'ridge_regression':
        regResult = fitRidgeRegression(X_train, y_train_num);
        break;
      case 'lasso_regression':
        regResult = fitLassoRegression(X_train, y_train_num);
        break;
      case 'elastic_net':
        regResult = fitElasticNet(X_train, y_train_num);
        break;
      case 'decision_tree_reg':
      case 'decision_tree':
        regResult = fitDecisionTreeRegressor(X_train, y_train_num);
        break;
      case 'random_forest_reg':
        regResult = fitRandomForestRegressor(X_train, y_train_num);
        break;
      case 'gradient_boosting_reg':
        regResult = fitGradientBoostingRegressor(X_train, y_train_num);
        break;
      case 'support_vector_reg':
        regResult = fitSupportVectorRegressor(X_train, y_train_num);
        break;
      case 'knn_regressor':
        regResult = fitKNNRegressor(X_train, y_train_num);
        break;
      case 'bayesian_ridge':
        regResult = fitBayesianRidge(X_train, y_train_num);
        break;
      case 'huber_regressor':
        regResult = fitHuberRegressor(X_train, y_train_num);
        break;
      case 'linear_regression':
      default:
        regResult = fitLinearRegression(X_train, y_train_num);
        break;
    }

    const { weights, intercept, featureImportances } = regResult;

    // Predict on test set
    const y_pred = X_test.map((x) => regResult.predict(x));

    // Compute metrics
    const mse = y_test_num.reduce((acc, trueVal, i) => acc + Math.pow(trueVal - y_pred[i], 2), 0) / y_test_num.length;
    const rmse = Math.round(Math.sqrt(mse) * 1000) / 1000;
    const mae =
      Math.round(
        (y_test_num.reduce((acc, trueVal, i) => acc + Math.abs(trueVal - y_pred[i]), 0) / y_test_num.length) * 1000
      ) / 1000;

    const y_mean = y_test_num.reduce((a, b) => a + b, 0) / y_test_num.length;
    const ss_tot = y_test_num.reduce((acc, v) => acc + Math.pow(v - y_mean, 2), 0) || 1e-9;
    const ss_res = y_test_num.reduce((acc, trueVal, i) => acc + Math.pow(trueVal - y_pred[i], 2), 0);
    const r2 = Math.round(Math.max(0, 1 - ss_res / ss_tot) * 1000) / 1000;

    return {
      taskType,
      algorithm,
      targetColumn,
      featureColumns,
      metrics: {
        r2,
        rmse,
        mae,
        mse: Math.round(mse * 1000) / 1000,
        sampleCount: n,
        trainCount: trainSize,
        testCount: testSize,
      },
      modelState: {
        weights,
        intercept,
        featureMappings,
        featureImportances,
      },
    };
  } else if (taskType === 'classification') {
    const y_train_encoded = y_train.map((v) => targetMap[String(v)] ?? 0);
    const y_test_encoded = y_test.map((v) => targetMap[String(v)] ?? 0);

    let clfResult: {
      weights?: number[][];
      biases?: number[];
      featureImportances: number[];
      predict: (x: number[]) => { classIdx: number; probs: number[] };
      modelData?: any;
    };

    switch (algorithm) {
      case 'decision_tree_clf':
      case 'decision_tree':
        clfResult = fitDecisionTreeClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'random_forest_clf':
        clfResult = fitRandomForestClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'gradient_boosting_clf':
        clfResult = fitGradientBoostingClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'svm_classifier':
        clfResult = fitLinearSVMClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'naive_bayes':
        clfResult = fitGaussianNaiveBayes(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'knn_classifier':
        clfResult = fitKNNClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'adaboost_clf':
        clfResult = fitAdaBoostClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'mlp_neural_net':
        clfResult = fitMLPNeuralNet(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'extra_trees_clf':
        clfResult = fitExtraTreesClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'ridge_classifier':
        clfResult = fitRidgeClassifier(X_train, y_train_encoded, targetClasses.length);
        break;
      case 'logistic_regression':
      default:
        clfResult = fitLogisticRegression(X_train, y_train_encoded, targetClasses.length);
        break;
    }

    const { weights, biases, featureImportances } = clfResult;

    // Predict test set
    let correct = 0;
    const confusionMatrix: number[][] = Array.from({ length: targetClasses.length }, () =>
      Array(targetClasses.length).fill(0)
    );

    const y_pred = X_test.map((x) => clfResult.predict(x).classIdx);

    for (let i = 0; i < y_test_encoded.length; i++) {
      const trueClass = y_test_encoded[i];
      const predClass = y_pred[i];
      if (trueClass === predClass) correct++;
      if (confusionMatrix[trueClass] && confusionMatrix[trueClass][predClass] !== undefined) {
        confusionMatrix[trueClass][predClass]++;
      }
    }

    const accuracy = Math.round((correct / y_test_encoded.length) * 1000) / 1000;

    // F1 / Precision / Recall macro
    let sumPrecision = 0;
    let sumRecall = 0;
    for (let c = 0; c < targetClasses.length; c++) {
      const tp = confusionMatrix[c][c];
      let colSum = 0;
      for (let r = 0; r < targetClasses.length; r++) colSum += confusionMatrix[r][c];
      let rowSum = 0;
      for (let k = 0; k < targetClasses.length; k++) rowSum += confusionMatrix[c][k];

      const p = colSum > 0 ? tp / colSum : 0;
      const rec = rowSum > 0 ? tp / rowSum : 0;
      sumPrecision += p;
      sumRecall += rec;
    }

    const precision = Math.round((sumPrecision / targetClasses.length) * 1000) / 1000;
    const recall = Math.round((sumRecall / targetClasses.length) * 1000) / 1000;
    const f1 =
      precision + recall > 0
        ? Math.round(((2 * precision * recall) / (precision + recall)) * 1000) / 1000
        : 0;

    return {
      taskType,
      algorithm,
      targetColumn,
      featureColumns,
      metrics: {
        accuracy,
        precision,
        recall,
        f1Score: f1,
        confusionMatrix,
        classes: targetClasses,
        sampleCount: n,
        trainCount: trainSize,
        testCount: testSize,
      },
      modelState: {
        weights,
        biases,
        targetClasses,
        targetMap,
        featureMappings,
        featureImportances,
      },
    };
  } else {
    // Clustering
    const k = hyperparameters.k || 3;
    let clusterResult: {
      centroids: number[][];
      labels: number[];
      inertia: number;
      silhouette: number;
    };

    switch (algorithm) {
      case 'minibatch_kmeans':
        clusterResult = fitMiniBatchKMeans(X, k);
        break;
      case 'kmedoids':
        clusterResult = fitKMedoids(X, k);
        break;
      case 'hierarchical_clustering':
        clusterResult = fitHierarchicalClustering(X, k);
        break;
      case 'dbscan':
        clusterResult = fitDBSCAN(X, hyperparameters.eps || 2.0, hyperparameters.minPts || 3);
        break;
      case 'optics':
        clusterResult = fitOPTICS(X, k);
        break;
      case 'gaussian_mixture':
        clusterResult = fitGaussianMixture(X, k);
        break;
      case 'mean_shift':
        clusterResult = fitMeanShift(X, k);
        break;
      case 'birch':
        clusterResult = fitBirch(X, k);
        break;
      case 'spectral_clustering':
        clusterResult = fitSpectralClustering(X, k);
        break;
      case 'fuzzy_c_means':
        clusterResult = fitFuzzyCMeans(X, k);
        break;
      case 'kmeans':
      case 'kmeans_clustering':
      default:
        clusterResult = fitKMeansClustering(X, k);
        break;
    }

    const { centroids, labels, inertia, silhouette } = clusterResult;

    return {
      taskType,
      algorithm,
      featureColumns,
      metrics: {
        clusters: k,
        inertia: Math.round(inertia * 100) / 100,
        silhouetteScore: Math.round(silhouette * 1000) / 1000,
        sampleCount: n,
      },
      modelState: {
        centroids,
        featureMappings,
      },
    };
  }
}

// Inference Engine for real-time prediction
export function predictInference(
  model: {
    task_type: string;
    feature_columns: string[];
    model_state: any;
    target_column?: string;
  },
  inputValues: Record<string, any>
) {
  const { task_type, feature_columns, model_state } = model;
  const { featureMappings = {} } = model_state;

  // Build input vector
  const x: number[] = [];
  feature_columns.forEach((col) => {
    let val = inputValues[col];
    if (featureMappings[col]) {
      x.push(featureMappings[col][String(val)] ?? 0);
    } else {
      const num = Number(val);
      x.push(isNaN(num) ? 0 : num);
    }
  });

  if (task_type === 'regression') {
    const { weights = [], intercept = 0, featureImportances = [] } = model_state;
    let pred = intercept;
    const explanations: { feature: string; contribution: number }[] = [];

    for (let j = 0; j < x.length; j++) {
      const contr = x[j] * (weights[j] || 0);
      pred += contr;
      explanations.push({
        feature: feature_columns[j],
        contribution: Math.round(contr * 100) / 100,
      });
    }

    explanations.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      prediction: Math.round(pred * 100) / 100,
      type: 'continuous',
      confidence: 0.95,
      explanations: explanations.slice(0, 5),
    };
  } else if (task_type === 'classification') {
    const { weights = [[]], biases = [], targetClasses = [] } = model_state;
    const logits = biases.map((b: number, c: number) => {
      let s = b;
      for (let j = 0; j < x.length; j++) {
        s += x[j] * (weights[c] ? weights[c][j] || 0 : 0);
      }
      return s;
    });

    const maxLogit = Math.max(...logits);
    const expLogits = logits.map((l: number) => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a: number, b: number) => a + b, 0);
    const probs = expLogits.map((e: number) => Math.round((e / sumExp) * 1000) / 1000);

    let bestClassIdx = 0;
    let maxProb = probs[0];
    for (let c = 1; c < probs.length; c++) {
      if (probs[c] > maxProb) {
        maxProb = probs[c];
        bestClassIdx = c;
      }
    }

    const predictedLabel = targetClasses[bestClassIdx] || String(bestClassIdx);

    return {
      prediction: predictedLabel,
      type: 'categorical',
      confidence: maxProb,
      probabilities: targetClasses.map((label: string, idx: number) => ({
        label,
        probability: probs[idx] || 0,
      })),
    };
  } else {
    // Clustering
    const { centroids = [] } = model_state;
    let minDist = Infinity;
    let bestCluster = 0;

    centroids.forEach((centroid: number[], c: number) => {
      let d = 0;
      for (let j = 0; j < x.length; j++) {
        d += Math.pow(x[j] - (centroid[j] || 0), 2);
      }
      if (d < minDist) {
        minDist = d;
        bestCluster = c;
      }
    });

    return {
      prediction: `Cluster ${bestCluster + 1}`,
      type: 'cluster',
      clusterIndex: bestCluster,
      distanceToCentroid: Math.round(Math.sqrt(minDist) * 100) / 100,
    };
  }
}
