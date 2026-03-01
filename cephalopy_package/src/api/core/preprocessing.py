"""Image preprocessing functions"""

import logging

import cv2
import numpy as np
import torch
from PIL import Image

from api.core.config import LANDMARK_NAMES

logger = logging.getLogger(__name__)


def find_central_point(img, contours):
    """
    Find the contour closest to the center of the image.
    """
    img_center = (img.shape[1] / 2, img.shape[0] / 2)
    min_distance_cntr = float("inf")
    central_contour = None
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 200:
            x, y, w, h = cv2.boundingRect(cnt)
            # Center of this contour
            cnt_center = (x + w / 2, y + h / 2)
            # Distance to image center
            distance_cntr = np.sqrt(
                (cnt_center[0] - img_center[0]) ** 2
                + (cnt_center[1] - img_center[1]) ** 2
            )

            if distance_cntr < min_distance_cntr:
                min_distance_cntr = distance_cntr
                central_contour = cnt
    return central_contour


def preprocess_image(
    image: Image.Image, config: dict, apply_cropping: bool = True
) -> tuple:
    """
    Preprocess the image including optional cropping

    Returns:
        Tuple of (processed_image, crop_offset_x, crop_offset_y)
    """
    # Convert PIL to numpy array
    img_np = np.array(image)

    crop_offset_x = 0
    crop_offset_y = 0
    margin = 200

    if apply_cropping:
        try:
            # Convert to grayscale for cropping detection
            if len(img_np.shape) == 3:
                gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_np.copy()

            # Apply histogram equalization for better contrast
            # This is a simplified version
            # - you might have a more sophisticated histogram matching
            matched = cv2.equalizeHist(gray)

            # Set a binary threshold to get a binary image
            _, thresh = cv2.threshold(matched, 200, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(
                thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            # Find the central point contour
            central_contour = find_central_point(img_np, contours)

            if central_contour is not None:
                # Find the leftmost point of the central contour
                leftmost_point = tuple(
                    central_contour[central_contour[:, :, 0].argmin()][0]
                )

                # Calculate cropping coordinates
                x_line = max(leftmost_point[0] - margin, 0)
                y_line = margin

                # Check if this crop removes more than 40% of the image
                if x_line > img_np.shape[1] * 0.4:
                    x_line = int(img_np.shape[1] * 0.4)

                # Store offsets for later landmark adjustment
                crop_offset_x = x_line
                crop_offset_y = y_line

                # Crop the image
                img_np = img_np[y_line:, x_line:]

                logger.info(f"Image cropped: {crop_offset_x} left, {crop_offset_y} top")
            else:
                logger.warning(
                    "No suitable contour found for cropping, using full image"
                )

        except Exception as e:
            logger.error(f"Cropping failed: {e}, using full image")
            # If cropping fails, use the full image with zero offsets
            crop_offset_x = 0
            crop_offset_y = 0

    # Convert back to PIL and resize
    if len(img_np.shape) == 2:
        # If grayscale, convert to RGB
        img_np = cv2.cvtColor(img_np, cv2.COLOR_GRAY2RGB)

    image_pil = Image.fromarray(img_np)
    image_resized = image_pil.resize(
        (config["image_size"][1], config["image_size"][0]), Image.BILINEAR
    )

    return image_resized, crop_offset_x, crop_offset_y


def image_to_tensor(image: Image.Image) -> torch.Tensor:
    """Convert PIL image to normalized tensor"""
    # Convert to numpy and normalize
    image_np = np.array(image, dtype=np.float32) / 255.0
    image_tensor = torch.from_numpy(image_np)

    # If grayscale, add channel dimension
    if len(image_tensor.shape) == 2:
        image_tensor = image_tensor.unsqueeze(0).repeat(3, 1, 1)
    else:
        image_tensor = image_tensor.permute(2, 0, 1)

    # Apply ImageNet normalization
    mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
    image_tensor = (image_tensor - mean) / std

    # Add batch dimension
    return image_tensor.unsqueeze(0)


def extract_coordinates_from_heatmap(heatmap, original_size, heatmap_size=(128, 128)):
    """
    Extract single landmark coordinate from heatmap with sub-pixel refinement
    """
    # Find peak
    y_max, x_max = np.unravel_index(heatmap.argmax(), heatmap.shape)

    # Sub-pixel refinement for better accuracy
    H, W = heatmap.shape
    y_min = max(0, y_max - 2)
    y_max_bound = min(H, y_max + 3)
    x_min = max(0, x_max - 2)
    x_max_bound = min(W, x_max + 3)

    region = heatmap[y_min:y_max_bound, x_min:x_max_bound]
    y_coords, x_coords = np.meshgrid(
        np.arange(y_min, y_max_bound), np.arange(x_min, x_max_bound), indexing="ij"
    )

    total_weight = region.sum()
    if total_weight > 0:
        y_refined = (region * y_coords).sum() / total_weight
        x_refined = (region * x_coords).sum() / total_weight
    else:
        y_refined, x_refined = y_max, x_max

    # Scale to original image size
    x_original = x_refined * (original_size[0] / heatmap_size[1])
    y_original = y_refined * (original_size[1] / heatmap_size[0])

    confidence = float(heatmap.max())  # Return confidence too

    return x_original, y_original, confidence


def heatmaps_to_landmarks(
    heatmaps: torch.Tensor,
    original_size: tuple,
    crop_offset_x: int = 0,
    crop_offset_y: int = 0,
) -> tuple:
    """
    Convert heatmap predictions to landmark coordinates with sub-pixel accuracy

    Args:
        heatmaps: Tensor of shape (batch, num_landmarks, H, W)
        original_size: Original image size (width, height)
        crop_offset_x: X offset from cropping
        crop_offset_y: Y offset from cropping

    Returns:
        Tuple of (landmarks, confidences)
    """
    landmarks = []
    confidences = []

    # Remove batch dimension if present
    if heatmaps.dim() == 4:
        heatmaps = heatmaps[0]

    heatmaps_np = heatmaps.cpu().numpy()
    heatmap_size = (heatmaps.shape[1], heatmaps.shape[2])

    for i in range(heatmaps.shape[0]):
        # Extract coordinates with sub-pixel refinement
        x, y, conf = extract_coordinates_from_heatmap(
            heatmaps_np[i], original_size, heatmap_size
        )

        # Add crop offset
        x = x + crop_offset_x
        y = y + crop_offset_y

        # Create landmark entry
        landmark = {
            "title": LANDMARK_NAMES[i]["title"],
            "symbol": LANDMARK_NAMES[i]["symbol"],
            "value": {"x": int(round(x)), "y": int(round(y))},
        }
        landmarks.append(landmark)
        confidences.append(conf)

    return landmarks, confidences
