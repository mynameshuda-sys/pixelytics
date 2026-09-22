import React, { useState } from 'react';
import {
  Table,
  Columns,
  Hash,
  Search,
  ChevronRight,
  BarChart2,
  AlertCircle,
  Filter,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { DatasetDetail, ColumnMeta } from '../types.ts';

interface FeaturesInstancesViewProps {
  dataset: DatasetDetail | null;
  onRefresh: () => Promise<void>;
}

export const FeaturesInstancesView: React.FC<FeaturesInstancesViewProps> = ({ dataset, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'features' | 'instances'>('features');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<ColumnMeta | null>(null);
  const [instanceSearch, setInstanceSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  if (!dataset) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-bold text-slate-800">No Dataset Selected</p>
        <p className="text-xs text-slate-500 mt-1">Please select a dataset from the Datasets tab to explore features.</p>
      </div>
    );
  }

  const filteredColumns = dataset.columnsMeta.filter((col) =>
    col.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const numericCols = dataset.columnsMeta.filter((c) => c.type === 'numeric');
  const categoricalCols = dataset.columnsMeta.filter((c) => c.type === 'categorical');
  const missingCols = dataset.columnsMeta.filter((c) => c.missingCount > 0);

  // Instances filtering & pagination
  const filteredInstances = (dataset.preview || []).filter((row) => {
    if (!instanceSearch) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(instanceSearch.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredInstances.length / rowsPerPage) || 1;
  const paginatedInstances = filteredInstances.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">{dataset.name}</h1>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-semibold">
              ID #{dataset.id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Schema dictionary, feature summaries, and row-level instance browser.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('features')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'features'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Features ({dataset.columnCount})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('instances')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'instances'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Instances ({dataset.rowCount.toLocaleString()})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Instances</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{dataset.rowCount.toLocaleString()}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Active Dataset</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Features</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{dataset.columnCount}</p>
          <span className="text-[11px] text-slate-500 font-medium">Columns in table</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Numeric Features</span>
          <p className="text-xl font-bold text-indigo-600 mt-1">{numericCols.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">Continuous/quant variables</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Categorical Features</span>
          <p className="text-xl font-bold text-amber-600 mt-1">{categoricalCols.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">Text/ordinal groups</span>
        </div>
      </div>

      {/* SUBTAB 1: Features Schema Dictionary */}
      {activeSubTab === 'features' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-900">Feature Schema Breakdown</h2>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter feature names..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Feature Name</th>
                      <th className="p-3">Data Type</th>
                      <th className="p-3">Missing Values</th>
                      <th className="p-3">Unique Values</th>
                      <th className="p-3 text-right">Summary Stat</th>
                      <th className="p-3 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredColumns.map((col) => {
                      const isSelected = selectedColumn?.name === col.name;

                      return (
                        <tr
                          key={col.name}
                          onClick={() => setSelectedColumn(col)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 font-semibold text-slate-900 font-mono">{col.name}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                col.type === 'numeric'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {col.type}
                            </span>
                          </td>
                          <td className="p-3">
                            {col.missingCount === 0 ? (
                              <span className="text-emerald-600 font-semibold">0 (Clean)</span>
                            ) : (
                              <span className="text-rose-600 font-semibold">
                                {col.missingCount} ({col.missingPercentage}%)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 font-mono">{col.uniqueCount}</td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {col.type === 'numeric' && col.stats?.mean !== undefined
                              ? `Mean: ${col.stats.mean.toFixed(2)}`
                              : `Mode: ${String(col.stats?.mode || 'N/A')}`}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-slate-400 hover:text-indigo-600">
                              <ChevronRight className="h-4 w-4 mx-auto" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Feature Detail Inspector Sidebar */}
          <div className="lg:col-span-1">
            {selectedColumn ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 sticky top-20">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                      Feature Details
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        selectedColumn.type === 'numeric'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {selectedColumn.type}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-mono mt-1">
                    {selectedColumn.name}
                  </h3>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-500 block">Missing Count</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {selectedColumn.missingCount} ({selectedColumn.missingPercentage}%)
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-500 block">Distinct Values</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {selectedColumn.uniqueCount}
                    </span>
                  </div>
                </div>

                {/* Numeric Distribution Stats */}
                {selectedColumn.type === 'numeric' && selectedColumn.stats && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700 block">Distribution Stats</span>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="rounded bg-slate-50 p-2">
                        <span className="text-slate-400 text-[10px] block">Mean</span>
                        <span className="font-semibold">{selectedColumn.stats.mean?.toFixed(2) ?? '-'}</span>
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        <span className="text-slate-400 text-[10px] block">Median (Q50)</span>
                        <span className="font-semibold">{selectedColumn.stats.median?.toFixed(2) ?? '-'}</span>
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        <span className="text-slate-400 text-[10px] block">Std Dev</span>
                        <span className="font-semibold">{selectedColumn.stats.std?.toFixed(2) ?? '-'}</span>
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        <span className="text-slate-400 text-[10px] block">Min / Max</span>
                        <span className="font-semibold">
                          {selectedColumn.stats.min} .. {selectedColumn.stats.max}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Values Histogram / Frequency */}
                {selectedColumn.stats?.topValues && selectedColumn.stats.topValues.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700 block">Top Value Frequency</span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedColumn.stats.topValues.slice(0, 8).map((tv: { value: string; count: number }) => {
                        const pct = Math.round((tv.count / dataset.rowCount) * 100);
                        return (
                          <div key={String(tv.value)} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono text-slate-800 truncate max-w-[140px]" title={String(tv.value)}>
                                {String(tv.value)}
                              </span>
                              <span className="text-slate-500 font-mono">{tv.count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
                Select a column from the list to view its statistical distribution, quartiles, and frequency histogram.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Instances Data Grid */}
      {activeSubTab === 'instances' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Instance Explorer</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displaying dataset table instances with live search and paging.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in rows..."
                  value={instanceSearch}
                  onChange={(e) => {
                    setInstanceSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-52"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 z-10 font-sans">
                <tr>
                  <th className="p-3 border-r border-slate-200 w-12 text-center text-slate-400">#</th>
                  {dataset.columnsMeta.map((c) => (
                    <th key={c.name} className="p-3 border-r border-slate-200 font-semibold whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span>{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal uppercase">
                          ({c.type.slice(0, 3)})
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInstances.map((row, idx) => {
                  const absoluteIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-2.5 border-r border-slate-100 text-center text-slate-400 text-[11px]">
                        {absoluteIdx}
                      </td>
                      {dataset.columnsMeta.map((c) => (
                        <td key={c.name} className="p-2.5 border-r border-slate-100 text-slate-800 truncate max-w-xs">
                          {String(row[c.name] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, filteredInstances.length)} of{' '}
              {filteredInstances.length} rows
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
