import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DatasetsView } from './components/DatasetsView.tsx';
import { FeaturesInstancesView } from './components/FeaturesInstancesView.tsx';
import { ETLStudioView } from './components/ETLStudioView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { PredictionView } from './components/PredictionView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { api, getStoredToken } from './lib/api.ts';
import { DatasetSummary, DatasetDetail, User } from './types.ts';
import { HardDrive, Terminal } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'datasets' | 'features' | 'etl' | 'dashboard' | 'predictions'>('datasets');
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedDatasetDetail, setSelectedDatasetDetail] = useState<DatasetDetail | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize Auth & Datasets
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    setInitError(null);
    // 1. Check existing JWT token
    const token = getStoredToken();
    if (token) {
      try {
        const authRes = await api.auth.me();
        setUser(authRes.user);
      } catch (err) {
        console.warn('Existing JWT expired or invalid:', err);
      }
    }

    // 2. Fetch datasets
    await refreshDatasets();
    setLoading(false);
  };

  const refreshDatasets = async () => {
    try {
      const list = await api.datasets.list();
      setDatasets(list);
      setInitError(null);
      if (list.length > 0) {
        const targetId = selectedDatasetId && list.some((d) => d.id === selectedDatasetId) ? selectedDatasetId : list[0].id;
        setSelectedDatasetId(targetId);
        await loadDatasetDetail(targetId);
      } else {
        setSelectedDatasetId(null);
        setSelectedDatasetDetail(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch datasets:', err);
      setInitError(err?.message || 'Failed to connect to backend server');
    }
  };

  const loadDatasetDetail = async (id: number) => {
    try {
      const detail = await api.datasets.get(id);
      setSelectedDatasetDetail(detail);
    } catch (err) {
      console.error('Failed to load dataset detail:', err);
    }
  };

  const handleSelectDataset = async (id: number) => {
    setSelectedDatasetId(id);
    await loadDatasetDetail(id);
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 selection:bg-yellow-300 selection:text-slate-900">
      {/* Navbar with dataset selector & auth */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={handleSelectDataset}
        user={user}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenExportModal={() => setExportModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center max-w-sm">
              <div className="h-8 w-8 mx-auto border-3 border-indigo-600 border-t-transparent animate-spin rounded-full mb-4" />
              <p className="text-sm font-bold text-slate-900 tracking-tight">
                Connecting to ML Engine...
              </p>
              <p className="text-xs text-slate-500 mt-1">Initializing dataset repositories and models</p>
            </div>
          </div>
        ) : initError && datasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-sm text-center max-w-md space-y-4">
              <p className="text-sm font-bold text-rose-900">Server Connection Error</p>
              <p className="text-xs text-slate-600">{initError}</p>
              <button
                type="button"
                onClick={initApp}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Reconnect to Server
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'datasets' && (
              <DatasetsView
                datasets={datasets}
                selectedDatasetId={selectedDatasetId}
                onSelectDataset={handleSelectDataset}
                onNavigate={(tab) => setActiveTab(tab)}
                onRefreshDatasets={refreshDatasets}
              />
            )}

            {activeTab === 'features' && (
              <FeaturesInstancesView
                dataset={selectedDatasetDetail}
                onRefresh={() => selectedDatasetId ? loadDatasetDetail(selectedDatasetId) : Promise.resolve()}
              />
            )}

            {activeTab === 'etl' && (
              <ETLStudioView
                dataset={selectedDatasetDetail}
                onRefreshDataset={() => selectedDatasetId ? loadDatasetDetail(selectedDatasetId) : Promise.resolve()}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                dataset={selectedDatasetDetail}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'predictions' && (
              <PredictionView dataset={selectedDatasetDetail} />
            )}
          </>
        )}
      </main>

      {/* Modern Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Pixelytics</span>
            <span>·</span>
            <span>Automated Data Preprocessing, Insights &amp; ML Predictions</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>System Active</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Export Studio Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        dataset={selectedDatasetDetail}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
        }}
      />
    </div>
  );
}
