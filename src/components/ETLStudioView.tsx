import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Filter,
  ArrowDownUp,
  Tag,
  Scissors,
  Check,
} from 'lucide-react';
import { DatasetDetail, ETLStep } from '../types.ts';
import { api } from '../lib/api.ts';

interface ETLStudioViewProps {
  dataset: DatasetDetail | null;
  onRefreshDataset: () => Promise<void>;
  onNavigate: (tab: 'dashboard' | 'predictions') => void;
}

export const ETLStudioView: React.FC<ETLStudioViewProps> = ({
  dataset,
  onRefreshDataset,
  onNavigate,
}) => {
  const [action, setAction] = useState<
    'impute_missing' | 'encode_categorical' | 'scale_features' | 'remove_outliers' | 'drop_columns'
  >('impute_missing');

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<string>('mean');
  const [constantValue, setConstantValue] = useState<string>('0');
  const [threshold, setThreshold] = useState<number>(1.5);
  const [historySteps, setHistorySteps] = useState<ETLStep[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (dataset) {
      loadHistory();
      updateDefaultColumns(action);
    }
  }, [dataset?.id, action]);

  const loadHistory = async () => {
    if (!dataset) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const steps = await api.etl.history(dataset.id);
      setHistorySteps(steps);
    } catch (err: any) {
      console.error('Failed to load ETL history:', err);
      setHistoryError(err?.message || 'Failed to load ETL history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateDefaultColumns = (act: string) => {
    if (!dataset) return;
    if (act === 'impute_missing') {
      const missing = dataset.columnsMeta.filter((c) => c.missingCount > 0).map((c) => c.name);
      setSelectedColumns(missing.length > 0 ? missing : [dataset.columnsMeta[0]?.name].filter(Boolean));
      setStrategy('mean');
    } else if (act === 'encode_categorical') {
      const cats = dataset.columnsMeta.filter((c) => c.type === 'categorical').map((c) => c.name);
      setSelectedColumns(cats.slice(0, 3));
      setStrategy('one_hot');
    } else if (act === 'scale_features') {
      const nums = dataset.columnsMeta.filter((c) => c.type === 'numeric').map((c) => c.name);
      setSelectedColumns(nums.slice(0, 4));
      setStrategy('standard');
    } else if (act === 'remove_outliers') {
      const nums = dataset.columnsMeta.filter((c) => c.type === 'numeric').map((c) => c.name);
      setSelectedColumns(nums.slice(0, 2));
      setThreshold(1.5);
    } else if (act === 'drop_columns') {
      setSelectedColumns([]);
    }
  };

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const selectAll = (type?: 'numeric' | 'categorical') => {
    if (!dataset) return;
    if (!type) {
      setSelectedColumns(dataset.columnsMeta.map((c) => c.name));
    } else {
      setSelectedColumns(dataset.columnsMeta.filter((c) => c.type === type).map((c) => c.name));
    }
  };

  const clearSelection = () => {
    setSelectedColumns([]);
  };

  const handleApply = async () => {
    if (!dataset) return;
    if (selectedColumns.length === 0) {
      setError('Please select at least one column to transform.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.etl.transform({
        datasetId: dataset.id,
        action,
        columns: selectedColumns,
        strategy,
        constantValue,
        threshold,
      });

      setSuccessMsg(res.summary);
      await onRefreshDataset();
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'ETL transformation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!dataset) return;
    if (!confirm('Restore dataset to its original raw state? All ETL transformation steps will be reverted.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.etl.reset(dataset.id);
      setSuccessMsg('Dataset successfully reverted to initial raw state.');
      await onRefreshDataset();
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to reset dataset');
    } finally {
      setLoading(false);
    }
  };

  if (!dataset) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-bold text-slate-800">No Dataset Selected</p>
        <p className="text-xs text-slate-500 mt-1">Select a dataset from the Datasets tab to perform ETL.</p>
      </div>
    );
  }

  const missingValuesCount = dataset.columnsMeta.reduce((sum, c) => sum + c.missingCount, 0);

  const actionTabs = [
    {
      id: 'impute_missing',
      title: 'Missing Values',
      desc: 'Impute or drop nulls',
      icon: Filter,
    },
    {
      id: 'encode_categorical',
      title: 'Categorical Encoding',
      desc: 'One-hot or label encode',
      icon: Tag,
    },
    {
      id: 'scale_features',
      title: 'Feature Scaling',
      desc: 'Standardize or normalize',
      icon: ArrowDownUp,
    },
    {
      id: 'remove_outliers',
      title: 'Outlier Trimming',
      desc: 'IQR interquartile filter',
      icon: Scissors,
    },
    {
      id: 'drop_columns',
      title: 'Drop Columns',
      desc: 'Remove unwanted features',
      icon: Scissors,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">ETL Preprocessing Studio</h1>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-semibold">
              {dataset.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data cleansing, imputation, feature engineering, and automated transformation pipeline.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Raw Data</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <span>View Insights</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Dataset Health Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Instances</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{dataset.rowCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Features</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{dataset.columnCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Missing Values</span>
          <p className={`text-xl font-bold mt-0.5 ${missingValuesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {missingValuesCount === 0 ? '0 (Clean)' : `${missingValuesCount.toLocaleString()} values`}
          </p>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Operation & Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operation Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {actionTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = action === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAction(tab.id as any)}
                  className={`rounded-xl p-3 text-left border transition-all ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <p className={`text-xs font-bold leading-snug ${isActive ? 'text-indigo-950' : 'text-slate-800'}`}>
                    {tab.title}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{tab.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Operation Config Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            {/* Feedback Alerts */}
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Strategy Options depending on action */}
            {action === 'impute_missing' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 block">Imputation Strategy</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'mean', label: 'Mean', desc: 'Average for numerics' },
                    { val: 'median', label: 'Median', desc: 'Robust to outliers' },
                    { val: 'mode', label: 'Mode', desc: 'Most frequent' },
                    { val: 'drop', label: 'Drop Rows', desc: 'Remove null rows' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setStrategy(opt.val)}
                      className={`rounded-lg border p-2.5 text-left transition-all ${
                        strategy === opt.val
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[10px] text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {action === 'encode_categorical' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 block">Encoding Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      val: 'one_hot',
                      label: 'One-Hot Encoding',
                      desc: 'Creates binary 0/1 indicator columns for each category (Best for linear models)',
                    },
                    {
                      val: 'label',
                      label: 'Label / Ordinal Encoding',
                      desc: 'Converts categories into integer indexes 0, 1, 2... (Best for tree models)',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setStrategy(opt.val)}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        strategy === opt.val
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {action === 'scale_features' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 block">Scaling Algorithm</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      val: 'standard',
                      label: 'StandardScaler (Z-Score)',
                      desc: 'Standardizes to mean = 0, variance = 1. Ideal for regression and gradient descent.',
                    },
                    {
                      val: 'minmax',
                      label: 'MinMaxScaler (0 to 1)',
                      desc: 'Compresses values strictly into [0, 1] range. Preserves non-negative distributions.',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setStrategy(opt.val)}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        strategy === opt.val
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {action === 'remove_outliers' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 block">
                  IQR Outlier Threshold (Multiplier: {threshold}x IQR)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold font-mono">
                    {threshold}x
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Standard Tukey rule uses 1.5x IQR. Higher values (e.g. 2.5x) are more conservative and trim fewer instances.
                </p>
              </div>
            )}

            {/* Target Columns Selection */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-xs font-bold text-slate-800">
                  Select Columns to Transform ({selectedColumns.length} selected)
                </label>
                <div className="flex items-center space-x-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => selectAll()}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => selectAll('numeric')}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    Numeric Only
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => selectAll('categorical')}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    Categorical Only
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                {dataset.columnsMeta.map((col) => {
                  const isChecked = selectedColumns.includes(col.name);

                  return (
                    <label
                      key={col.name}
                      className={`flex items-center space-x-2 rounded-lg border p-2.5 text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/40 text-indigo-950 font-semibold'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleColumn(col.name)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="truncate font-mono">{col.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-normal ml-auto">
                        {col.type.slice(0, 3)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleApply}
                disabled={loading || selectedColumns.length === 0}
                className="inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{loading ? 'Executing Pipeline...' : 'Apply Transformation Step'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Chronological Audit Trail */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span>Pipeline Transformation Log</span>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {historySteps.length} Steps
              </span>
            </div>

            {historyLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" />
                <span>Loading pipeline audit trail...</span>
              </div>
            ) : historyError ? (
              <div className="py-6 text-center text-rose-600 text-xs space-y-2">
                <p>{historyError}</p>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="rounded-lg bg-slate-900 text-white px-3 py-1 text-xs font-semibold"
                >
                  Retry Loading Log
                </button>
              </div>
            ) : historySteps.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No transformations executed yet. Dataset currently in original raw state.
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {historySteps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-600 font-mono">
                        Step #{step.stepNumber}
                      </span>
                      <span className="text-slate-400">
                        {new Date(step.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 capitalize">
                      {step.actionType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                      {step.details?.summary || 'Executed ETL step'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
