import React, { useState, useMemo } from 'react';
import { BarChart3, Sliders, Filter } from 'lucide-react';
import { ColumnMeta } from '../types.ts';

interface AnalyticsBarChartProps {
  columnsMeta: ColumnMeta[];
  rows: Record<string, any>[];
  totalRowCount: number;
}

export const AnalyticsBarChart: React.FC<AnalyticsBarChartProps> = ({
  columnsMeta,
  rows,
  totalRowCount,
}) => {
  // Default to first categorical column or first column
  const defaultCol = useMemo(() => {
    const cat = columnsMeta.find((c) => c.type === 'categorical' || c.uniqueCount <= 10);
    return cat ? cat.name : columnsMeta[0]?.name || '';
  }, [columnsMeta]);

  const [selectedColumn, setSelectedColumn] = useState<string>(defaultCol);
  const [hoveredBar, setHoveredBar] = useState<{ label: string; count: number; pct: number } | null>(null);

  // Update selectedColumn if defaultCol changes
  React.useEffect(() => {
    if (!selectedColumn && defaultCol) {
      setSelectedColumn(defaultCol);
    }
  }, [defaultCol, selectedColumn]);

  const activeMeta = useMemo(
    () => columnsMeta.find((c) => c.name === selectedColumn),
    [columnsMeta, selectedColumn]
  );

  // Compute bar data
  const barData = useMemo(() => {
    if (!selectedColumn || !rows.length) return [];

    const isNumeric = activeMeta?.type === 'numeric' && (activeMeta?.uniqueCount ?? 0) > 10;

    if (isNumeric) {
      // Build Histogram Bins for continuous numeric column
      const values = rows
        .map((r) => Number(r[selectedColumn]))
        .filter((v) => !isNaN(v) && v !== null && v !== undefined);

      if (!values.length) return [];

      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(8, Math.max(5, Math.floor(Math.sqrt(values.length))));
      const step = (max - min) / binCount || 1;

      const bins: { label: string; count: number; pct: number; range: [number, number] }[] = [];
      for (let i = 0; i < binCount; i++) {
        const binMin = min + i * step;
        const binMax = i === binCount - 1 ? max : min + (i + 1) * step;
        const count = values.filter((v) => (i === binCount - 1 ? v >= binMin && v <= binMax : v >= binMin && v < binMax)).length;
        const pct = values.length ? Math.round((count / values.length) * 1000) / 10 : 0;
        const label = `${binMin.toFixed(binMin >= 100 ? 0 : 1)} - ${binMax.toFixed(binMax >= 100 ? 0 : 1)}`;
        bins.push({ label, count, pct, range: [binMin, binMax] });
      }
      return bins;
    } else {
      // Frequency counts for Categorical or discrete column
      const countMap: Record<string, number> = {};
      let totalValid = 0;

      rows.forEach((r) => {
        const raw = r[selectedColumn];
        const valStr = raw === null || raw === undefined || raw === '' ? '(Missing)' : String(raw);
        countMap[valStr] = (countMap[valStr] || 0) + 1;
        totalValid++;
      });

      return Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({
          label,
          count,
          pct: totalValid ? Math.round((count / totalValid) * 1000) / 10 : 0,
        }));
    }
  }, [selectedColumn, rows, activeMeta]);

  const maxCount = useMemo(() => {
    return barData.length ? Math.max(...barData.map((b) => b.count)) : 1;
  }, [barData]);

  // Chart dimensions
  const svgWidth = 500;
  const svgHeight = 240;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 45;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header with column selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Feature Distribution Bar Chart</h2>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Feature:</span>
            <select
              aria-label="Select feature for distribution bar chart"
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-mono text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {columnsMeta.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type === 'numeric' ? 'Num' : 'Cat'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info strip */}
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-semibold text-slate-700">{selectedColumn}</span>
            <span>·</span>
            <span>{activeMeta?.type === 'numeric' && (activeMeta?.uniqueCount ?? 0) > 10 ? 'Histogram Bins' : 'Category Frequencies'}</span>
          </div>
          {hoveredBar ? (
            <span className="font-mono font-semibold text-indigo-700 text-[11px]">
              {hoveredBar.label}: {hoveredBar.count} ({hoveredBar.pct}%)
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Hover bar for details</span>
          )}
        </div>

        {/* SVG Bar Chart Canvas */}
        <div className="mt-3 relative h-60 w-full rounded-lg bg-slate-50 border border-slate-100 p-2 overflow-hidden flex items-center justify-center">
          {barData.length === 0 ? (
            <span className="text-xs text-slate-400">No data points available for this feature</span>
          ) : (
            <svg
              className="h-full w-full"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Horizontal Grid lines & Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingTop + chartHeight * (1 - ratio);
                const countVal = Math.round(maxCount * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke={ratio === 0 ? '#cbd5e1' : '#f1f5f9'}
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] fill-slate-400 font-mono"
                    >
                      {countVal}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {barData.map((bar, idx) => {
                const barSpacing = chartWidth / barData.length;
                const barWidth = Math.max(12, barSpacing * 0.65);
                const barHeight = maxCount > 0 ? (bar.count / maxCount) * chartHeight : 0;
                const x = paddingLeft + idx * barSpacing + (barSpacing - barWidth) / 2;
                const y = paddingTop + chartHeight - barHeight;
                const isHovered = hoveredBar?.label === bar.label;

                return (
                  <g
                    key={bar.label}
                    onMouseEnter={() => setHoveredBar(bar)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="cursor-pointer transition-all"
                  >
                    {/* Background hover bar highlight */}
                    <rect
                      x={paddingLeft + idx * barSpacing}
                      y={paddingTop}
                      width={barSpacing}
                      height={chartHeight}
                      fill={isHovered ? 'rgba(79, 70, 229, 0.05)' : 'transparent'}
                    />

                    {/* The Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(2, barHeight)}
                      rx="3"
                      className={`${
                        isHovered
                          ? 'fill-indigo-600'
                          : idx % 2 === 0
                          ? 'fill-indigo-500'
                          : 'fill-indigo-400'
                      } transition-colors`}
                    />

                    {/* Value on top of bar */}
                    {barHeight > 18 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 4}
                        textAnchor="middle"
                        className="text-[9px] font-mono font-bold fill-slate-600"
                      >
                        {bar.count}
                      </text>
                    )}

                    {/* X-axis label */}
                    <text
                      x={x + barWidth / 2}
                      y={paddingTop + chartHeight + 16}
                      textAnchor="middle"
                      className="text-[8.5px] font-mono fill-slate-600 truncate"
                      style={{ maxWidth: barSpacing }}
                    >
                      {bar.label.length > 10 ? `${bar.label.slice(0, 9)}…` : bar.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Unique Values: {activeMeta?.uniqueCount ?? barData.length}</span>
        <span className="font-mono text-slate-600">
          Top Category: {barData[0]?.label || '-'} ({barData[0]?.pct || 0}%)
        </span>
      </div>
    </div>
  );
};
