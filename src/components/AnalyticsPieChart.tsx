import React, { useState, useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ColumnMeta } from '../types.ts';

interface AnalyticsPieChartProps {
  columnsMeta: ColumnMeta[];
  rows: Record<string, any>[];
  totalRowCount: number;
}

const PALETTE = [
  '#4f46e5', // indigo-600
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#14b8a6', // teal-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
];

export const AnalyticsPieChart: React.FC<AnalyticsPieChartProps> = ({
  columnsMeta,
  rows,
  totalRowCount,
}) => {
  // Find suitable categorical or low-cardinality columns
  const eligibleColumns = useMemo(() => {
    return columnsMeta.filter(
      (c) => c.type === 'categorical' || c.uniqueCount <= 12 || c.name.toLowerCase().includes('churn') || c.name.toLowerCase().includes('target')
    );
  }, [columnsMeta]);

  const defaultCol = useMemo(() => {
    const binary = eligibleColumns.find(
      (c) => c.uniqueCount >= 2 && c.uniqueCount <= 6
    );
    return binary ? binary.name : eligibleColumns[0]?.name || columnsMeta[0]?.name || '';
  }, [eligibleColumns, columnsMeta]);

  const [selectedColumn, setSelectedColumn] = useState<string>(defaultCol);
  const [hoveredSlice, setHoveredSlice] = useState<{
    label: string;
    count: number;
    pct: number;
    color: string;
  } | null>(null);

  React.useEffect(() => {
    if (!selectedColumn && defaultCol) {
      setSelectedColumn(defaultCol);
    }
  }, [defaultCol, selectedColumn]);

  // Compute slice data
  const pieData = useMemo(() => {
    if (!selectedColumn || !rows.length) return [];

    const countMap: Record<string, number> = {};
    let totalValid = 0;

    rows.forEach((r) => {
      const raw = r[selectedColumn];
      const valStr = raw === null || raw === undefined || raw === '' ? '(Missing)' : String(raw);
      countMap[valStr] = (countMap[valStr] || 0) + 1;
      totalValid++;
    });

    const entries = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    const topEntries = entries.slice(0, 7);
    const otherEntries = entries.slice(7);

    const slices: { label: string; count: number; pct: number; color: string }[] = [];

    topEntries.forEach(([label, count], i) => {
      slices.push({
        label,
        count,
        pct: totalValid ? Math.round((count / totalValid) * 1000) / 10 : 0,
        color: PALETTE[i % PALETTE.length],
      });
    });

    if (otherEntries.length > 0) {
      const otherCount = otherEntries.reduce((sum, [, c]) => sum + c, 0);
      slices.push({
        label: 'Others',
        count: otherCount,
        pct: totalValid ? Math.round((otherCount / totalValid) * 1000) / 10 : 0,
        color: '#94a3b8',
      });
    }

    return slices;
  }, [selectedColumn, rows]);

  // SVG Geometry for Donut Chart
  const size = 220;
  const center = size / 2;
  const outerR = 90;
  const innerR = 52;

  // Compute angles
  const totalCount = useMemo(() => pieData.reduce((acc, s) => acc + s.count, 0), [pieData]);

  let currentAngle = -Math.PI / 2; // Start from top 12 o'clock

  const arcs = pieData.map((slice) => {
    const angleSpan = totalCount > 0 ? (slice.count / totalCount) * 2 * Math.PI : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    currentAngle = endAngle;

    // Outer arc points
    const x1 = center + outerR * Math.cos(startAngle);
    const y1 = center + outerR * Math.sin(startAngle);
    const x2 = center + outerR * Math.cos(endAngle);
    const y2 = center + outerR * Math.sin(endAngle);

    // Inner arc points
    const x3 = center + innerR * Math.cos(endAngle);
    const y3 = center + innerR * Math.sin(endAngle);
    const x4 = center + innerR * Math.cos(startAngle);
    const y4 = center + innerR * Math.sin(startAngle);

    const largeArcFlag = angleSpan > Math.PI ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return {
      ...slice,
      pathData,
      startAngle,
      endAngle,
    };
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header with column selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <PieChartIcon className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Proportions Pie / Donut Chart</h2>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Feature:</span>
            <select
              aria-label="Select feature for proportions pie chart"
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-mono text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {(eligibleColumns.length > 0 ? eligibleColumns : columnsMeta).map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.uniqueCount} categories)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content: Chart + Legend */}
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[240px]">
          {/* Donut SVG */}
          <div className="relative flex items-center justify-center shrink-0">
            {pieData.length === 0 ? (
              <span className="text-xs text-slate-400">No data available</span>
            ) : (
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {arcs.map((arc, i) => {
                  const isHovered = hoveredSlice?.label === arc.label;
                  return (
                    <path
                      key={arc.label}
                      d={arc.pathData}
                      fill={arc.color}
                      opacity={isHovered ? 1 : 0.88}
                      stroke="#ffffff"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredSlice(arc)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className="cursor-pointer transition-all hover:scale-[1.02] transform origin-center"
                    >
                      <title>{`${arc.label}: ${arc.count} (${arc.pct}%)`}</title>
                    </path>
                  );
                })}
              </svg>
            )}

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {hoveredSlice ? (
                <>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    {hoveredSlice.pct}%
                  </span>
                  <span className="text-[10px] text-slate-500 max-w-[80px] truncate font-medium">
                    {hoveredSlice.label}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {hoveredSlice.count} rows
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base font-bold text-slate-800 font-mono">
                    {totalCount}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Instances
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex-1 w-full max-h-48 overflow-y-auto space-y-1.5 pr-2">
            {pieData.map((slice) => {
              const isHovered = hoveredSlice?.label === slice.label;
              return (
                <div
                  key={slice.label}
                  onMouseEnter={() => setHoveredSlice(slice)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isHovered ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate font-medium">{slice.label}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 font-mono text-[11px]">
                    <span className="text-slate-500">{slice.count}</span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {slice.pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Categories: {pieData.length}</span>
        <span className="font-mono text-slate-600">
          Dominant: {pieData[0]?.label || '-'} ({pieData[0]?.pct || 0}%)
        </span>
      </div>
    </div>
  );
};
