// Types for Model Retraining API

export type RetrainingStatus =
  | 'pending'
  | 'checking_data'
  | 'downloading'
  | 'training'
  | 'uploading'
  | 'archiving'
  | 'completed'
  | 'failed';

export interface DataValidationResponse {
  ready_for_retraining: boolean;
  num_images: number;
  num_annotations: number;
  min_required: number;
  matched_pairs: number;
  message: string;
}

export interface RetrainTriggerRequest {
  force?: boolean;
  epochs?: number;
  learning_rate?: number;
  batch_size?: number;
}

export interface RetrainTriggerResponse {
  job_id: string | null;
  status: string;
  message: string;
  estimated_duration_minutes: number | null;
}

export interface RetrainingMetrics {
  final_loss: number;
  epochs_completed: number;
  training_history: number[];
  samples_processed: number;
}

export interface RetrainingJobStatus {
  job_id: string;
  status: RetrainingStatus;
  progress_percentage: number | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  num_images_processed: number | null;
  num_annotations_processed: number | null;
  backup_model_path: string | null;
  new_model_path: string | null;
  metrics: RetrainingMetrics | null;
  error_message: string | null;
  current_step: string | null;
}

export interface RetrainingHistoryItem {
  job_id: string;
  status: RetrainingStatus;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  num_images_processed: number | null;
  success: boolean;
  error_message: string | null;
}

export interface RetrainingHistoryResponse {
  total_jobs: number;
  jobs: RetrainingHistoryItem[];
}
