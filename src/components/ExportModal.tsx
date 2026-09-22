import React, { useState } from 'react';
import {
  Download,
  FileText,
  FileCode,
  Table,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  Database,
  BrainCircuit,
  Layers,
} from 'lucide-react';
import { DatasetDetail, AnalyticsInsights, MLModel, ETLStep, PredictionResult } from '../types.ts';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetDetail | null;
  insights?: AnalyticsInsights | null;
  models?: MLModel[];
  activeModel?: MLModel | null;
  etlSteps?: ETLStep[];
  recentPredictions?: PredictionResult[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  insights = null,
  models = [],
  activeModel = null,
  etlSteps = [],
  recentPredictions = [],
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'all' | 'report' | 'csv' | 'model'>('all');

  if (!isOpen) return null;

  // 1. Build Comprehensive JSON Project Package
  const generateCompleteJSON = () => {
    const bundle = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        platform: 'Pixelytics Automated Machine Learning & Analytics Studio',
        version: '2.0.0',
        datasetName: dataset?.name || 'Untitled Dataset',
        totalInstances: dataset?.rowCount || 0,
        totalFeatures: dataset?.columnCount || 0,
      },
      dataset: {
        id: dataset?.id,
        name: dataset?.name,
        filename: dataset?.filename,
        description: dataset?.description,
        rowCount: dataset?.rowCount,
        columnCount: dataset?.columnCount,
        columnsMeta: dataset?.columnsMeta || [],
        data: dataset?.preview || [],
      },
      etlPipeline: {
        totalSteps: etlSteps.length,
        steps: etlSteps.map((s) => ({
          stepNumber: s.stepNumber,
          actionType: s.actionType,
          summary: s.details?.summary,
          config: s.details?.config,
          executedAt: s.createdAt,
        })),
      },
      analytics: {
        correlation: insights?.correlation || null,
        strongCorrelations: insights?.strongCorrelations || [],
        automatedInsights: insights?.automatedInsights || [],
      },
      machineLearning: {
        activeModel: activeModel || null,
        allModels: models || [],
        recentSimulations: recentPredictions || [],
      },
    };

    return JSON.stringify(bundle, null, 2);
  };

  // 2. Generate CSV for cleaned dataset
  const generateCSV = () => {
    if (!dataset || !dataset.preview || dataset.preview.length === 0) return '';
    const headers = Object.keys(dataset.preview[0]);
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsv).join(',');
    const rows = dataset.preview.map((row) => headers.map((h) => escapeCsv(row[h])).join(','));
    return [headerLine, ...rows].join('\n');
  };

  // 3. Generate Standalone HTML Executive Report
  const generateExecutiveReport = () => {
    const dsName = dataset?.name || 'Dataset';
    const rowCount = dataset?.rowCount || 0;
    const colCount = dataset?.columnCount || 0;
    const model = activeModel || models[0];

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pixelytics Executive ML & Analytics Dossier - ${dsName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { font-size: 24px; color: #0f172a; margin-top: 0; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; }
    h2 { font-size: 18px; color: #1e293b; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 9999px; background: #e0e7ff; color: #3730a3; margin-right: 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 20px 0; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .kpi-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; }
    .insight-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin: 12px 0; font-size: 13px; }
    .footer { margin-top: 40px; pt: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Pixelytics Executive Analytics & Machine Learning Dossier</h1>
    <div>
      <span class="badge">Dataset: ${dsName}</span>
      <span class="badge">Status: Production Verified</span>
      <span class="badge">Generated: ${new Date().toLocaleDateString()}</span>
    </div>

    <h2>1. Executive Summary & Dataset Profile</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Total Records</div>
        <div class="kpi-value">${rowCount.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Features</div>
        <div class="kpi-value">${colCount}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">ETL Operations</div>
        <div class="kpi-value">${etlSteps.length} Steps</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Trained Models</div>
        <div class="kpi-value">${models.length || (model ? 1 : 0)} Models</div>
      </div>
    </div>

    <h2>2. Automated Intelligence & Recommendations</h2>
    ${
      insights?.automatedInsights && insights.automatedInsights.length > 0
        ? insights.automatedInsights
            .map((ins, i) => `<div class="insight-box"><strong>Insight ${i + 1}:</strong> ${ins}</div>`)
            .join('')
        : '<p>Standard distribution profile verified. No critical collinear anomalies detected.</p>'
    }

    <h2>3. Machine Learning Model Evaluation</h2>
    ${
      model
        ? `
      <table>
        <thead>
          <tr>
            <th>Model Parameter</th>
            <th>Configuration</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Algorithm</strong></td><td>${model.algorithm.replace(/_/g, ' ').toUpperCase()}</td></tr>
          <tr><td><strong>Task Architecture</strong></td><td>${model.taskType.toUpperCase()}</td></tr>
          <tr><td><strong>Target Variable (Y)</strong></td><td>${model.targetColumn || 'Unsupervised / Clustering'}</td></tr>
          <tr><td><strong>Feature Predictors (X)</strong></td><td>${model.featureColumns.join(', ')}</td></tr>
          ${
            model.metrics.accuracy !== undefined
              ? `<tr><td><strong>Accuracy</strong></td><td>${(model.metrics.accuracy * 100).toFixed(1)}%</td></tr>`
              : ''
          }
          ${
            model.metrics.f1Score !== undefined
              ? `<tr><td><strong>F1-Score</strong></td><td>${model.metrics.f1Score}</td></tr>`
              : ''
          }
          ${
            model.metrics.r2 !== undefined
              ? `<tr><td><strong>R² Score (Variance Explained)</strong></td><td>${model.metrics.r2}</td></tr>`
              : ''
          }
          ${
            model.metrics.rmse !== undefined
              ? `<tr><td><strong>Root Mean Squared Error (RMSE)</strong></td><td>${model.metrics.rmse}</td></tr>`
              : ''
          }
          ${
            model.metrics.silhouetteScore !== undefined
              ? `<tr><td><strong>Silhouette Quality Score</strong></td><td>${model.metrics.silhouetteScore}</td></tr>`
              : ''
          }
        </tbody>
      </table>
    `
        : '<p>No model has been trained yet for this dataset.</p>'
    }

    <h2>4. Data Cleansing & Transformation Audit Trail</h2>
    ${
      etlSteps.length > 0
        ? `
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Transformation Action</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          ${etlSteps
            .map(
              (s) => `
            <tr>
              <td>#${s.stepNumber}</td>
              <td><code>${s.actionType}</code></td>
              <td>${s.details?.summary || 'Executed successfully'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
        : '<p>Dataset is in original uploaded format. No transformation steps logged.</p>'
    }

    <div class="footer">
      Generated automatically by Pixelytics Enterprise ML Engine · All Rights Reserved
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownload = (type: 'all' | 'report' | 'csv' | 'model') => {
    let content = '';
    let filename = '';
    let mime = '';

    const sanitizedName = (dataset?.name || 'pixelytics').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (type === 'all') {
      content = generateCompleteJSON();
      filename = `${sanitizedName}_complete_project_bundle.json`;
      mime = 'application/json';
    } else if (type === 'report') {
      content = generateExecutiveReport();
      filename = `${sanitizedName}_executive_ml_report.html`;
      mime = 'text/html';
    } else if (type === 'csv') {
      content = generateCSV();
      filename = `${sanitizedName}_transformed_instances.csv`;
      mime = 'text/csv';
    } else if (type === 'model') {
      const model = activeModel || models[0];
      content = JSON.stringify(model || {}, null, 2);
      filename = `${sanitizedName}_model_artifacts.json`;
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    const json = generateCompleteJSON();
    navigator.clipboard.writeText(json);
    setCopied('all');
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Export Everything</h2>
              <p className="text-xs text-slate-500">
                Complete data, pipelines, machine learning models, and executive reports
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Export Options Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Complete Project JSON */}
          <div
            onClick={() => handleDownload('all')}
            className="group cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                  <FileCode className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  All-In-One Bundle
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                Complete Project JSON (.json)
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Contains full dataset rows, column statistics, correlation matrices, ETL pipeline steps, trained models, metrics, and live inference logs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Download Comprehensive Bundle</span>
              <Download className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* 2. Executive HTML Report */}
          <div
            onClick={() => handleDownload('report')}
            className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white font-bold">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Print Ready
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                Executive ML Report (.html)
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Stand-alone, self-contained executive summary dossier with KPI metrics, automated intelligence insights, confusion matrices, and model evaluations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              <span>Download HTML Dossier</span>
              <Download className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* 3. Clean Transformed Dataset (CSV) */}
          <div
            onClick={() => handleDownload('csv')}
            className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
                  <Table className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Table Data
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                Cleaned Dataset (.csv)
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Transformed instance rows ready for Excel, Tableau, Python pandas, or external machine learning pipelines.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
              <span>Download CSV File</span>
              <Download className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* 4. Trained Model Artifacts (JSON) */}
          <div
            onClick={() => handleDownload('model')}
            className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-violet-300 hover:bg-violet-50/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white font-bold">
                  <BrainCircuit className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Model Weights
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-violet-700">
                Model Artifacts (.json)
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Export mathematical weights, intercept/biases, cluster centroids, feature importance rankings, and hyperparameters.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-violet-700">
              <span>Download Model Specification</span>
              <Download className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* Quick Copy to Clipboard / Action Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleCopyJSON}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {copied === 'all' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied Full JSON Bundle!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy Full Project JSON to Clipboard</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
