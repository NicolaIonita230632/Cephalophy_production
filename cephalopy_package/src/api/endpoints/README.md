<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../../docs/assets/logo_dark.png">
    <source media="(prefers-color-scheme: light)" srcset="../../../docs/assets/logo_light.png">
    <img alt="Cephalopy logo" src="../../../docs/assets/logo_light.png" style="width:80%; max-width:800px; height:auto; display:block; margin:0 auto;">
  </picture>
</p>

---

# API Endpoints

## Table of Contents
| Content |
|---------|
| __[Data](#data-datapy)__ |
| - [get_storage_client()](#get_storage_client) |
| - [SaveAnnotationResponse](#saveannotationresponse) |
| - [save_annotation()](#save_annotation) |
| - [get_data_count()](#get_data_count) |
| __[Evaluation (Notes Generation)](#evaluation-evalpy)__ |
| - [FullWidthRemainingHeightImage(Flowable)](#fullwidthremainingheightimageflowable-class) |
| - [draw_header()](#draw_header) |
| - [draw_title_bg()](#draw_title_bg) |
| - [base64_to_image_reader()](#base64_to_image_reader) |
| - [create_title_page()](#create_title_page) |
| - [add_single_images()](#add_single_images) |
| - [add_grid()](#add_grid) |
| - [generate_document()](#generate_document) |
| - [download_document()](#download_document) |
| __[Health](#health_healthpy)__ |
| - [health_check()](#health_check) |
| __[Models](#models-modelspy)__ |
| - [ModelMetrics(BaseModel)](#modelmetricsbasemodel) |
| - [ModelInfo(BaseModel)](#modelinfobasemodel) |
| - [ModelsListResponse(BaseModel)](#modelslistresponsebasemodel) |
| - [list_models()](#list_models) |
| - [activate_model()](#activate_model) |
| - [get_active_model()](#get_active_model) |
| - [get_model_details()](#get_model_details) |
| - [check_new_models()](#check_new_models) |
| - [get_accuracy_interpretation()](#get_accuracy_interpretation) |
| - [get_reliability_interpretation()](#get_reliability_interpretation) |
| - [analyze_winners()](#analyze_winners) |
| - [get_mre_difference_significance()](#get_mre_difference_significance) |
| - [generate_clinical_recommendation()](#generate_clinical_recommendation) |
| - [compare_models_clinical()](#compare_models_clinical) |
| __[Predictions](#predictions-predictionspy)__ |
| - [predict_landmarks()](#predict_landmarks) |
| - [predict_from_file()](#predict_from_file) |
| __[Retraining](#retraining-retrainingpy)__ |
| - [validate_data()](#validate_data) |
| - [trigger_retraining()](#trigger_retraining) |
| - [get_job_status()](#get_job_status) |
| - [get_retraining_history()](#get_retraining_history) |


## Data (data.py)
__Description__: Data management endpoints - Save annotations to Google Cloud Storage with clear 3-folder structure.

### get_storage_client()
Initialize Google Cloud Storage client from environment variables.

The function does the following:
1. A service account file pointed to by `GOOGLE_APPLICATION_CREDENTIALS`
2. Individual `GCP_*` environment variables
3. Application Default Credentials (ADC)

#### Parameters
- None

#### Returns
- storage.Client(): an initialized and authenticated Google Cloud Storage client

---

### SaveAnnotationResponse
Response after saving of the annotation.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `filename` | `str` | Name of the image file for which the annotation was saved |
| `image_number` | `int` | Index of the current image being annotated |
| `total_images` | `int` | Total number of images in the annotation session |
| `was_corrected` | `bool` | `True` if the user modified the annotation, `False` if it was approved without changes |
| `message` | `str` | Status message describing the result |

---
### save_annotation()
Save annotation to GCS with clear 3-folder structure

ALWAYS saves to all 3 folders:
1. The X-ray image: data/inference_images/
2. Model's ORIGINAL prediction (for research): data/model_predictions/
3. FINAL annotation (corrected or approved): data/corrected_annotations/

User flow:
- If approved as-is: model_prediction == final_annotation
- If corrected: model_prediction ≠ final_annotation

#### API Endpoint Path
`POST /data/save-annotation`
Content-Type: `multipart/form-data`

#### Parameters
- `file`(`UploadFile`): X-ray image file.
- `model_prediction` (`str`): JSON string of model's original prediction.
- `final_annotation` (`str`): JSON string of final annotation (corrected or not).
- `was_corrected` (`bool`): Boolean indicating if user made changes.
- `ceph_id` (`str`): Optional unique identifier.

#### Returns
- `SaveAnnotationResponse`: `SaveAnnotationResponse` with progress towards `50` images.

---
### get_data_count()
Get current count of collected images.

#### API Endpoint Path
`GET /data/count`

#### Returns
- `Dict` with current count and status.

---
## Evaluation (eval.py)
__Description__: Evaluation and documentation of user evaluation Endpoint. Mainly contains the codes required for Notes generation.

### FullWidthRemainingHeightImage(Flowable) Class
A custom ReportLab Flowable for rendering images that automatically scale to fit within the available page space while preserving their aspect ratio.

This flowable ensures that the image:
- Uses full available width when possible.
- Never exceeds the remaining vertical space on the page.
- Maintains its original aspect ratio at all times.

This class is used for placing large images into a PDF report.

#### Parameters
- `img_reader` (`reportlab.lib.utils.ImageReader`): Contains the image to be rendered.

---

### draw_header()
Draw a header logo on the top-left corner of each page.

#### Parameters
- `canvas` (`reportlab.pdfgen.canvas.Canvas`): The canvas to draw on.
- `doc` (`BaseDocTemplate`): The document object.
- `logo_path` (`str`): Path or base64 data URL of the logo image.
- `logo_width` (`int`, default=`50`): Width of the logo in the document.
- `logo_height` (`int`, default=`50`): Height of the logo in the document.
- `margin` (`int`, default=`10`): Margin from the edges of the document.

---
### draw_title_bg()
Draw background colour on title page acccording to given colour through `bg_color`. Saves this colour to the canvas of the first page of the report.

#### Parameters
- `canvas` (`reportlab.pdfgen.canvas.Canvas`): The canvas to draw on.
- `doc` (`BaseDocTemplate`): The document object.
- `bg_color` (`str`): The background colour as a string (hex or name) or `reportlab Color` object.

---
### base64_to_image_reader()
Converts a base64 data URL to a `ReportLab ImageReader` to be able to be used within a `ReportLab` PDF report.

#### Parameters
- `data_url` (`str`): Base64 data URL of the image.

#### Returns
- `ImageReader`: `ReportLab ImageReader` object.

### create_title_page()
This function creates the elements needed for the title page. This includes the entire list of document elements, title, author, patient identifier, description, and the image to add to the title page. Each element will only be added to the title page if their corresponding variable is both defined and not empty.

#### Parameters
- `elements` (`list`): List of document elements.
- `main_title` (`str`): Main title of the document.
- `author` (`str`): Author of the document.
- `patient` (`str`): Patient identifier.
- `descr` (`str`): Description text.
- `title_img` (`str`): Image path or base64 data URL for the title page.
- `styles` (`dict`): Dictionary of styles for the document.

#### Returns
- `list`: Updated list of document elements.

---
### add_single_images()
This function adds single images with captions to the document elements.

#### Parameters
- `elements` (`list`): List of document elements.
- `imgs` (`list`): List of image paths or base64 data URLs.
- `captions` (`list`): List of captions for the images.
- `styles` (`dict`): Dictionary of styles for the document.
- `fig_n` (`int`): Starting figure number.

#### Returns
- `int`: Updated figure number (`Figure n: ...`)
- `list`: Updates list of document elements.

### add_grid()
Adds a grid of images with their corresponding captions to the document elements. These images will be properly structured according to given grid column amount.

#### Parameters
- `elements` (`list`): List of document elements.
- `imgs` (`list`): List of image paths or base64 data URLs.
- `captions` (`list`): List of captions for the images.
- `styles` (`dict`): Dictionary of styles for the document.
- `fig_n` (`int`): Starting figure number.
- `cols` (`int`, default=`2`): Number of columns in the grid.

#### Returns
- `int`: Updated figure number (`Figure n: ...`)

---
### generate_document()
Generate a PDF document showing analysis results, notes, and metrics. Combines the previously defined functionality from this file to create the Report Document.

#### API Endpoint Request
`POST /generate_doc`

#### Parameters:
- `GenerateDocRequest`:
  Payload containing all necessary information for document generation.
    - `include_title` (`bool`): Whether to include a title page in the document.
    - `main_title` (`str`): Main title of the generated document.
    - `author` (`str`): Author of the generated document.
    - `patient` (`str`): Patient identifier to show on the title page.
    - `descr` (`str`): Description to show on the title page.
    - `logo` (`str`): Logo image base64 data URL displayed in the header.
    - `title_bg` (`str`): Background style or colour for the title page.
    - `title_img` (`str`): Image to show in the title page of the generated document.
    - `titles_li` (`list`): List or array of titles in the generated document.
    - `img_li` (`list`): List or array of images to show in the generated document.
    - `img_captions_li` (`list[list[str]]`, optional): Captions per image.
    - `notes_li` (`list`): List or array of notes from the user to show in the generated document.
    - `metrics_li` (`list`): List or array of metrics shown in analysis page.
    - `path` (`str`, default=`'temp_pdfs/report.pdf'`): Path of saving PDF until user downloads the file.
    - `img_layout` (`list[str]`, optional): Layout per section.
        Supported values:
        - `"single"` (default)
        - `"grid2"`
        - `"grid3"`

#### Functionalities
- The document is generated as a multi-page PDF
- A title page is added if `include_title=True`
- Each analysis section will include given images, captions, notes, and metric tables (if applicable).
- Headers and background styling are applied using page callbacks.
- The PDF is temporarily saved on the server as `temp_pdfs/report.pdf`.

#### Returns
- Generated PDF file to download and display on frontend application.

---
### download_document()
Download generated Report PDF file. on `temp_pdfs/report.pdf`.

#### Parameters
- `path` (`str`, default=`"temp_pdfs"`): The path to the folder that contains `report.pdf`.

#### Returns
- `FileResponse`: The PDF file to download.

---
## Health (health.py)
__Description__: Endpoint file for checking model, device, and image health.

### health_check()
Basic health check endpoint.

Reports:
- Whether the model is loaded
- Which device is used (cpu/cuda)
- Model name (active model)
- Image size expected by the model

#### API Endpoint Request
`GET /health`

#### Returns
`dict`:
  - `status` (`str`): The status of the model, returns `"ok"` if model is loaded, returns `"degraded"` otherwise.
  - `model_loaded` (`bool`): The status if the model is loaded.
  - `model_name` (`str`): The model's defined name.
  - `device` (`str`): Computational device used (`"cpu"` or `"cuda"`)
  - `image_size` (`tuple`): Size of the image.

---
## Models (models.py)
__description__: Model management endpoints and retraining logic.

### ModelMetrics(BaseModel)
Represents quantitative performance metrics of a model, typically used to evaluate prediction accuracy.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `mre` | `float`\|`None` | Mean Radial Error, average error in millimeters between predicted and true points. None if not calculated. |
| `sdr_2mm` | `float`\|`None` | Success Detection Rate at 2 mm, percentage of predictions within 2 mm of ground truth. |
| `sdr_2_5mm` | `float`\|`None` | Success Detection Rate at 2.5 mm, percentage of predictions within 2.5 mm of ground truth. |
| `sdr_3mm` | `float`\|`None` | Success Detection Rate at 3 mm, percentage of predictions within 3 mm of ground truth. |
| `sdr_4mm` | `float`\|`None` | Success Detection Rate at 4 mm, percentage of predictions within 4 mm of ground truth. |

---
### ModelInfo(BaseModel)
Model version information.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Model identifier. |
| `name` | `str` | Model name. |
| `version` | `str` | Model version. |
| `date` | `str` | Model creation date. |
| `status` | `str` | Model status. |
| `size_mb` | `float`\|`None` | Model size. |
| `metrics` | `ModelMetrics`\|`None` | Metrics of model performances. |
| `is_production` | `bool` | Is model in production or not. |

---
### ModelsListResponse(BaseModel)
List of models response.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `total` | `int` | Amount of models. |
| `models` | `list[ModelInfo]` | Model-specific details. |

---
### list_models()
Functionality to list all available model versions from Google Cloud Storage.

#### API Endpoint Request
`GET /models/list`

#### Response Model
[ModelsListResponse](#modelslistresponsebasemodel): Contains the total number of models and a list of ModelInfo objects describing each model.

#### Functionality
- Production Models, located in models/production/ on Google Cloud Storage, are collected. Active model is identified through `active_model.json` and metadata and metrics are loaded if available.
- 10 most recent Backup Models, located in `models/versions/` on Google Cloud Storage, will be returned.
- Response:
  - Total number of models returned.
  - List of `ModelInfo` objects sorted with production

---
### activate_model()
Set a model as the active production model.

#### API Endpoint Request
`POST /models/{model_id}/activate`

#### Functionalities
- Checks if selected model exists.
- Updates active model reference.
- Reloads the model into the backend.
- Returns model name that is activated.

#### Parameters
- `model_id` (`str`): Model identifier.

#### Returns
- `dict`:
    - `message` (`str`): Message containing which model has been activated. `"Model {model_name} is now active and loaded"`
    - `active_model` (`str`): Name of the activated model.

---
### get_active_model()
This functionality gets receives the currently active model.

#### API Endpoint Request
`GET /models/active`

#### Returns
- `dict`:
    - `active_model` (`str`): Currently activated model.
    - `updated_at` (`str`): Date when model was last updated.
    - `is_loaded` (`bool`): Boolean describing if model is loaded.

---
### get_model_details()
Get detailed information about specified model.

#### API Endpoint Request
`GET /models/{model_id}`

#### Parameters
- `model_id` (`str`): The model identifier.

#### Returns
- `dict`:
  - `id` (`str`): Model identifier.
  - `name` (`str`): Model name.
  - `version` (`str`, default=`"v1.0"`): Model version.
  - `architecture` (`str`, default=`"Unknown"`): Model architecture.
  - `metrics` (`dict`, default=`{}`): Dictionary describing the model metrics.
  - `training_info` (`dict`, default=`{}`): Dictionary describing training information.
  - `retrain_date` (`str`, default=`"Unknown"`): The last retraining date.

---
### check_new_models()
Check if there are newly trained models that haven't been reviewed.

- Receives all production models
- Receives the active model
- Check if the new models are retrained models
- Receives metadata.

#### API Endpoint Request
`GET /models/new`

#### Returns
- `dict`
  - `has_new_models` (`bool`): Are there more than 0 new models?
  - `count` (`int`): Amount of new models.
  - `models` (`list[dict]`): List of new models sorted by creation date.

### get_accuracy_interpretation()
Return a clinical interpretation of accuracy from MRE.

Checks the MRE value and returns descriptions related to how well the MRE performs:
|   MRE   |   Level   |
|---------|-----------|
| `<1.5`  | Excellent |
| `<2.0`  | Good      |
| `<3.0`  | Fair      |
| `>=3.0` | Poor      |

#### Parameters
- `mre` (`float`): The MRE (Mean Absolute Error) score of the model.

#### Returns
`dict`:
  - `level` (`str`): The level of performance for the MRE score. Options: `"Poor"`, `"Fair"`, `"Good"`, `"Excellent"`.
  - `color` (`str`): The colour describing the level of performance. Options: `"red"`, `"orange"`, `"blue"`, `"green"`.
  - `description` (`list[str]`): Description describing MRE performance level.

---
### get_reliability_interpretation()
Return a clinical interpretation of reliability from SDR@2mm (Success Detection Rate at 2 mm).

| SDR@2mm (%) | Level     |
| ----------- | --------- |
| `>=85`      | Excellent |
| `>=75`      | Good      |
| `>=60`      | Fair      |
| `<60`       | Poor      |

#### Parameters
- `sdr_2mm` (`float`): Success Detection Rate under 2mm.

#### Returns
- `dict`:
  - `level` (`str`): The reliability level. Options: `"Poor"`, `"Fair"`, `"Good"`, `"Excellent"`.
  - `color` (`str`): Color associated with the level. Options: `"red"`, `"orange"`, `"blue"`, `"green"`.
  - `description` (`str`): A clinical interpretation describing the reliability at this SDR@2mm level.

---
### analyze_winners()
Determine which model wins for each metric.

#### Parameters
- `model_a` (`dict`): Dictionary representing the first model, with keys:
    - `name` (`str`): Name of the model
    - `metrics` (`ModelMetrics` or `dict`): Metrics including `mre`, `sdr_2mm`, `sdr_2_5mm`, `sdr_3mm`, `sdr_4mm`
    - `successful_landmarks` (`dict`): Number of landmarks within 2mm, 2.5mm, 3mm, 4mm
- `model_b` (`dict`): Dictionary representing the second model, with keys:
    - `name` (`str`): Name of the model
    - `metrics` (`ModelMetrics` or `dict`): Metrics including `mre`, `sdr_2mm`, `sdr_2_5mm`, `sdr_3mm`, `sdr_4mm`
    - `successful_landmarks` (`dict`): Number of landmarks within 2mm, 2.5mm, 3mm, 4mm


#### Returns
- `dict`: Comparison results per metric.
  - `accuracy` (`dict`):
    - `winner`(`str`): `"model_a"` or `"model_b"` depending on lower MRE
    - `winner_name` (`str`): Name of the winning model
    - `difference` (`float`): Absolute difference in MRE
    - `clinical_significance` (`str`): Interpretation of whether the MRE difference is clinically meaningful
  - `reliability_2mm` (`dict`):
    - `winner` (`str`): Model with higher SDR@2mm
    - `winner_name` (`str`): Name of the winning model
    - `difference` (`float`): Absolute difference in SDR@2mm
    - `landmark_difference` (`int`): Difference in number of landmarks within 2mm
  - `reliability_2_5mm`, `reliability_3mm`, `reliability_4mm` (`dict`):
    - `winner` (`str`): Model with higher SDR at the given threshold.
    - `winner_name` (`str`): Name of the winning model.

---
### get_mre_difference_significance()
Summarize how clinically important an MRE difference is.

#### Parameters
- `difference` (`float`): MRE Difference.

#### Returns
- `str`: Message describing MRE difference significance:
  - `difference < 0.5`: Minimal difference.
  - `difference < 1.0`: Moderate difference.
  - `difference >= 1.0`: Significant difference.

---
### generate_clinical_recommendation()
Generate an overall clinical recommentation for the two models `model_a` and `model_b` according to their `winning_analysis`.

1. Counts number of metric wins for each model from `winner_analysis`.
2. Selects the model with more wins as the recommended model.
3. In case of a tie, uses MRE as a tiebreaker.
4. Generates reasoning notes for superior accuracy or better reliability.
5. Assigns confidence lebel based on difference in total metric wins:
    - `>=3`: `"High"`
    - `1-2`: `"Moderate"`
    - `0`: `"Low"`

#### Parameters
- `model_a` (`dict`): Dictionary describing model A.
    - `id` (`str`): Unique identifier
    - `name` (`str`): Model name
    - `metrics` (`ModelMetrics` or `dict`): Includes `mre`, `sdr_2mm`, `sdr_2_5mm`, `sdr_3mm`, `sdr_4mm`
    - `successful_landmarks` (`dict`): Count of landmarks within various thresholds.
- `model_b` (`dict`): Dictionary describing model B.
    - `id` (`str`): Unique identifier
    - `name` (`str`): Model name
    - `metrics` (`ModelMetrics` or `dict`): Includes `mre`, `sdr_2mm`, `sdr_2_5mm`, `sdr_3mm`, `sdr_4mm`
    - `successful_landmarks` (`dict`): Count of landmarks within various thresholds.
- `winner_analysis` (`dict`): Output from `analyze_winners()` comparing the two models per metric.

#### Returns
- `dict`: Clinical recommendation summary and reasoning.
  - `recommended_model` (`str`): ID of the recommended model
  - `recommended_model_name` (`str`): Name of the recommended model
  - `summary` (`str`): Short textual summary of recommendation.
  - `reasoning` (`list[str]`): List of reasons why the model was selected (`superior accuracy`, `better reliability`)
  - `confidence` (`str`): Confidence in recommendation based on margin of metric wins: `"High"`, `"Moderate"`, `"Low"`

---
### compare_models_clinical()
Compare two models with clinical metrics and explanations.

- Only supports exactly 2 models; raises HTTP 400 otherwise.
- Supports production and backup models.
- Fetches model files and metadata from GCS (`models/production/` and `models/backups/`).
- Calculates metric-based clinical interpretations:
  - Accuracy → MRE
  - Reliability → SDR@2mm
- Computes metric winners using analyze_winners.
- Generates an overall clinical recommendation with reasoning and confidence using `generate_clinical_recommendation`.
- Raises HTTP 404 if model or metadata files are missing.
- Returns HTTP 500 on other failures.

#### API Endpoint Request
`POST /models/compare/clinical`

#### Parameters
- `request` (`CompareModelsRequest`):
  - `model_ids` (`list[str]`): Exactly two model IDs to compare. Accepted formats: `"production_<model_name>"` or `"backup_<model_name>"`.

#### Returns
- `dict`
  - `models` (`list[dict]`): Metadata and metrics for each model, including clinical interpretations.
    - `id` (`str`): Model identifier.
    - `name` (`str`): Model name.
    - `architecture` (`str`): Model architecture.
    - `version` (`str`): Model version string.
    - `date` (`str`): Upload or retrain date.
    - `size_mb` (`float`): Model file size in megabytes.
    - `metrics` (`dict`): Performance metrics: `mre`, `sdr_2mm`, `sdr_2_5mm`, `sdr_3mm`, `sdr_4mm`.
    - `successful_landmarks` (`dict`): Number of landmarks successfully detected per threshold (2mm, 2.5mm, 3mm, 4mm).
    - `clinical_interpretation` (`dict`): Clinical interpretation of metrics.
  - `winner_analysis` (`dict`): Result of analyze_winners showing metric-level winners and differences. See [analyze_winners](#analyze_winners) for field definitions.
  - `recommendation` (`dict`): Overall recommended model with reasoning and confidence.
    - `recommended_model` (`str`): ID of the recommended model.
    - `recommended_model_name` (`str`): Name of the recommended model.
    - `summary` (`str`): Short textual recommendation.
    - `reasoning` (`list[str]`): List of reasons for recommendation.
    `confidence` (`str`): Confidence level: `"High"`, `"Moderate"`, `"Low"` based on margin of metric wins.
  - `total_landmarks` (`int`): Total number of anatomical landmarks considered for reliability calculations (usually `19`).

---
## Predictions (predictions.py)
__Description__: File to manage all prediction endpoints needed in the deployed application.

### predict_landmarks()
Run the deeep learning model to predict anatomical landmarks on given image.

This function applies resizing the input image to the model's expected size, runs the model to generate heatmaps, and converts them into landmark coordinates with confidence scores.

#### Functionality
1. Resizes the input image to the model’s expected input size.
2. Converts the image to a tensor for PyTorch.
3. Moves the tensor to the configured device.
4. Performs a forward pass through the model to generate heatmaps.
5. Interpolates heatmaps to `(128, 128)` if necessary.
6. Converts heatmaps to `(x, y)` landmark coordinates scaled back to the original image size.
7. Returns both landmarks and their confidence scores.

#### Parameters
- `image` (`PIL.Image.Image`): Input image to run predictions on.
- `model` (`torch.nn.Module`): Trained landmark detection model.
- `config` (`dict`): Configuration dictionary containing the following:
  - `image_size` (`tuple[int, int]`): Model input size as `(height, width)`.
  `device` (`str`): Torch device (`"cpu"` or `"cuda"`).

#### Returns
- `dict`
  - `landmarks` (`list[tuple[float, float]]`): Predicted coordinates of each landmark in original image scale.
  - `confidences` (`list[float]`): Confidence score (0–1) for each predicted landmark.
  - `original_size` (`tuple[int, int]`): Width and height of the original input image.

### predict_from_file()
Predict landmarks from an uploaded image file

NOTE: Does NOT save to GCS automatically.
User must explicitly click "Save" or "Correct + Save" to store data.

#### API Endpoint Request
`POST /predict`

#### Parameters
- `file` (`UploadFile`): Image file to predict landmarks on.
- `ceph_id` (`str`, optional): Unique identifier for the image; if not provided, a UUID is generated automatically.

#### Returns
- `ceph_id` (`str`): Unique identifier for the uploaded image.
- `landmarks` (`list[tuple[float, float]]`): Predicted `(x, y)` coordinates of anatomical landmarks.
- `processing_time` (`float`): Time in seconds taken to process the image.
- `model_version` (`str`): Version of the model used for prediction.

---

## Retraining (retraining.py)
__Description__: File containing the endpoints necassary for retraining through the deployed application.

### validate_data()
Check if enough data is available for retraining

This endpoint checks:
- Number of new images in GCS
- Number of corrected annotations
- Whether minimum threshold is met

#### API Endpoint Request
`POST /retrain/validate`

#### Response Model
`DataValidationResponse`

---
### trigger_retraining()
Trigger a new retraining job

This endpoint:
- Validates data availability (unless force=True)
- Creates a new retraining job
- Runs retraining in background thread
- Returns job ID for status tracking

#### API Endpoint Request
`POST /retrain/trigger`

#### Parameters
- `force` (`bool`): Skip data validation check
- `epochs` (`int`): Override default number of epochs
- `learning_rate` (`int`): Override default learning rate
- `batch_size` (`int`): Override default batch size'

#### Response Model
`RetrainTriggerRequest`

---
### get_job_status()
Get the status of a retraining job

#### API Endpoint Request
`GET /retrain/status/{job_id}`

#### Returns
`RetrainingJobStatus`
- Current status (pending, training, completed, failed, etc.)
- Progress percentage
- Current step description
- Metrics (if completed)
- Error message (if failed)

---
### get_retraining_history()
Get history of recent retraining jobs.

Returns list of recent retraining jobs with:
- Job ID
- Status
- Start/completion times
- Number of images processed
- Success/failure status

#### API Endpoint Request
`GET /retrain/history`

#### Parameters
- `limit` (`int` default=`10`): Maximum number of jobs to return

#### Returns
- `list`: containing recent jobs with:
  - `job_id` (`str`): Job identifier.
  - `status` (`str`): Status of the job.
  - `start_time` (`str`): Start time of the job.
  - `completion_time` (`str`): Completion time of the job.
  - `duration_seconds` (`float`): Duration of job in seconds.
  - `num_images_processed`(`int`): Amount of processed images.
  - `success` (`bool`): Job successful or not (`status == "completed"`)
  - `error_message` (`str`): Error message related to the job.
