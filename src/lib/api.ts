import {
  User,
  DatasetSummary,
  DatasetDetail,
  ETLStep,
  MLModel,
  PredictionResult,
  AnalyticsInsights,
} from '../types.ts';

const TOKEN_KEY = 'pixelytics_jwt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}, retries: number = 2): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // If server is restarting (502 / 503 / 504), retry if retries left
      if (retries > 0 && (response.status === 502 || response.status === 503 || response.status === 504)) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        return request<T>(endpoint, options, retries - 1);
      }

      let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return (await response.json()) as T;
  } catch (err: any) {
    // Retry on network errors / Failed to fetch (e.g. dev server boot/restart)
    const isNetworkError =
      err instanceof TypeError ||
      err.message?.toLowerCase().includes('fetch') ||
      err.message?.toLowerCase().includes('network') ||
      err.name === 'TypeError';

    if (retries > 0 && isNetworkError) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return request<T>(endpoint, options, retries - 1);
    }
    throw err;
  }
}

// Authentication API
export const api = {
  auth: {
    async register(data: { email: string; password: string; full_name: string }) {
      const res = await request<{ message: string; token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.token) setStoredToken(res.token);
      return res;
    },

    async login(data: { email: string; password: string }) {
      const res = await request<{ message: string; token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.token) setStoredToken(res.token);
      return res;
    },

    async me() {
      return request<{ user: User }>('/api/auth/me');
    },

    logout() {
      clearStoredToken();
    },
  },

  datasets: {
    async list() {
      return request<DatasetSummary[]>('/api/datasets');
    },

    async get(id: number) {
      return request<DatasetDetail>(`/api/datasets/${id}`);
    },

    async getInstances(id: number, page: number = 1, limit: number = 20, search: string = '') {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });
      return request<{
        instances: Record<string, any>[];
        pagination: { page: number; limit: number; totalInstances: number; totalPages: number };
      }>(`/api/datasets/${id}/instances?${query.toString()}`);
    },

    async uploadFile(formData: FormData) {
      return request<{ message: string; dataset: DatasetSummary }>('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      });
    },

    async uploadJson(name: string, description: string, jsonData: Record<string, any>[]) {
      return request<{ message: string; dataset: DatasetSummary }>('/api/datasets/upload', {
        method: 'POST',
        body: JSON.stringify({ name, description, jsonData }),
      });
    },

    async delete(id: number) {
      return request<{ message: string }>(`/api/datasets/${id}`, {
        method: 'DELETE',
      });
    },
  },

  etl: {
    async transform(params: {
      datasetId: number;
      action: string;
      columns?: string[];
      strategy?: string;
      constantValue?: any;
      threshold?: number;
    }) {
      return request<{
        message: string;
        summary: string;
        stepNumber: number;
        rowCount: number;
        columnCount: number;
        preview: Record<string, any>[];
      }>('/api/etl/transform', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async history(datasetId: number) {
      return request<ETLStep[]>(`/api/etl/history/${datasetId}`);
    },

    async reset(datasetId: number) {
      return request<{ message: string; rowCount: number; columnCount: number }>(`/api/etl/reset/${datasetId}`, {
        method: 'POST',
      });
    },
  },

  ml: {
    async train(params: {
      datasetId: number;
      modelName?: string;
      taskType: string;
      algorithm: string;
      targetColumn?: string;
      featureColumns: string[];
      hyperparameters?: Record<string, any>;
    }) {
      return request<{ message: string; model: MLModel }>('/api/ml/train', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async listModels(datasetId: number) {
      return request<MLModel[]>(`/api/ml/models/${datasetId}`);
    },

    async predict(modelId: number, inputs: Record<string, any>) {
      return request<{
        modelId: number;
        modelName: string;
        targetColumn?: string;
        inputs: Record<string, any>;
        result: PredictionResult;
      }>('/api/ml/predict', {
        method: 'POST',
        body: JSON.stringify({ modelId, inputs }),
      });
    },

    async logs(modelId: number) {
      return request<{ id: number; inputs: Record<string, any>; result: PredictionResult; createdAt: string }[]>(
        `/api/ml/logs/${modelId}`
      );
    },
  },

  insights: {
    async get(datasetId: number) {
      return request<AnalyticsInsights>(`/api/insights/${datasetId}`);
    },
  },
};
