import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  BrainCircuit,
  AlertCircle,
  RefreshCw,
  Info,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { DatasetDetail, AnalyticsInsights } from '../types.ts';
import { api } from '../lib/api.ts';
import { AnalyticsBarChart } from './AnalyticsBarChart.tsx';
import { AnalyticsPieChart } from './AnalyticsPieChart.tsx';
import { ExportModal } from './ExportModal.tsx';

interface DashboardViewProps {
  dataset: DatasetDetail | null;
  onNavigate: (tab: 'predictions') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ dataset, onNavigate }) => {
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedX, setSelectedX] = useState<string>('');
  const [selectedY, setSelectedY] = useState<string>('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string; val: number } | null>(null);

  useEffect(() => {
    if (dataset) {
      loadInsights();
    }
  }, [dataset?.id]);

  const loadInsights = async () => {
    if (!dataset) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.insights.get(dataset.id);
      setInsights(data);
      if (data.correlation.features.length >= 2) {
        setSelectedX(data.correlation.features[0]);
        setSelectedY(data.correlation.features[1]);
      } else if (data.correlation.features.length === 1) {
        setSelectedX(data.correlation.features[0]);
        setSelectedY(data.correlation.features[0]);
      }
    } catch (err: any) {
      console.error('Failed to load insights:', err);
      setError(err?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  if (!dataset) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-bold text-slate-800">No Dataset Selected</p>
        <p className="text-xs text-slate-500 mt-1">Please select a dataset from the Datasets tab to view insights.</p>
      </div>
    );
  }

  // Helper for correlation color
  const getCorrBg = (r: number) => {
    if (r >= 0.7) return 'bg-indigo-600 text-white font-bold';
    if (r >= 0.4) return 'bg-indigo-400 text-slate-900 font-semibold';
    if (r >= 0.1) return 'bg-indigo-100 text-indigo-950 font-medium';
    if (r <= -0.7) return 'bg-rose-600 text-white font-bold';
    if (r <= -0.4) return 'bg-rose-400 text-slate-900 font-semibold';
    if (r <= -0.1) return 'bg-rose-100 text-rose-950 font-medium';
    return 'bg-slate-50 text-slate-600';
  };

  // Compute scatter data points from dataset preview
  const scatterPoints = (dataset.preview || [])
    .map((row) => ({
      x: Number(row[selectedX]) || 0,
      y: Number(row[selectedY]) || 0,
    }))
    .filter((p) => !isNaN(p.x) && !isNaN(p.y));

  const minX = scatterPoints.length ? Math.min(...scatterPoints.map((p) => p.x)) : 0;
  const maxX = scatterPoints.length ? Math.max(...scatterPoints.map((p) => p.x)) : 100;
  const minY = scatterPoints.length ? Math.min(...scatterPoints.map((p) => p.y)) : 0;
  const maxY = scatterPoints.length ? Math.max(...scatterPoints.map((p) => p.y)) : 100;

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Analytics &amp; Automated Insights</h1>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-semibold">
              {dataset.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multivariate correlation matrices, bivariate scatter distributions, and algorithmic dataset intelligence.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('predictions')}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            <span>Train Predictive Model</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Failed to load insights: {error}</span>
          </div>
          <button
            type="button"
            onClick={loadInsights}
            className="inline-flex items-center space-x-1 rounded-lg bg-slate-900 px-3 py-1 text-white text-xs font-semibold hover:bg-slate-800 self-start sm:self-auto"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Loading</span>
          </button>
        </div>
      )}

      {/* Automated ML Insights Banner */}
      {insights && insights.automatedInsights.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-sky-50/60 p-5 shadow-xs">
          <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs mb-3">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>AUTOMATED DATASET INTELLIGENCE &amp; RECOMMENDATIONS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.automatedInsights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-xs text-slate-700 flex items-start space-x-3"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="leading-relaxed font-sans">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Correlation Matrix & Bivariate Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Correlation Matrix */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Pearson Correlation Matrix</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Range: -1.0 to +1.0</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" />
                <span>Computing correlation matrix...</span>
              </div>
            ) : error || !insights ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-3">
                <p>Correlation data is currently unavailable.</p>
                <button
                  type="button"
                  onClick={loadInsights}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white text-xs font-semibold"
                >
                  Reload Matrix
                </button>
              </div>
            ) : insights.correlation.features.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No numeric features available for correlation analysis.
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="inline-block min-w-full">
                  <div className="flex">
                    <div className="w-24 shrink-0" />
                    {insights.correlation.features.map((col) => (
                      <div
                        key={col}
                        className="w-16 shrink-0 text-center text-[10px] font-mono font-semibold text-slate-600 truncate px-1"
                        title={col}
                      >
                        {col}
                      </div>
                    ))}
                  </div>

                  {insights.correlation.features.map((rowName, rIdx) => (
                    <div key={rowName} className="flex items-center mt-1">
                      <div
                        className="w-24 shrink-0 text-right pr-2 text-[10px] font-mono font-semibold text-slate-700 truncate"
                        title={rowName}
                      >
                        {rowName}
                      </div>
                      {insights.correlation.features.map((colName, cIdx) => {
                        const val = insights.correlation.matrix[rIdx][cIdx];
                        return (
                          <div
                            key={colName}
                            onMouseEnter={() => setHoveredCell({ row: rowName, col: colName, val })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              setSelectedX(rowName);
                              setSelectedY(colName);
                            }}
                            className={`w-16 h-8 shrink-0 flex items-center justify-center text-[11px] font-mono rounded cursor-pointer transition-all border border-slate-100 ${getCorrBg(
                              val
                            )}`}
                            title={`${rowName} vs ${colName}: r = ${val}`}
                          >
                            {val.toFixed(2)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color Legend & Hover Details */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px]">Legend:</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-rose-600 text-white font-semibold">
                -1.0
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                0.0
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-indigo-600 text-white font-semibold">
                +1.0
              </span>
            </div>
            {hoveredCell ? (
              <span className="font-mono text-indigo-700 font-semibold text-[11px]">
                {hoveredCell.row} × {hoveredCell.col}: {hoveredCell.val} (Click to plot)
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Hover cell to view details, click to plot scatter</span>
            )}
          </div>
        </div>

        {/* Right: Bivariate Scatter Plot */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Bivariate Distribution Plot</h2>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  aria-label="Scatter plot X-axis variable"
                  value={selectedX}
                  onChange={(e) => setSelectedX(e.target.value)}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-mono text-slate-700"
                >
                  {(insights?.correlation.features || []).map((f) => (
                    <option key={f} value={f}>
                      X: {f}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Scatter plot Y-axis variable"
                  value={selectedY}
                  onChange={(e) => setSelectedY(e.target.value)}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-mono text-slate-700"
                >
                  {(insights?.correlation.features || []).map((f) => (
                    <option key={f} value={f}>
                      Y: {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scatter SVG Canvas */}
            <div className="mt-4 relative h-64 w-full rounded-lg bg-slate-50 border border-slate-100 p-2 overflow-hidden flex items-center justify-center">
              {scatterPoints.length === 0 ? (
                <span className="text-xs text-slate-400">Select numeric features to view scatter distribution</span>
              ) : (
                <svg className="h-full w-full" viewBox="0 0 400 240">
                  {/* Grid lines */}
                  <line x1="40" y1="20" x2="40" y2="210" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="40" y1="210" x2="380" y2="210" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="40" y1="115" x2="380" y2="115" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="210" y1="20" x2="210" y2="210" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Scatter Dots */}
                  {scatterPoints.slice(0, 150).map((pt, i) => {
                    const cx = 45 + ((pt.x - minX) / rangeX) * 320;
                    const cy = 205 - ((pt.y - minY) / rangeY) * 180;
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="3.5"
                        className="fill-indigo-600/80 hover:fill-amber-500 transition-colors"
                      >
                        <title>{`${selectedX}: ${pt.x}, ${selectedY}: ${pt.y}`}</title>
                      </circle>
                    );
                  })}

                  {/* Axis labels */}
                  <text x="380" y="225" textAnchor="end" className="text-[9px] fill-slate-500 font-mono font-semibold">
                    {selectedX} ({maxX.toFixed(0)})
                  </text>
                  <text x="35" y="25" textAnchor="end" className="text-[9px] fill-slate-500 font-mono font-semibold">
                    {selectedY} ({maxY.toFixed(0)})
                  </text>
                  <text x="40" y="225" textAnchor="start" className="text-[9px] fill-slate-400 font-mono">
                    {minX.toFixed(0)}
                  </text>
                  <text x="35" y="210" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                    {minY.toFixed(0)}
                  </text>
                </svg>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {Math.min(150, scatterPoints.length)} sampled instances</span>
            <span className="font-mono text-slate-600">
              {selectedX && selectedY ? `${selectedX} vs ${selectedY}` : 'Select variables'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Distributions: Bar Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsBarChart
          columnsMeta={dataset.columnsMeta}
          rows={dataset.preview || []}
          totalRowCount={dataset.rowCount}
        />
        <AnalyticsPieChart
          columnsMeta={dataset.columnsMeta}
          rows={dataset.preview || []}
          totalRowCount={dataset.rowCount}
        />
      </div>

      {/* Export Analysis & Bundle Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        dataset={dataset}
        insights={insights}
      />
    </div>
  );
};
