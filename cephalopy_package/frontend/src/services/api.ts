import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV
    ? 'http://127.0.0.1:8000/api/v1'    // Only in dev mode
    : 'https://ceph-backend-1022645602437.europe-west1.run.app/api/v1'); // Safe prod fallback

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// API endpoints (NO /api/v1 here, baseURL already has it)
export const endpoints = {
  health: '/health',
  predictLandmarks: '/predict',
  models: '/models',
  retrain: '/models/retrain',
};

// Landmark API
export const landmarkAPI = {
  predictLandmarks: async (imageFile: File) => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await api.post(endpoints.predictLandmarks, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  checkHealth: async () => {
    const response = await api.get(endpoints.health);
    return response.data;
  },
};

// Model API
export const modelAPI = {
  getModels: async () => {
    const response = await api.get('/models/list');
    return response.data;
  },

  getModelDetails: async (modelId: string) => {
    const response = await api.get(`/models/${modelId}`);
    return response.data;
  },

  getActiveModel: async () => {
    const response = await api.get('/models/active');
    return response.data;
  },

  retrainModel: async (modelId: string, trainingData: FormData) => {
    const response = await api.post(`/models/retrain/${modelId}`, trainingData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  compareClinical: async (modelIds: string[]) => {
    if (modelIds.length !== 2) {
      throw new Error('Exactly 2 models required');
    }

    const response = await api.post('/models/compare/clinical', {
      model_ids: modelIds,
    });
    return response.data;
  },
};

// Retraining API
export const retrainingAPI = {
  validateData: async () => {
    const response = await api.post('/retrain/validate');
    return response.data;
  },

  triggerRetraining: async (config?: {
    force?: boolean;
    epochs?: number;
    learning_rate?: number;
    batch_size?: number;
  }) => {
    const response = await api.post('/retrain/trigger', config || {});
    return response.data;
  },

  getJobStatus: async (jobId: string) => {
    const response = await api.get(`/retrain/status/${jobId}`);
    return response.data;
  },

  getHistory: async (limit: number = 10) => {
    const response = await api.get('/retrain/history', {
      params: { limit },
    });
    return response.data;
  },
};

// Data API
export const dataAPI = {
  /**
   * Save corrected annotation (used in correction page)
   * For 3-folder structure with original prediction tracking
   */
  saveCorrectedAnnotation: async (
    imageFile: File,
    originalPrediction: any,  // Original model prediction
    correctedLandmarks: any   // User's corrections
  ) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('model_prediction', JSON.stringify(originalPrediction));
    formData.append('final_annotation', JSON.stringify(correctedLandmarks));
    formData.append('was_corrected', 'true');  // User made corrections

    const response = await api.post('/data/save-annotation', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Save prediction as-is without corrections (used in detection page)
   * For 3-folder structure - saves original as both model_prediction and final_annotation
   */
  savePredictionAsIs: async (imageFile: File, landmarks: any) => {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('model_prediction', JSON.stringify(landmarks));  // Original
    formData.append('final_annotation', JSON.stringify(landmarks));   // Same (not corrected)
    formData.append('was_corrected', 'false');  // Not corrected

    const response = await api.post('/data/save-annotation', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get current count of images collected
   */
  getDataCount: async () => {
    const response = await api.get('/data/count');
    return response.data;
  },
};
