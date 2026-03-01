<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../../docs/assets/logo_dark.png">
    <source media="(prefers-color-scheme: light)" srcset="../../../docs/assets/logo_light.png">
    <img alt="Cephalopy logo" src="../../../docs/assets/logo_light.png" style="width:80%; max-width:800px; height:auto; display:block; margin:0 auto;">
  </picture>
</p>

---
# Data Processing

## Table of Contents

1. [Preprocessing (preprocessing.py)](#preprocessing-preprocessingpy)
    1. [rename_dataset_files](#rename_dataset_files)
    2. [find_central_point](#find_central_point)
    3. [plot_landmarks](#plot_landmarks)
    4. [image_cropping](#image_cropping)
    5. [dataset_handling](#dataset_handling)
2. [Process Class (process_class.py)](#process-class-process_classpy)
    1. [CephalometricDataset](#cephalometricdatasetdataset-class)
    2. [save_config](#save_config)
3. [Quality (quality.py)](#quality-qualitypy)
    1. [verify_image_landmarks](#verify_image_landmarks)


## Preprocessing (preprocessing.py)
__Description__: Data preprocessing file, contains Preprocessing functions for cephalometric images and annotations.
Includes image cropping based on contour detection and landmark adjustment. This file is usually run before model training.

### rename_dataset_files()
Rename cephalogram images and annotation JSONs to follow the convention:
`datasetname_001_cephalogram.png` and `datasetname_001_annotation.json`, while keeping the original alignment.

#### Inputs
- `dataset_path` (`str`): Path to the dataset directory containing 'Cephalograms' and 'Annotations' subdirectories.

#### Effects
- Overwrites image files to rename them to the following naming convention: `[datasetname]_[id]_[cephalogram/annotation].[png/json]`

#### Usage
- This function is automatically used in [dataset_handling()](#dataset_handling)
---
### find_central_point()
Find the contour closest to the center of the image.
1. Calculate the center of the image.
2. For each contour, calculate its bounding rectangle and center.
3. Compute the distance from the contour center to the image center.
4. Return the contour with the minimum distance.
5. Ignore contours with area less than 200 pixels.

#### Inputs
- `img` (`numpy.ndarray`): Original image.
- `contours` (`list`): List of contours from `cv2.findContours`.

#### Outputs
- `central_contour` (`numpy.ndarray`): The contour closest to the center of the image.

#### Usage
- This function is automatically used in [dataset_handling()](#dataset_handling)
---

### plot_landmarks
Adjust the landmark coordinates to the cropped image, possible to plot landmarks on the cropped image when `display=True`.
#### Inputs
- `ann_path` (`str`): Path to the annotation JSON file.
- `img` (`numpy.ndarray`): Cropped image.
- `x_line` (`int`): X coordinate of the cropping line.
- `y_line` (`int`): Y coordinate of the cropping line.
- `title` (`str`): Title for the plot.
- `display` (`bool`): Whether to display the image with landmarks.

#### Outputs
- `ann_data` (`dict`): Adjusted annotation data.

#### Usage
- This function is automatically used in [dataset_handling()](#dataset_handling) and [image_cropping()](#image_cropping).
---
### image_cropping()
Crop the left side of the image based on contour detection.
1. Apply a binary threshold to the matched histogram image.
2. Find contours in the binary image.
3. Identify the contour closest to the center of the image.
4. Determine the leftmost point of this contour.
5. Crop the image from this leftmost point minus a margin.
6. Adjust landmark coordinates accordingly.

#### Inputs
- `img` (`numpy.ndarray`): Original image.
- `matched` (`numpy.ndarray`): Histogram matched grayscale image.
- `im_file` (`str`): Image filename for display title.
- `ann_path` (`str`): Path to the annotation JSON file.
- `margin` (`int`): Margin to add when cropping.
- `display` (`bool`): Whether to display the cropped image with landmarks.

#### Outputs
- `img` (`numpy.ndarray`): Cropped image.
- `ann` (`dict`): Adjusted annotation data.

#### Usage
- This function is automatically used in [dataset_handling()](#dataset_handling).
---

### dataset_handling()
Process the dataset of cephalometric images and annotations. Before using the function, ensure that a contrasting image is set.
1. Load images and annotations from specified directories.
2. For each image:
    - Convert to grayscale and match histogram with reference image.
    - Determine if cropping is needed based on left region analysis.
    - Crop image and adjust landmarks if necessary.
    - Save processed images and updated annotations to output directory.

#### Inputs
- `dataset_paths` (`list` of `str`): List of dataset directory paths.
- `output_dir` (`str`): Directory to save processed images and annotations.
- `reference_img_path` (`str`): Path to the reference image for histogram matching.
- `margin` (`int`): Margin to add when cropping images.
- `display` (`bool`): Whether to display images with landmarks during processing.

#### Effects
- Saves the processed images to the given `output_dir`

#### Example Usage
```python
dataset_paths = [
    "data/dataset1",
    "data/dataset2"
]

output_dir = "data/processed_dataset"

# Call the dataset handling function
dataset_handling(
    dataset_paths=dataset_paths,
    output_dir=output_dir,
    reference_img_path="data/contrasting/Cephalograms/54.bmp",
    margin=200,
    display=False
)
```
---
## Process Class (process_class.py)
__Description__: This file contains the Cephalometric Dataset Class for DeepFuse Model. Using the codes in this file, full processing right before model training can be done along with creation of the config file.

### CephalometricDataset(Dataset) Class
Dataset for DeepFuse with heatmap-based landmark detection.
Key differences from coordinate regression:
- Generates 2D Gaussian heatmaps for each landmark
- Preserves spatial information better
- More robust to initialization

#### Inputs
- `dataset_paths` (`list` of `str`): List of dataset directory paths. These dataset folders must contain the folders: `Cephalograms` and `Annotations`, containing the naming convention defined in `preprocessing.py`: `[dataset]_[id]_[cephalogram/annotation].[png/json]`
- `image_size` (`tuple`): Size to which images are resized (height, width).
- `heatmap_size` (`tuple`): Size of the generated heatmaps (height, width).
- `sigma` (`float`): Standard deviation for Gaussian heatmaps.

#### Outputs
- `Dataset` object for DeepFuse landmark detection.

#### Example Usage
This class is automatically used when training the model, but to use it outside of a model, it can be done as the following:
```python
dataset_paths = [
    "data/processed_dataset",
]

# Initialize dataset
dataset = CephalometricDataset(
    dataset_paths=dataset_paths,
    image_size=(512, 512),
    heatmap_size=(128, 128),
    sigma=2.0
)

# Later on, you can use it in a DataLoader.
dataloader = DataLoader(dataset, batch_size=2, shuffle=True, num_workers=0)
```
---

### save_config()
Save configuration parameters to JSON for reproducibility.

#### Inputs
- `seed` (`int`, `default=42`): Random seed for reproducibility.
- `device` (`str`, `default="cuda"`): Device to use ('cuda' or 'cpu').
- `batch_size` (`int`, `default=8`): Batch size for training.
- `num_epochs` (`int`, `default=150`): Number of training epochs.
- `learning_rate` (`float`, `default=1e-4`): Learning rate for optimizer.
- `image_size` (`tuple`, `default=(512, 512)`): Size to which images are resized.
- `heatmap_size` (`tuple`, `default=(128, 128)`): Size of the generated heatmaps.
- `num_landmarks` (`int`, `default=19`): Number of landmarks to detect.
- `sigma` (`float`, `default=2.0`): Standard deviation for Gaussian heatmaps.
- `patience` (`int`, `default=25`): Patience for early stopping.
- `train_ratio` (`float`, `default=0.7`): Proportion of data for training.
- `val_ratio` (`float`, `default=0.15`): Proportion of data for validation.
- `test_ratio` (`float`, `default=0.15`): Proportion of data for testing.
- `checkpoint_dir` (`str`, `default="checkpoints"`): Directory to save model checkpoints.
- `model_dir` (`str`, `default="deepfuse_model"`): Directory to save the model and config.
- `config_file` (`str`, `default="config_deepfuse_ceph.json"`): Filename to save the configuration JSON.

#### Returns
- `CONFIG` (`dict`): Configuration dictionary.

#### Effects
- Saves the config as .json file at `models/[model_dir]/config.json`
#### Example Usage
```python
# Just call the function with the values you want.
config = save_config(
    seed=123,
    device="cuda",
    batch_size=4,
    num_epochs=100,
    learning_rate=5e-5,
    image_size=(512, 512),
    heatmap_size=(128, 128),
    num_landmarks=19,
    sigma=2.5,
    patience=20,
    train_ratio=0.7,
    val_ratio=0.15,
    test_ratio=0.15,
    checkpoint_dir="checkpoints",
    model_dir="deepfuse_cephalometric",
    config_file="config_deepfuse_ceph.json"
)
```
---

## Quality (quality.py)
__Description__: This file is a submodule for data quality related functions.

### verify_image_landmarks()
Verify that all landmarks in an annotation file fall within image bounds.

#### Inputs
- `image_path` (`str` or `Path`): Path to the image file.
- `annotation_path` (`str` or `Path`): Path to the JSON annotation file containing landmark coordinates.
- `verbose` (`bool`, `default=True`): If `True`, log detailed information about each landmark during verification.

#### Outputs
- `dict`: A dictionary containing verification results with the following keys:
    - `image_path` (str): `Path` to the verified image.
    - `annotation_path` (`str`): Path to the annotation file.
    - `image_resolution` (`tuple` of `int`): Image dimensions as (width, height).
    - `total_landmarks` (`int`): Total number of landmarks in the annotation.
    - `invalid_count` (`int`): Number of landmarks outside image bounds.
    - `invalid_landmarks` (`list` of `tuple`): List of `(name, x, y)` for invalid landmarks. Empty list if `verbose=False` to save memory.
    - `is_valid` (`bool`): `True` if all landmarks are within bounds, `False` otherwise.

#### Raises
- `FileNotFoundError`: If either the image or annotation file doesn't exist.
- `ValueError`: If there's an error opening the image or parsing the JSON.
- `KeyError`: If the annotation JSON doesn't contain a 'landmarks' key.

#### Notes
For memory efficiency, detailed landmark lists are only stored when verbose=True. Otherwise, only counts are returned.

#### Example Usage
```python
result = verify_image_landmarks(
    'path/to/image.jpg',
    'path/to/annotation.json'
)
if result['is_valid']:
    print("All landmarks are valid!")
```
