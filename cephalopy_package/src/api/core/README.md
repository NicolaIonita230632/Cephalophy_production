<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../../docs/assets/logo_dark.png">
    <source media="(prefers-color-scheme: light)" srcset="../../../docs/assets/logo_light.png">
    <img alt="Cephalopy logo" src="../../../docs/assets/logo_light.png" style="width:80%; max-width:800px; height:auto; display:block; margin:0 auto;">
  </picture>
</p>

---

# API Core Functionalities

## Table of Contents
| Content |
|---------|
| __[Config](#config-configpy)__ |
| - [Landmark Definitions](#landmark-definitions) |
| - [load_config()](#load_config)|
| __[Dependencies](#dependencies-dependenciespy)__ |
| - [get_local_model_path()](#get_local_model_path) |
| - [get_storage_client()](#get_storage_client) |
| - [_get_active_model_blob_path()](#_get_active_model_blob_path) |
| - [_download_model_from_gcs()](#_download_model_from_gcs) |
| - [load_model()](#load_model) |
| - [reload_model()](#reload_model) |
| - [get_model()](#get_model) |
| - [get_config()](#get_config) |
| - [get_current_model_info()](#get_current_model_info) |
| __[Preprocessing](#preprocessing-preprocessingpy)__ |
| - [find_central_point()](#find_central_point) |
| - [preprocess_image()](#preprocess_image) |
| - [image_to_tensor()](#image_to_tensor) |
| - [extract_coordinates_from_heatmap()](#extract_coordinates_from_heatmap) |
| - [heatmaps_to_landmarks()](#heatmaps_to_landmarks) |
| __[Models](#models-modelspy)__ |
| - [DilatedResNetEncoder](#dilatedresnetencodernnmodule-class) |
| - [HeatmapDecoder](#heatmapdecodernnmodule-class) |
| - [DeepFuseCephalogramNet](#deepfusecephalogramnetnnmodule-class)
| __[Retraining Service](#retraining-service-retraining_service.py)__ |
| - [get_storage_client()](#get_storage_client) |
| - [RetrainingConfig](#retrainconfig-class) |
| - [NewDataDataset(Dataset)](#newdatadatasettorchutilsdatadataset-class) |
| - [RetrainingService](#retrainingservice-class) |
| - [get_retraining_service()](#get_retraining_service) |
| __[Retraining Wrapper](#retraining-wrapper-retraining_wrapperpy)__ |
| - [_download_training_data_from_gcs()](#_download_training_data_from_gcs) |
| - [run_retraining_job()](#run_retraining_job) |
| - [upload_model_to_gcs()](#upload_model_to_gcs) |


## Conifg (config.py)

### Landmark Definitions
Landmarks as defined in the variable `LANDMARK_NAMES`:
| Title                 | Symbol |
| --------------------- | ------ |
| A-point               | A      |
| Anterior Nasal Spine  | ANS    |
| B-point               | B      |
| Menton                | Me     |
| Nasion                | N      |
| Orbitale              | Or     |
| Pogonion              | Pog    |
| Posterior Nasal Spine | PNS    |
| Sella                 | S      |
| Articulare            | Ar     |
| Gnathion              | Gn     |
| Gonion                | Go     |
| Porion                | Po     |
| Lower Incisor Tip     | LIT    |
| Upper Incisor Tip     | UIT    |
| Labrale inferius      | Li     |
| Labrale superius      | Ls     |
| Soft Tissue Pogonion  | Pos    |
| Subnasale             | Sn     |

---

### load_config()
Loads model and runtime configuration from a JSON file.
If the file is not found, a safe default configuration is returned to ensure the system can still run.

#### Parameters
- `config_path` (`str`): Path to JSON configuration file.

#### Returns
- `dict` containing configuration parameters:
  - `"device"` (`str`): Computational device (`cpu` or `cuda`)
  - `"image_size"` (`List[int]`): input image resolution.
  - `"heatmap_size"` (`List[int]`): Output heatmap resolution.
  - `"num_landmarks"` (`int`): Number of landmarks
  - `"sigma"` (`float`): Gaussian sigma for heatmap generation.

---

## Dependencies (dependencies.py)
__Description__: Core dependencies: model loading, config, and model info.

This version loads the active DeepFuse model from Google Cloud Storage
instead of a local .pth file.

---
### get_local_model_path()
Get local path of the model file.
This path is: PROJECT_ROOT/models/deepfuse_model/best_model.pth

#### Parameters
- None

#### Returns
- `Path`: `PROJECT_ROOT`/models/deepfuse_model/best_model.pth

### get_storage_client()
Initialize Google Cloud Storage client from environment variables.

#### Parameters
- None

#### Returns
- storage.Client(): an initialized and authenticated Google Cloud Storage client

#### Errors
| Condition |	Behavior |
|-----------|----------|
|`google-cloud-storage` not installed |	Raises `RuntimeError` |
| No explicit credentials found |	Attempts Application Default Credentials |
| Invalid or missing credentials | Error raised internally by the GCS client |

---
### _get_active_model_blob_path()
Read models/production/active_model.json from GCS.
If present, return models/production/{active_model}.pth
Else fall back to DEFAULT_MODEL_BLOB.

#### Parameters
- None

#### Returns
- `str`: `"models/production/{active_model}.pth"` or `DEFAULT_MODEL_BLOB` as fallback.

---
### _download_model_from_gcs()
Download the active model from GCS to GCS_MODEL_PATH.
Returns the local path.

#### Parameters
- None

#### Returns
- `str`: Local model path, the filesystem path where the model was downloaded.
- `str`: Model name, the name of downloaded model.

#### Errors
| Condition |	Raised Error |
|-----------|--------------|
| Model blob does not exist in GCS | `FileNotFoundError` |
| GCS credentials unavailable |	Error propagated from `get_storage_client()` |


#### Side Effects
- Creates the local directory for `GCS_MODEL_PATH` if it does not exist
- Updates the global variable `_current_model_name`

---
### load_model()
Load model from GCS (called on startup via lifespan in main.py) or local.

#### Parameters
- None

#### Side Effects
This function changes the following global application variables:
- `_model`: Loaded PyTorch model instance.
- `_device`: Active torch device.
- `_is_loaded`: Indicates if model is loaded or not
- `_config`: Updated with selected device.
- `_current_modal_name: Name of the active model.

#### Returns
- None, prepares the model for inference by populating global state used by prediction endpoints.'


#### Errors
| Condition | Raised Error |
|-----------|--------------|
| GCS download fails and local model is missing | `FileNotFoundError` |
| Model loading or initialisation fails | Propagated exception |

---
### reload_model()
Reload model when active model changes (called from /models/{id}/activate).

This function runs the function load_model with different logging info.

#### Parameters
- None

#### Returns
- None

---
### get_model()
Get current loaded model. Raise if not loaded.
Used by predictions.py

#### Parameters
- None

#### Returns
- `torch.nn.Module`: Active, fully initialised model in evaluation mode.

#### Errors
| Condition | Raised Error |
|-----------|--------------|
| Model has not been loaded | `RuntimeError` |

---
### get_config()
Return config dict used by predictions.py
Must contain at least `device` and `image_size`.

#### Parameters
- None

#### Returns
- `Dict[str, Any]`: Runtime configuration dictionary

---
### get_current_model_info()
Info used by /models/active endpoint.

#### Parameters
- None

#### Returns
- `dict`
  - `"is_loaded"` (`bool`): Boolean suggesting if model is currently loaded.
  - `"model_name"` (`str | None`): Name of the active model.
  - `"active_model"` (`str | None`): Alias for `model_name`.
  - `"device"` (`str | None`): Device used for inference (`cpu` or `cuda`).

---

## Preprocessing (preprocessing.py)
__Description__: Data preprocessing file, contains Preprocessing functions for cephalometric images and annotations.
Includes image cropping based on contour detection and landmark adjustment. This file is usually run before model training.

### find_central_point()
Find the contour closest to the center of the image.
1. Calculate the center of the image.
2. For each contour, calculate its bounding rectangle and center.
3. Compute the distance from the contour center to the image center.
4. Return the contour with the minimum distance.
5. Ignore contours with area less than 200 pixels.

#### Inputs
- `img` (`numpy.ndarray`): Original image.
- `contours` (`list`): List of contours from cv2.findContours.

#### Outputs
- `central_contour` (`numpy.ndarray`): The contour closest to the center of the image.
---

### preprocess_image()
Preprocess the image including optional cropping

#### Processing Steps
1. Convert image to NumPy array
2. Optional cropping (enabled by default):
    - Converts image to grayscale
    - Enhances contrast using histogram equalization
    - Applies binary thresholding
    - Detects contours and identifies a central reference contour
    - Crops the image based on the detected anatomy with a safety margin
3. Fallback behavior
    - If cropping fails or no contour is found, the full image is used
4. Color normalization
    - Converts grayscale images to RGB
5. Resize
    - Resizes the image to `config["image_size"]` using bilinear interpolation

#### Parameters
- `image` (`PIL.Image.Image`): Input image
- `config` (`dict`): Runtime configuration (must contain `image_size`)
- `apply_cropping` (`bool`): Indicates to apply cropping or not.

#### Returns
- `tuple`
  - `processed_image` (`PIL.Image.Image`): Preprocessed and resized image.
  - `crop_offset_x` (`int`): Horizontal pixel offset applied during cropping.
  - `crop_offset_y` (`int`): Vertical pixel offset appliied during cropping.

---
### image_to_tensor()
Convert PIL image to normalized tensor suited for model inference. This function performs the necessary transformations to match the model's expected input format, color channel ordering, normalisation, and batch dimension.

#### Preprocessing Steps
1. Convert PIL image to NumPy array
    - Converts image pixels to `float32`
    - Normalises values to the range [0, 1]
2. Convert NumPy array to PyTorch tensor
3. Handle grayscale images
    - Adds a channel dimension if missing.
    - Repeats grayscale channel to produce 3-channel RGB tensor.
4. Move colour channel to before the image shape.
    - Convert image from `(H, W, C)` to `(C, H, W)`.
5. Apply ImageNet normalisation with the following selected values:
    - Mean: `[0.485, 0.456, 0.406]`
    - Standard Deviation: `[0.229, 0.224, 0.225]`.
6. Add batch dimension with output shape of `(1, 3, H, W)`

#### Parameters
- `image` (`PIL.Image.Image`): Input image to be converted.

#### Returns
- `Torch.Tensor`: Batch tensor with shape `(1, 3, H, W)`.

---
### extract_coordinates_from_heatmap()
Extract single landmark coordinate from heatmap with sub-pixel refinement.

#### Preprocessing Steps
1. Find heatmap peak: `(x_max, y_max)`
2. Sub-pixel refinement
    - Uses small 3x3 neighbourhood region around the peak.
    - Compute a weighted average using heatmap values to improve accuracy
3. Scale coordinates to original image size.
4. Compute confidence.

#### Parameters
- `heatmap`(`np.ndarray`): 2D heatmap output from the model for a single landmark.
- `original_size` (`tuple[int, int]`): Original image size `(width, height)`.
- `heatmap_size` (`tuple[int, int]`, Optional): Size of the heatmap `(width, height)`.

#### Returns
- `tuple`: Contains the coordinates of the predicted landmark scaled to original image size, including confidence.

### heatmaps_to_landmarks()
Convert heatmap predictions to landmark coordinates with sub-pixel accuracy.

#### Parameters
- `heatmaps` (`torch.Tensor`): Tensor of shape `(batch, num_landmarks, H, W)`
- `original_size`: Original image size `(width, height)`
- `crop_offset_x`: X offset from cropping
- `crop_offset_y`: Y offset from cropping

#### Returns
- `Tuple` of `(landmarks, confidences)`

---
## Models (models.py)
__Description__: The model file (model.py) contains the classes used for the model. These classes are based on "Multimodal deep learning for cephalometric landmark detection and treatment prediction", Gao & Tang, Scientific Reports 2025.

The implementation of these classes focuses on the lateral cephalogram encoder for DeepFuse, which uses the following:
- Modified ResNet-50 with dilated convolutions.
- Heamap-based landmark detection.
- Multi-scale feature extraction

---
### DilatedResNetEncoder(nn.Module) Class
This is the encoder class containing the modified ResNet-50 backbone with dilated convolutions in later stages. The idea of this Encoder comes from Section 3.2 from the paper:

"The lateral cephalogram encoder employs a modified ResNet architecture with dilated convolutions to capture multi-scale features while preserving spatial resolution crucial for precise landmark localization."

#### Architecture Details
- __Backbone__: Pretrained ResNet-50 (`torchvision.models.resnet50`).
- __Early Layers__: `conv1`, `bn1`, `relu`, and `maxpool` are kept identical to original ResNet.
- __Feature Stages__:
  - `layer1`: Standard ResNet block (stride 4)
  - `layer2`: Standard ResNet block (stride 8)
  - `layer3`: Modified with dilation = 2, keeping stride 8
  - `layer4`: Modified with dilation = 4, keeping stride 8

This ensures deeper layers not to reduce resolution further but still gain larger receptive fields with dilation.

#### Output
The forward pass returns multi-scale feature maps:
- `f1`: Low-level features
- `f2`: Mid-level features
- `f3`: High-level features + dilation
- `f4`: Deepest features + dilation

#### Example Usage
```python
encoder = DilatedResNetEncoder()
f1, f2, f3, f4 = encoder(images)
```
---
### HeatmapDecoder(nn.Module) Class
The U-Net style decoder for heatmap generation. It uses skip connections to recover spatial resolution.

Takes multi-scale feature maps from an encoder, in this case DilatedResNetEncoder, as input. It gradually upsamples deeper features using transposed concolutions. Eventually combines upsamples features with endocer features via concatenated skip connections. In the end, refines the combined features using convolutional blocks with batch normalisation and ReLU activations to produce a final heatmap tensor predicting landmark locations.

#### Architecture Details:
- `up4`, `up3`, `up2`: Transposed convolutions for upsampling deeper feature maps.
- `conv4`, `conv3`, `conv2`: Convolutional blocks to merge skip connections and refine features.
- final: 1x1 convolution to output num_landmarks heatmaps.

#### Input
- `f1`, `f2`, `f3`, `f4` (`torch.Tensor`): Feature maps from the encoder at different resolutions.

#### Output
- `heatmaps` (`torch.Tensor`): Predicted heatmaps for each landmark, typically of shape `[B, num_landmarks, H, W]`

#### Example Usage
```python
encoder = DilatedResNetEncoder()
decoder = HeatmapDecoder()

# Forward pass
f1, f2, f3, f4 = encoder(images)
heatmaps = decoder(f1, f2, f3, f4)
```
---
### DeepFuseCephalogramNet(nn.Module) Class
The complete DeepFuse network for cephalogram landmark detection, combines both the DilatedResNetEncoder() class and the HeatmapDecoder() class to produce heatmaps predicting anatomical landmarks.

#### Architecture Overview
- `Encoder`: `DilatedResNetEncoder`
  - Modified ResNet-50 with dilated convolutions
- `Decoder`:
  - U-Net style with skip connections
- `Output`:
  - Heatmaps for each landmark

#### Input
`x` (`torch.Tensor`): Batch of images.

#### Output
`heatmaps` (`torch.Tensor`): Predicted heatmaps for num_landmarks anatomical landmarks.

#### Example Usage
```python
model = DeepFuseCephalogramNet(num_landmarks=19)

# Forward pass
images = torch.randn(2, 3, 512, 512)
heatmaps = model(images)
```
---

## Retraining Service (retraining_service.py)
__Description__: Retraining service for model fine-tuning.

### RetrainConfig Class
Centralized configuration object for the model retraining service.
This class defines all Google Cloud Storage paths, retraining hyperparameters, and runtime directories required to fine-tune and version models using newly corrected data.

Configuration values are primarily sourced from environment variables, with sensible defaults provided for local development and testing.

#### Configuration Fields
__Storage__
| Attribute | Type | Description |
|-----------|------|-------------|
| `BUCKET_NAME` | `str` | GCS bucket containing models, data, and logs |
| `CURRENT_MODEL_PATH` | `str` | Path to the active production model in GCS |
| `NEW_DATA_FOLDER` | `str` | Folder containing newly inferred images |
| `CORRECTED_ANNOTATIONS_FOLDER` | `str` | Folder with manually corrected annotations |
| `MODEL_VERSIONS_FOLDER` | `str` | Destination for versioned models |
| `ARCHIVE_FOLDER_PREFIX` | `str` | Prefix used to archive processed retraining data |
| `RETRAIN_LOGS_FOLDER` | `str` | Folder for retraining logs and metrics |

__Retraining Parameters__
| Attribute | Type | Description |
|-----------|------|-------------|
| `MIN_NEW_IMAGES` | `int` | Minimum number of new samples required to trigger retraining |
| `FINE_TUNE_EPOCHS` | `int` | Number of fine-tuning epochs |
| `LEARNING_RATE` | `float` | Learning rate for retraining |
| `BATCH_SIZE` | `int` | Batch size used during fine-tuning |

__Working Directory__
| Attribute | Type | Description |
|-----------|------|-------------|
| `WORK_DIR` | `str` | Local working directory for temporary retraining artifacts. |

#### Environment Variables
The following environment variables can be used to override the set defaults.
- `BUCKET_NAME`: GCS bucket name, defaults to `deepfuse-models-230632`.
- `MIN_NEW_IMAGES`: Minimum samples before retraining, defaults to `50`.
- `FINE_TUNE_EPOCHS`: Fine-tuning epochs `20`.
- `LEARNING_RATE`: Training learning rate, defaults to `1e-5`.
- `BATCH_SIZE`: Training batch size, defaults to `4`.

#### Example Usage
```python
config = RetrainingConfig()

if num_new_images >= config.MIN_NEW_IMAGES:
  retrain_model(
      model_path=config.CURRENT_MODEL_PATH,
      data_folder=config.NEW_DATA_FOLDER,
      epochs=config.FINE_TUNE_EPOCHS,
      lr=config.LEARNING_RATE,
  )
```

---
### NewDataDataset(torch.utils.data.Dataset) Class
Pytorch dataset for newly collected cephalogram images paired with corrected landmark annotations used during retraining.

#### Functions
- Loads newly collected training data.
- Match images with corrected annotation JSON files.
- Convert landmark coordinates into heatmap supervision.
- Provide model-ready tensors for fine-tuning.

#### Parameters
- `data_dir` (`str`): Directory containing images and corrected annotation JSON files.

#### Data Criteria
__Images__
- Supported formats: `.png`, `.jpg`, `.jpeg`, `.bmp`.

__Annotations__
- Annotations must be in JSON format.
- Landmark formats supported:
    - Dictionary: `{ "x": float, "y": float }`
    - List / tuple: `[x, y]`

#### _generate_heatmaps()
Generates Gaussian heatmaps for each landmark.

| Property            | Value            |
| ------------------- | ---------------- |
| Number of landmarks | `19`             |
| Heatmap resolution  | `128 × 128`      |
| Gaussian sigma      | `2.0`            |
| Output shape        | `(19, 128, 128)` |

__Returns__
- `img_tensor` (`torch.Tensor`): Normalised image tensor of shape `(3, 512, 512)`.
- `heatmaps` (`torch.Tensor`): Gaussian landmark heatmaps of shape `(19, 128, 128)`

---
### RetrainingService Class
Service for managing model retraining operations. Important functionalities will be noted below, but there are also more smaller functionalities not specified here due to being very small.

#### Functionalities
- Validate availability of new training data in Google Cloud Storage.
- Start retraining jobs asynchronously.
- Track retraining job status and progress
- Expose job status and job history.
- Archive training data after successful retraining.

#### Parameters
- `config` (`RetrainingConfig | None`): Optional retraining configuration.

#### validate_data_availability()
Checks if sufficient new data exists to safely trigger retraining

__Returns__
```json
{
  "has_enough_data": true,
  "num_new_images": 72,
  "num_corrections": 68,
  "min_threshold": 50,
  "message": "Sufficient data available: 72 images (threshold: 50)"
}
```

#### trigger_retraining()
Starts a new retraining job in a background thread.

__Parameters__
- `force` (`bool`): Skip data validation.
- `epochs` (`int | None`): Override default fine-tuning epochs.
- `learning_rate` (`float | None`): Override learning rate.
- `batch_size` (`int | None`): Override batch size.

__Functionality__
- Validates data availability, unless `force` is specified as `force=True`.
- Creates a new and unique job ID.
- Stores job metadata in memory.
- Launches retraining.

__Returns__
```json
{
  "job_id": "uuid",
  "status": "pending",
  "message": "Retraining job started"
}
```

#### _archive_training_data(job_id)
Moves all used training artifacts to a timestamped archive folder in Google Cloud Storage.

#### get_job_status()
Returns the full job state for a given retraining job.

__Parameters__
- `job_id`: The id of selected job.

__Returns__
- `self.jobs.get(job_id)`: The status of selected job.

#### get_job_history()
Returns the most recent retraining jobs, sorted by start time.

__Parameters__
- `limit`: Limit of how many retraining jobs to show.

__Returns__
- `jobs[:limit]`: the selected amount of recent jobs.

---
### get_retraining_service()
Get or create the retraining service instance.

#### Parameters
- None

#### Returns
- `RetrainingService`: Active retraining service instance.

---

## Retraining Wrapper (retraining_wrapper.py)
Wrapper for retraining that integrates actual training code with GCS upload.

### _download_training_data_from_gcs()
Download training data from Google Cloud Storage to a local directory.

#### Parameters
- `local_dir` (`Path`): Local directory to download data to.

#### Returns
- `Path`: `Path` to the downloaded data directory.

---
### run_retraining_job()
Run actual model retraining and upload to Google Cloud Storage.

#### Parameters
- `job_id` (`str`): Unique identifier for the training job.
- `epochs` (`int`, default=`10`): Number of training epochs.
- `learning_rate` (`float`, default=`0.0001`): Learning rate for optimizer.
- `batch_size` (`int`, default=`8`): Batch size for training.
- `dataset_paths` (`list`, default=`None`): List of paths to training data (if None, downloads from GCS).
- `progress_callback` (default=`None`): Function to call with progress updates.

#### Returns:
- `dict`: Contains model_path, metrics, and metadata.

---
### upload_model_to_gcs()
Upload trained model and metadata to Google Cloud Storage.

#### Parameters
- `model_path` (`str` | `Path`): Path to the .pth file.
- `model_name` (`str`): Name for the model in GCS.
- `metrics` (`Dict`): Dictionary of performance metrics.
- `training_config` (`Dict`): Dictionary of training configuration.
