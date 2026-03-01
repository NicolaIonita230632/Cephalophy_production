<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../../docs/assets/logo_dark.png">
    <source media="(prefers-color-scheme: light)" srcset="../../../docs/assets/logo_light.png">
    <img alt="Cephalopy logo" src="../../../docs/assets/logo_light.png" style="width:80%; max-width:800px; height:auto; display:block; margin:0 auto;">
  </picture>
</p>

---
# API Schemas

## Table of Contents
| Content |
|---------|
| __[Retraining](#retraining-retrainingpy)__ |
| - [RetrainingStatus](#retrainingstatus) |
| - [RetrainTriggerRequest](#retraintriggerrequest) |
| - [RetrainTriggerResponse](#retraintriggerresponse) |
| - [DataValidationResponse](#datavalidationresponse) |
| - [RetrainingMetrics](#retrainingmetrics) |
| - [RetrainingJobStatus](#retrainingjobstatus) |
| - [RetrainingHistoryItem](#retraininghistoryitem) |
| - [RetrainingHistoryResponse](#retraininghistoryresponse) |
| __[Prediction](#prediction-predictionpy)__ |
| - [LandmarkPoint](#landmarkpoint) |
| - [Landmark](#landmark) |
| - [PredictionInput](#predictioninput) |
| - [PredictionOutput](#predictionoutput) |
| __[Evaluation](#evaluation-evalpy)__ |
| - [GenerateDocRequest](#generatedocrequest) |

## Retraining (retraining.py):
<b>Description</b>: This module defines Pydantic schemas used by the retraining API endpoints. The schemas standardise request and response payloads for triggering retraining jobs, validating data availabiility, tracking job progress, and querying retraining history.

### RetrainingStatus
Defines the possible states for a retraining job.

| Status | Description |
|--------|-------------|
| pending | Job has been created but not started |
| checking_data | Validating dataset availability |
| downloading | Downloading data or artifacts |
| training | Model training in progress |
| uploading | Uploading trained model |
| archiving | Archiving old model or artifacts |
| completed | retraininig completed successfully |
| failed | Retraining failed |
---

### RetrainTriggerRequest
Request payload for starting a retraining job.

| Field | Type | Required | Description |
| ------| ---- | -------- | ----------- |
| `force` | `bool` | No | Force retraining even if minimum data threshold is not met |
| `epochs` | `int` | No | Number of training epochs (1–100) |
| `learning_rate` | `float` | No | Learning rate (0 < lr < 1) |
| `batch_size` | `int` | No | Batch size (1–32) |
---

### RetrainTriggerResponse
Response model after triggering retraining, returns immediately.

| Field | Type | Description |
| ----- | ---- | ------------|
| `job_id` | `str \| None` | Unique retraining job identifier |
| `status` | `str` | Current job status |
| `message` | `str` | Human-readable status message |
| `estimated_duration_minutes` | `int \| None` | Estimated completion time |
---

### DataValidationResponse
Used to report whether sufficient data is available for retraining.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `ready_for_retraining` | `bool` | Whether retraining can proceed |
| `num_images` | `int` | Number of images found |
| `num_annotations` | `int` | Number of annotations found |
| `min_required` | `int` | Minimum required images |
| `matched_pairs` | `int` | Image–annotation pairs matched |
| `message` | `str` | Status or error message |
---

### RetrainingMetrics
Contains metrics produced by the training process.

| Field | Type | Description |
|-------|------|-------------|
| `final_loss` | `float` | Final training loss |
| `epochs_completed` | `int` | Number of epochs completed |
| `training_history` | `List[float]` | Loss values per epoch |
| `samples_processed` | `int` | Number of samples used for training |
---

### RetrainingJobStatus
Provides detailed, real-time or final status information for a retraining job.

#### Core Fields
| Field | Type | Description |
|-------|------|-------------|
| `job_id` | `str` | Unique job identifier |
| `status` | `RetrainingStatus` | Current job state |
| `progress_percentage` | `int \| None` | Progress (0–100) |
| `started_at` | `datetime \| None` | Job start time |
| `completed_at` | `datetime \| None` | Job completion time |
| `duration_seconds` | `float \| None` | Total runtime |

#### Training Details
| Field | Type | Description |
|-------|------|-------------|
| `num_images_processed` | `int \| None` | Images Used |
| `num_annotations_processed` | `int \| None` | Annotations used |

#### Model Artifacts
| Field | Type | Description |
|-------|------|-------------|
| `backup_model_path` | `str \| None` | Path to backed-up model |
| `new_model_path` | `str \| None` | Path to newly trained model |

#### Results and Errors
| Field | Type | Description |
|-------|------|-------------|
| `metrics` | `RetrainingMetrics \| None` | Training Metrics |
| `error_message` | `str \| None` | Error message if failed |
| `current_step` | `str \| None` | Description of current step |
---

### RetrainingHistoryItem
Represents a summarized record of a past retraining job.

| Field | Type | Description |
|-------|------|-------------|
| `job_id` | `str` | Unique job identifier |
| `status` | `RetrainingStatus` | Current job state |
| `started_at` | `datetime \| None` | Job start time |
| `completed_at` | `datetime \| None` | Job completion time |
| `duration_seconds` | `float \| None` | Total runtime |
| `num_images_processed` | `int \| None` | Images Used |
| `success` | `bool` | Job completed successfully or not |
| `error_message` | `str \| None` | Error message if failed |
---

### RetrainingHistoryResponse
Returned when querying retraining history.

| Field | Type | Description |
|-------|------|-------------|
| `total_jobs` | `int` | Amount of retraining jobs |
| `jobs` | `List[RetrainingHistoryItem]` | Job summaries |

---

## Prediction (prediction.py)
<b>Description</b>: This module defines Pydantic schemas used by the prediction (inference) API endpoints.
The schemas describe the structure of request and response payloads for submitting images, running inference, and returning landmark-based prediction results.

### LandmarkPoint
Represents a 2D point in image coordinates.
| Field | Type | Description |
|-------|------|-------------|
| `x` | `float` | X-coordinate of landmark |
| `y` | `float` | Y-coordinate of landmark |
---

### Landmark
Represents a detected anatomical or reference landmark.

| Field | Type | Description |
|-------|------|-------------|
| `title` | `str` | Landmark name |
| `symbol` | `str` | Short identifier |
| `value` | `LandmarkPoint` | Landmark coordinates |
---

### PredictionInput
Request payload for running inference on a single image.


| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | `str` | Yes | Base64-encoded image |
| `ceph_id` | `str \| None` | No | Optional identifier for the cephalogram |
---

### PredictionOutput
Response payload returned after inference is completed.

| Field | Type | Description |
|-------|------|-------------|
| `ceph_id` | `str` | Identifier associated with the input image |
| `landmarks` | `List[Landmark]` | Detected landmarks |
| `dataset_name` | `str` | Dataset label (defaulted to `Uploaded Data`) |
| `processing_time` | `float \| None` | Inference runtime in seconds |
| `model_version` | `str \| None` | Model version used for inference |
---

## Evaluation (eval.py)
<b>Description</b>: This module defines the Pydantic request schema used by the document generation endpoint.
The schema describes all inputs required to generate a structured report containing images, titles, notes, and metrics.

### GenerateDocRequest:
Request payload for generating a report.

#### Metadata
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `logo` | `str` | Yes | Base64-encoded logo image |
| `include_title` | `bool` | Yes | Include title page or not |
| `title_img` | `str` | Yes | Base64-encoded image for title page |
| `main_title` | `str` | Yes | Main document title |
| `author` | `str` | Yes | Author name |
| `patient` | `str` | Yes | Patient identifier |
| `descr` | `str` | Yes | Short document description |
| `title_bg` | `str` | Yes | Background color or image reference for title page |

#### Section Content
Each section in the report is defined by the aligning list entries accross the following fields.

| Field | Type | Description |
|-------|------|-------------|
| `titles_li` | `List[str]` | Section titles |
| `img_li` | `List[List[str]]` | Base64-encoded images per section |
| `notes_li` | `List[str]` | Notes or commentary per section |
| `metrics_li` | `List[Dict \| List]` | Metrics or structured data per section |
| `img_captions_li` | `List[str] \| None` | Optional image captions per section |

#### Layout Configuration
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `image_layout` | `List[str]` | `["single", "single", "grid2"]` | Image layout per section |

Supported layout values:
- `single`: One image per row.
- `grid2`: Two images in a grid.
- `grid3`: Three images in a grid.
