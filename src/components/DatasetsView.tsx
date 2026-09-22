import React, { useState, useRef } from 'react';
import {
  Upload,
  Database,
  ArrowRight,
  Plus,
  Layers,
  Sparkles,
  Sliders,
  BrainCircuit,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  BarChart3,
  Search,
} from 'lucide-react';
import { DatasetSummary } from '../types.ts';
import { api } from '../lib/api.ts';

interface DatasetsViewProps {
  datasets: DatasetSummary[];
  selectedDatasetId: number | null;
  onSelectDataset: (id: number) => void;
  onNavigate: (tab: 'features' | 'etl' | 'dashboard' | 'predictions') => void;
  onRefreshDatasets: () => Promise<void>;
}

export const DatasetsView: React.FC<DatasetsViewProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onNavigate,
  onRefreshDatasets,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalRows = datasets.reduce((sum, d) => sum + d.row_count, 0);

  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      setUploadError('Only CSV or JSON datasets are supported.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.datasets.uploadFile(formData);
      setUploadSuccess(`Dataset "${res.dataset.name}" successfully imported (${res.dataset.row_count} rows).`);
      await onRefreshDatasets();
      onSelectDataset(res.dataset.id);
    } catch (err: any) {
      setUploadError(err.message || 'Dataset upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This removes its records and models.`)) {
      return;
    }
    try {
      await api.datasets.delete(id);
      await onRefreshDatasets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete dataset');
    }
  };

  const filteredDatasets = datasets.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30 mb-3">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              <span>Persistent Analytics Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Dataset Repository &amp; Workspaces
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Upload your raw data or choose from benchmark machine learning datasets. Clean features, run exploratory data analysis, and train predictive models with one click.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3 text-center min-w-[100px]">
              <span className="text-2xl font-bold text-white block">{datasets.length}</span>
              <span className="text-xs text-slate-300">Datasets</span>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3 text-center min-w-[110px]">
              <span className="text-2xl font-bold text-emerald-400 block">{totalRows.toLocaleString()}</span>
              <span className="text-xs text-slate-300">Total Rows</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50 shadow-2xs'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
              accept=".csv,.json"
              className="hidden"
            />
            <div className="rounded-full bg-indigo-50 p-3 text-indigo-600 mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {isUploading ? 'Importing Dataset...' : 'Upload New Dataset'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Drag and drop your CSV or JSON file here, or click to browse files.
            </p>
            <span className="inline-flex items-center space-x-1 mt-4 text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-0.5">
              <span>Supports .csv &amp; .json</span>
            </span>
          </div>

          {/* Feedback messages */}
          {uploadError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </div>

        {/* Datasets List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">Available Datasets</h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {filteredDatasets.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No datasets found</p>
              <p className="text-xs text-slate-500 mt-1">Upload a CSV dataset or adjust your search filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDatasets.map((d) => {
                const isSelected = d.id === selectedDatasetId;

                return (
                  <div
                    key={d.id}
                    className={`rounded-xl border transition-all p-5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                          {isSelected && (
                            <span className="inline-flex items-center space-x-1 rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                          {d.description || 'Preloaded benchmark dataset for analytics and predictive machine learning.'}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2 font-mono">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                            {d.row_count.toLocaleString()} rows
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                            {d.column_count} columns
                          </span>
                          <span className="text-slate-400 text-[11px] hidden sm:inline">
                            File: {d.filename}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 self-start sm:self-center">
                        {!isSelected ? (
                          <button
                            type="button"
                            onClick={() => onSelectDataset(d.id)}
                            className="inline-flex items-center space-x-1 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                          >
                            <span>Select</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigate('features')}
                              className="rounded-lg bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors"
                            >
                              Explore Data
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('etl')}
                              className="rounded-lg bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors"
                            >
                              ETL Prep
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('dashboard')}
                              className="rounded-lg bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors"
                            >
                              Insights
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('predictions')}
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
                            >
                              Train Model
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(d.id, d.name)}
                          title="Delete Dataset"
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
