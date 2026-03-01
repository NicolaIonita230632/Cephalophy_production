"""
Submodule for data quality functions.
"""

import json
import logging
from pathlib import Path
from typing import Dict

from PIL import Image

# Configure logging
logger = logging.getLogger(__name__)


# Validity Check
def verify_image_landmarks(
    image_path: str | Path, annotation_path: str | Path, verbose: bool = True
) -> Dict:
    """
    Verify that all landmarks in an annotation file fall within image bounds.

    Parameters
    ----------
    image_path : str or Path
        Path to the image file.
    annotation_path : str or Path
        Path to the JSON annotation file containing landmark coordinates.
    verbose : bool, default=True
        If True, log detailed information about each landmark during
        verification.

    Returns
    -------
    dict
        A dictionary containing verification results with the following keys:

        - image_path : str
            Path to the verified image.
        - annotation_path : str
            Path to the annotation file.
        - image_resolution : tuple of int
            Image dimensions as (width, height).
        - total_landmarks : int
            Total number of landmarks in the annotation.
        - invalid_count : int
            Number of landmarks outside image bounds.
        - invalid_landmarks : list of tuple
            List of (name, x, y) for invalid landmarks. Empty list if
            verbose=False to save memory.
        - is_valid : bool
            True if all landmarks are within bounds, False otherwise.

    Raises
    ------
    FileNotFoundError
        If either the image or annotation file doesn't exist.
    ValueError
        If there's an error opening the image or parsing the JSON.
    KeyError
        If the annotation JSON doesn't contain a 'landmarks' key.

    Examples
    --------
    >>> result = verify_image_landmarks(
    ...     'path/to/image.jpg',
    ...     'path/to/annotation.json'
    ... )
    >>> if result['is_valid']:
    ...     print("All landmarks are valid!")

    Notes
    -----
    For memory efficiency, detailed landmark lists are only stored when
    verbose=True. Otherwise, only counts are returned.
    """

    # Convert to Path objects
    image_path = Path(image_path)
    annotation_path = Path(annotation_path)

    # Check if files exist
    if not image_path.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")
    if not annotation_path.exists():
        raise FileNotFoundError(f"Annotation file not found: {annotation_path}")

    if verbose:
        logger.debug(f"Checking: {annotation_path.name}")
        logger.debug(f"With image: {image_path.name}")

    # Get image dimensions without loading full image
    with Image.open(image_path) as img:
        width, height = img.size

    if verbose:
        logger.debug(f"Image resolution: {width} x {height}")

    # Load and parse annotation
    with open(annotation_path, "r") as f:
        data = json.load(f)

    if "landmarks" not in data:
        raise KeyError("No 'landmarks' key found in annotation JSON")

    landmarks = data["landmarks"]
    total = len(landmarks)

    if verbose:
        logger.info(f"Checking {total} landmarks for {annotation_path.name}")

    # Process landmarks efficiently
    invalid_count = 0
    invalid_list = [] if verbose else None

    for lm in landmarks:
        try:
            name = lm["title"]
            x = lm["value"]["x"]
            y = lm["value"]["y"]

            # Check bounds
            if not (0 <= x < width and 0 <= y < height):
                invalid_count += 1
                if verbose:
                    invalid_list.append((name, x, y))
                    logger.warning(f"{name}: ({x}, {y}) - OUT OF BOUNDS")
            elif verbose:
                logger.debug(f"✓ {name}: ({x}, {y})")

        except (KeyError, TypeError) as e:
            logger.warning(f"Malformed landmark entry: {e}")
            invalid_count += 1

    if verbose:
        logger.info(f"Result: {invalid_count} invalid landmarks out of {total}")

    return {
        "image_path": str(image_path),
        "annotation_path": str(annotation_path),
        "image_resolution": (width, height),
        "total_landmarks": total,
        "invalid_count": invalid_count,
        "invalid_landmarks": invalid_list if verbose else [],
        "is_valid": invalid_count == 0,
    }
