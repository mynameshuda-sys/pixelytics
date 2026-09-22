import React from 'react';
import {
  BarChart3,
  Table,
  Sliders,
  BrainCircuit,
  LogOut,
  Layers,
  ChevronDown,
  User as UserIcon,
  Sparkles,
  Database,
  Download,
} from 'lucide-react';
import { User, DatasetSummary } from '../types.ts';

interface NavbarProps {
  activeTab: 'datasets' | 'features' | 'etl' | 'dashboard' | 'predictions';
  setActiveTab: (tab: 'datasets' | 'features' | 'etl' | 'dashboard' | 'predictions') => void;
  datasets: DatasetSummary[];
  selectedDatasetId: number | null;
  onSelectDataset: (id: number) => void;
  user: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenExportModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  user,
  onOpenAuthModal,
  onLogout,
  onOpenExportModal,
}) => {
  const currentDataset = datasets.find((d) => d.id === selectedDatasetId);

  const navItems = [
    { id: 'datasets', step: '1', label: 'Datasets', icon: Layers, desc: 'Upload & Select' },
    { id: 'features', step: '2', label: 'Features & Rows', icon: Table, desc: 'Inspect Schema', disabled: !selectedDatasetId },
    { id: 'etl', step: '3', label: 'ETL Studio', icon: Sliders, desc: 'Clean & Prep', disabled: !selectedDatasetId },
    { id: 'dashboard', step: '4', label: 'Analytics', icon: BarChart3, desc: 'Correlations & Insights', disabled: !selectedDatasetId },
    { id: 'predictions', step: '5', label: 'ML Predictions', icon: BrainCircuit, desc: 'Train & Infer', disabled: !selectedDatasetId },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('datasets')}
            className="flex items-center space-x-3 text-left focus:outline-none group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-xs group-hover:from-indigo-700 group-hover:to-indigo-800 transition-all">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  Pixelytics
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Automated ML &amp; Analytics
              </p>
            </div>
          </button>

          {/* Desktop Step Navigation */}
          <nav className="hidden xl:flex items-center space-x-1 pl-4 border-l border-slate-200">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  disabled={tab.disabled}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                      : tab.disabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.step}
                  </span>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Medium screens navigation */}
        <nav className="hidden md:flex xl:hidden items-center space-x-1">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                disabled={tab.disabled}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : tab.disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Active Dataset & Auth */}
        <div className="flex items-center space-x-3">
          {/* Active dataset selector */}
          {datasets.length > 0 && (
            <div className="relative">
              <select
                aria-label="Select active dataset"
                value={selectedDatasetId || ''}
                onChange={(e) => onSelectDataset(Number(e.target.value))}
                className="appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows)
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </div>
          )}

          {/* Export Project button */}
          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              title="Export Full Project, HTML Report, Cleaned Data, or Model"
              className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {/* User Auth indicator */}
          {user ? (
            <div className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-700 max-w-[120px] truncate hidden sm:inline-block">
                {user.fullName}
              </span>
              <button
                onClick={onLogout}
                title="Log Out"
                className="ml-1 rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile sub-bar */}
      <div className="flex md:hidden border-t border-slate-200 bg-slate-50 px-2 py-1.5 space-x-1 overflow-x-auto text-xs">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            disabled={tab.disabled}
            className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap text-xs transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : tab.disabled
                ? 'text-slate-300'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
