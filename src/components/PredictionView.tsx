import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Play,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Calculator,
  Sliders,
  Layers,
  Download,
} from 'lucide-react';
import { DatasetDetail, MLModel, PredictionResult } from '../types.ts';
import { api } from '../lib/api.ts';
import { ExportModal } from './ExportModal.tsx';

interface PredictionViewProps {
  dataset: DatasetDetail | null;
}

export const PredictionView: React.FC<PredictionViewProps> = ({ dataset }) => {
  const [modelType, setModelType] = useState<'classification' | 'regression' | 'clustering'>('classification');
  const [algorithm, setAlgorithm] = useState<string>('logistic_regression');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [featureColumns, setFeatureColumns] = useState<string[]>([]);
  const [clustersCount, setClustersCount] = useState<number>(3);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [trainedModel, setTrainedModel] = useState<MLModel | null>(null);
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  // Live inference inputs
  const [inferenceInput, setInferenceInput] = useState<Record<string, any>>({});
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [recentPredictions, setRecentPredictions] = useState<PredictionResult[]>([]);

  // Automatically configure smart defaults when dataset or modelType changes
  useEffect(() => {
    if (dataset) {
      autoConfigure();
    }
  }, [dataset?.id, modelType]);

  const autoConfigure = () => {
    if (!dataset) return;
    const allCols = dataset.columnsMeta.map((c) => c.name);

    if (modelType === 'classification') {
      setAlgorithm('logistic_regression');
      const binaryCol = dataset.columnsMeta.find(
        (c) =>
          c.name.toLowerCase().includes('churn') ||
          c.name.toLowerCase().includes('outcome') ||
          c.name.toLowerCase().includes('target') ||
          c.name.toLowerCase().includes('label') ||
          c.uniqueCount <= 5
      );
      const target = binaryCol ? binaryCol.name : allCols[allCols.length - 1];
      setTargetColumn(target);
      const features = allCols.filter((c) => c !== target);
      setFeatureColumns(features);
      initializeInferenceInputs(features);
    } else if (modelType === 'regression') {
      setAlgorithm('ridge_regression');
      const numCol = dataset.columnsMeta.find(
        (c) =>
          c.type === 'numeric' &&
          (c.name.toLowerCase().includes('price') ||
            c.name.toLowerCase().includes('charge') ||
            c.name.toLowerCase().includes('value') ||
            c.name.toLowerCase().includes('salary') ||
            c.name.toLowerCase().includes('target'))
      );
      const target = numCol
        ? numCol.name
        : allCols.find((c) => dataset.columnsMeta.find((m) => m.name === c)?.type === 'numeric') ||
          allCols[allCols.length - 1];
      setTargetColumn(target);
      const features = allCols.filter((c) => c !== target);
      setFeatureColumns(features);
      initializeInferenceInputs(features);
    } else if (modelType === 'clustering') {
      setAlgorithm('kmeans');
      setTargetColumn('');
      const numerics = dataset.columnsMeta.filter((c) => c.type === 'numeric').map((c) => c.name);
      setFeatureColumns(numerics);
      initializeInferenceInputs(numerics);
    }
  };

  const initializeInferenceInputs = (features: string[]) => {
    if (!dataset) return;
    const initial: Record<string, any> = {};
    features.forEach((feat) => {
      const meta = dataset.columnsMeta.find((c) => c.name === feat);
      if (meta?.type === 'numeric') {
        initial[feat] = meta.stats?.mean !== undefined ? Math.round(meta.stats.mean * 10) / 10 : 0;
      } else if (meta?.stats?.topValues && meta.stats.topValues.length > 0) {
        initial[feat] = meta.stats.topValues[0].value;
      } else {
        initial[feat] = '';
      }
    });
    setInferenceInput(initial);
  };

  const toggleFeature = (col: string) => {
    setFeatureColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleTrain = async () => {
    if (!dataset) return;
    if (featureColumns.length === 0) {
      setTrainError('Please select at least one feature column for training.');
      return;
    }
    if (modelType !== 'clustering' && !targetColumn) {
      setTrainError('Please select a target variable column.');
      return;
    }

    setTraining(true);
    setTrainError(null);
    setPredictionResult(null);

    try {
      const res = await api.ml.train({
        datasetId: dataset.id,
        taskType: modelType,
        algorithm,
        targetColumn: modelType === 'clustering' ? undefined : targetColumn,
        featureColumns,
        hyperparameters: modelType === 'clustering' ? { k: clustersCount } : undefined,
      });

      setTrainedModel(res.model);
    } catch (err: any) {
      console.error('Training failed:', err);
      setTrainError(err?.message || 'Model training failed');
    } finally {
      setTraining(false);
    }
  };

  const handlePredict = async () => {
    if (!trainedModel) return;
    setPredicting(true);
    setPredictError(null);

    try {
      const res = await api.ml.predict(trainedModel.id, inferenceInput);
      setPredictionResult(res.result);
      setRecentPredictions((prev) => [res.result, ...prev.slice(0, 4)]);
    } catch (err: any) {
      setPredictError(err.message || 'Inference failed');
    } finally {
      setPredicting(false);
    }
  };

  if (!dataset) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-bold text-slate-800">No Dataset Selected</p>
        <p className="text-xs text-slate-500 mt-1">Please select a dataset from the Datasets tab to train models.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Machine Learning Studio</h1>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-semibold">
              {dataset.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure supervised and unsupervised ML models, evaluate test metrics, and test interactive predictions.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export Model &amp; Data</span>
          </button>

          <button
            type="button"
            onClick={autoConfigure}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Auto-Configure</span>
          </button>
        </div>
      </div>

      {/* 3 Steps Workflow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1: Model Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                1
              </span>
              <h2 className="text-sm font-bold text-slate-900">Task &amp; Model Architecture</h2>
            </div>

            {/* Task Type Tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
              {[
                { id: 'classification', label: 'Classification' },
                { id: 'regression', label: 'Regression' },
                { id: 'clustering', label: 'Clustering' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModelType(tab.id as any)}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                    modelType === tab.id
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Algorithm Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Algorithm</label>
              <select
                aria-label="Select algorithm"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {modelType === 'classification' && (
                  <>
                    <option value="logistic_regression">Logistic Regression (Multinomial &amp; Interpretable)</option>
                    <option value="random_forest_clf">Random Forest Classifier (Bagged Decision Trees)</option>
                    <option value="gradient_boosting_clf">Gradient Boosted Trees (Sequential Residual Boosting)</option>
                    <option value="decision_tree_clf">Decision Tree Classifier (CART with Gini Impurity)</option>
                    <option value="svm_classifier">Support Vector Machine (Linear SVM with Hinge Loss)</option>
                    <option value="naive_bayes">Gaussian Naive Bayes (Probabilistic Likelihood)</option>
                    <option value="knn_classifier">K-Nearest Neighbors Classifier (k=5 Distance Weighted)</option>
                    <option value="adaboost_clf">AdaBoost Classifier (Adaptive Stumps Boosting)</option>
                    <option value="mlp_neural_net">Multi-Layer Perceptron (Neural Network with ReLU)</option>
                    <option value="extra_trees_clf">Extra Trees Classifier (Extremely Randomized Trees)</option>
                    <option value="ridge_classifier">Ridge Classifier (L2 Regularized Linear Classifier)</option>
                  </>
                )}
                {modelType === 'regression' && (
                  <>
                    <option value="linear_regression">Linear Regression (Ordinary Least Squares)</option>
                    <option value="ridge_regression">Ridge Regression (L2 Regularized)</option>
                    <option value="lasso_regression">Lasso Regression (L1 Penalty &amp; Sparsity)</option>
                    <option value="elastic_net">ElasticNet Regressor (Combined L1 + L2)</option>
                    <option value="random_forest_reg">Random Forest Regressor (Ensemble of Trees)</option>
                    <option value="gradient_boosting_reg">Gradient Boosting Regressor (Additive Residual Boosting)</option>
                    <option value="decision_tree_reg">Decision Tree Regressor (Piecewise-Constant CART)</option>
                    <option value="support_vector_reg">Support Vector Regressor (SVR Epsilon-Tube)</option>
                    <option value="knn_regressor">K-Nearest Neighbors Regressor (k=5 Distance Weighted)</option>
                    <option value="bayesian_ridge">Bayesian Ridge Regression (Gaussian Priors)</option>
                    <option value="huber_regressor">Huber Robust Regressor (M-Estimator Outlier Resistant)</option>
                  </>
                )}
                {modelType === 'clustering' && (
                  <>
                    <option value="kmeans">K-Means Clustering (Centroid-based Partitioning)</option>
                    <option value="minibatch_kmeans">Mini-Batch K-Means (Fast Incremental Centroids)</option>
                    <option value="kmedoids">K-Medoids / PAM (Exemplar Medoid Partitioning)</option>
                    <option value="hierarchical_clustering">Agglomerative Hierarchical (Ward Linkage Dendrogram)</option>
                    <option value="dbscan">DBSCAN (Density-Based Spatial Density Reachability)</option>
                    <option value="optics">OPTICS (Ordering Points To Identify Clustering Structure)</option>
                    <option value="gaussian_mixture">Gaussian Mixture Models (EM Soft Probabilistic Clustering)</option>
                    <option value="mean_shift">Mean Shift Clustering (Kernel Mode-Seeking Ascent)</option>
                    <option value="birch">BIRCH Clustering (Balanced CF Tree Hierarchy)</option>
                    <option value="spectral_clustering">Spectral Clustering (Graph Laplacian Eigenmaps)</option>
                    <option value="fuzzy_c_means">Fuzzy C-Means (Soft Membership Degree Matrix)</option>
                  </>
                )}
              </select>
            </div>

            {/* Target Column (for supervised) */}
            {modelType !== 'clustering' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Target Variable to Predict (Y)
                </label>
                <select
                  aria-label="Select target column"
                  value={targetColumn}
                  onChange={(e) => {
                    setTargetColumn(e.target.value);
                    setFeatureColumns((prev) => prev.filter((c) => c !== e.target.value));
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {dataset.columnsMeta.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.type}, {c.uniqueCount} values)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* K-Means Clusters count */}
            {modelType === 'clustering' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Number of Clusters (K): {clustersCount}
                </label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={clustersCount}
                  onChange={(e) => setClustersCount(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            {/* Input Features Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800">
                  Input Features ({featureColumns.length})
                </label>
                <div className="space-x-2 text-[11px] text-indigo-600">
                  <button
                    type="button"
                    onClick={() =>
                      setFeatureColumns(
                        dataset.columnsMeta.filter((c) => c.name !== targetColumn).map((c) => c.name)
                      )
                    }
                    className="hover:underline font-semibold"
                  >
                    All
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFeatureColumns(
                        dataset.columnsMeta
                          .filter((c) => c.type === 'numeric' && c.name !== targetColumn)
                          .map((c) => c.name)
                      )
                    }
                    className="hover:underline font-semibold"
                  >
                    Numeric
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setFeatureColumns([])}
                    className="text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50/50">
                {dataset.columnsMeta
                  .filter((c) => c.name !== targetColumn)
                  .map((col) => {
                    const isChecked = featureColumns.includes(col.name);
                    return (
                      <label
                        key={col.name}
                        className={`flex items-center space-x-2 rounded p-1.5 text-[11px] cursor-pointer ${
                          isChecked ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFeature(col.name)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                        />
                        <span className="truncate font-mono">{col.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Error Message */}
            {trainError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{trainError}</span>
              </div>
            )}

            {/* Train Trigger */}
            <button
              type="button"
              onClick={handleTrain}
              disabled={training}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {training ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  <span>Fitting Model on Dataset Instances...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Train &amp; Evaluate Model</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 2 & 3: Model Metrics & Live Playground (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 2: Evaluation Metrics */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-900">Validation &amp; Model Performance</h2>
              </div>
              {trainedModel && (
                <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Model Fitted</span>
                </span>
              )}
            </div>

            {!trainedModel ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Click "Train &amp; Evaluate Model" to view hold-out validation scores, confusion matrices, and metrics.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {trainedModel.metrics.accuracy !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">Accuracy</span>
                      <p className="text-lg font-bold text-indigo-700 font-mono mt-0.5">
                        {(trainedModel.metrics.accuracy * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {trainedModel.metrics.precision !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">Precision</span>
                      <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                        {(trainedModel.metrics.precision * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {trainedModel.metrics.recall !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">Recall</span>
                      <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                        {(trainedModel.metrics.recall * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {trainedModel.metrics.f1Score !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">F1-Score</span>
                      <p className="text-lg font-bold text-emerald-600 font-mono mt-0.5">
                        {(trainedModel.metrics.f1Score * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {trainedModel.metrics.r2 !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">R² Score</span>
                      <p className="text-lg font-bold text-indigo-700 font-mono mt-0.5">
                        {trainedModel.metrics.r2.toFixed(3)}
                      </p>
                    </div>
                  )}
                  {trainedModel.metrics.rmse !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">RMSE</span>
                      <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                        {trainedModel.metrics.rmse.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {trainedModel.metrics.mae !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">MAE</span>
                      <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                        {trainedModel.metrics.mae.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {trainedModel.metrics.silhouetteScore !== undefined && (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">Silhouette</span>
                      <p className="text-lg font-bold text-indigo-700 font-mono mt-0.5">
                        {trainedModel.metrics.silhouetteScore.toFixed(3)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Sample and Split Stats */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono">
                  <span>Train Samples: {trainedModel.metrics.trainCount ?? '-'}</span>
                  <span>Test Samples: {trainedModel.metrics.testCount ?? '-'}</span>
                  <span>Total: {trainedModel.metrics.sampleCount ?? '-'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Live Simulator */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                  3
                </span>
                <h2 className="text-sm font-bold text-slate-900">Live Prediction Simulator</h2>
              </div>
            </div>

            {!trainedModel ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Train a model above to activate the live prediction simulator.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Modify input features below to simulate real-time model inference:
                </p>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
                  {trainedModel.featureColumns.map((feat: string) => {
                    const meta = dataset.columnsMeta.find((c) => c.name === feat);
                    const isNum = meta?.type === 'numeric';

                    return (
                      <div key={feat} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-mono font-semibold text-slate-800 text-[11px] truncate" title={feat}>
                            {feat}
                          </label>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {meta?.type?.slice(0, 3) || 'val'}
                          </span>
                        </div>
                        {isNum ? (
                          <input
                            type="number"
                            value={inferenceInput[feat] ?? 0}
                            onChange={(e) =>
                              setInferenceInput((prev) => ({
                                ...prev,
                                [feat]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <select
                            value={inferenceInput[feat] || ''}
                            onChange={(e) =>
                              setInferenceInput((prev) => ({
                                ...prev,
                                [feat]: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {(meta?.stats?.topValues || []).map((tv: { value: string; count: number }) => (
                              <option key={String(tv.value)} value={String(tv.value)}>
                                {String(tv.value)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>

                {predictError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                    {predictError}
                  </div>
                )}

                {/* Predict Button */}
                <button
                  type="button"
                  onClick={handlePredict}
                  disabled={predicting}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>{predicting ? 'Calculating Inference...' : 'Generate Prediction'}</span>
                </button>

                {/* Outcome Display */}
                {predictionResult && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
                    <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">
                      Predicted Result
                    </span>
                    <div className="flex items-baseline space-x-3">
                      <span className="text-2xl font-bold text-slate-900 font-mono">
                        {String(predictionResult.prediction)}
                      </span>
                      {predictionResult.confidence !== undefined && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {(predictionResult.confidence * 100).toFixed(1)}% Confidence
                        </span>
                      )}
                      {predictionResult.clusterIndex !== undefined && (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          Cluster Group #{predictionResult.clusterIndex}
                        </span>
                      )}
                    </div>
                    {predictionResult.explanations && predictionResult.explanations.length > 0 && (
                      <div className="text-xs text-slate-600 pt-2 border-t border-indigo-100 space-y-1">
                        <span className="font-semibold text-slate-700 block text-[11px]">Key Influencing Features:</span>
                        <div className="flex flex-wrap gap-2">
                          {predictionResult.explanations.slice(0, 3).map((exp, i) => (
                            <span key={i} className="inline-flex items-center bg-white px-2 py-0.5 rounded border border-indigo-100 font-mono text-[11px]">
                              {exp.feature}: {exp.contribution > 0 ? `+${exp.contribution.toFixed(2)}` : exp.contribution.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Studio Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        dataset={dataset}
        activeModel={trainedModel}
        models={trainedModel ? [trainedModel] : []}
      />
    </div>
  );
};
