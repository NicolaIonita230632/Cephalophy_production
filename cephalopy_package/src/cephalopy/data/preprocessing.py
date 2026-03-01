"""
Preprocessing functions for cephalometric images and annotations.
Includes image cropping based on contour detection and landmark adjustment.
"""

import json
import os
from pathlib import Path

import cv2
import matplotlib.pyplot as plt
import numpy as np
from skimage import exposure


def rename_dataset_files(dataset_path):
    """
    Function written by Arnout, rewritten by Jason for improvement.

    Rename cephalogram images and annotation JSONs to follow the convention:
    datasetname_001_cephalogram.png and datasetname_001_annotation.json
    while keeping the original alignment.

    Args:
        dataset_path (str)
            Path to the dataset directory containing
            'Cephalograms' and 'Annotations' subdirectories.
    """
    dataset_name = os.path.basename(dataset_path.rstrip("/\\"))

    ceph_path = os.path.join(dataset_path, "Cephalograms")
    ann_path = os.path.join(dataset_path, "Annotations")

    # List and sort images (assumes original image and annotation filenames match)
    image_files = sorted([
        f
        for f in os.listdir(ceph_path)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".bmp"))
    ])

    for i, img_file in enumerate(image_files, 1):
        ceph_id = os.path.splitext(img_file)[0]
        old_img_path = os.path.join(ceph_path, img_file)
        old_ann_path = os.path.join(ann_path, f"{ceph_id}.json")

        if not os.path.exists(old_ann_path):
            print(f"Annotation missing for {img_file}, skipping")
            continue

        # New filenames with your naming convention
        new_img_name = f"{dataset_name}_{i:03d}_cephalogram.png"
        new_ann_name = f"{dataset_name}_{i:03d}_annotation.json"

        os.rename(old_img_path, os.path.join(ceph_path, new_img_name))
        os.rename(old_ann_path, os.path.join(ann_path, new_ann_name))

        print(f"Renamed {img_file} -> {new_img_name}, {ceph_id}.json -> {new_ann_name}")


def find_central_point(img, contours):
    """
    Function created by Jason.

    Find the contour closest to the center of the image.
    1. Calculate the center of the image.
    2. For each contour, calculate its bounding rectangle and center.
    3. Compute the distance from the contour center to the image center.
    4. Return the contour with the minimum distance.
    5. Ignore contours with area less than 200 pixels.

    Args:
        img (numpy.ndarray)
            Original image.
        contours (list)
            List of contours from cv2.findContours.

    Returns:
        central_contour (numpy.ndarray)
            The contour closest to the center of the image.
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


def plot_landmarks(ann_path, img, x_line, y_line, title, display=False):
    """
    Function created by Jason

    Adjust and plot landmarks on the cropped image.
    Args:
        ann_path (str)
            Path to the annotation JSON file.
        img (numpy.ndarray)
            Cropped image.
        x_line (int)
            X coordinate of the cropping line.
        y_line (int)
            Y coordinate of the cropping line.
        title (str)
            Title for the plot.
        display (bool)
            Whether to display the image with landmarks.

    Returns:
        ann_data (dict)
            Adjusted annotation data.
    """
    # Plot cephalometric landmarks
    with open(ann_path, "r") as f:
        ann_data = json.load(f)
    img_c = img.copy()
    coords = []
    # cropped_image = img[0:, x_line:]
    for landmark in ann_data["landmarks"]:
        landmark["value"]["x"] = int(landmark["value"]["x"] - x_line)
        landmark["value"]["y"] = int(landmark["value"]["y"] - y_line)
        x = landmark["value"]["x"]
        y = landmark["value"]["y"]
        coords.append((x, y))
    if display:
        cv2.circle(img_c, (x, y), 5, (255, 100, 0), 10)
        plt.imshow(img_c)
        plt.axis("off")
        plt.title(title)
        plt.show()
    return ann_data


def image_cropping(img, matched, im_file, ann_path, margin=200, display=False):
    """
    Function created by Jason.

    Crop the left side of the image based on contour detection.
    1. Apply a binary threshold to the matched histogram image.
    2. Find contours in the binary image.
    3. Identify the contour closest to the center of the image.
    4. Determine the leftmost point of this contour.
    5. Crop the image from this leftmost point minus a margin.
    6. Adjust landmark coordinates accordingly.

    Args:
        img (numpy.ndarray)
            Original image.
        matched (numpy.ndarray)
            Histogram matched grayscale image.
        im_file (str)
            Image filename for display title.
        ann_path (str)
            Path to the annotation JSON file.
        margin (int)
            Margin to add when cropping.
        display (bool)
            Whether to display the cropped image with landmarks.

    Returns:
        img (numpy.ndarray)
            Cropped image.
        ann (dict)
            Adjusted annotation data.
    """
    # Initialise in case of failure
    ann = {}
    try:
        # Set a binary threshold to get a binary image.
        _, thresh = cv2.threshold(matched, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        # Find the central point contour.
        central_contour = find_central_point(img, contours)
        # Find the leftmost point of the central contour.
        leftmost_point = tuple(central_contour[central_contour[:, :, 0].argmin()][0])
        # Collect coordinates for cropping point.
        x_line = max(leftmost_point[0] - margin, 0)
        y_line = margin
        # check if this crop removes more than 40% the image
        if x_line > img.shape[1] * 0.4:
            x_line = int(img.shape[1] * 0.4)
        # Crop the image.
        img = img[y_line:, x_line:]
        # Finally plot the landmarks on the cropped image.
        ann = plot_landmarks(
            ann_path, img, x_line, y_line, title=im_file, display=display
        )
    except Exception as e:
        print(f"Error processing {im_file}: {e}")
    return img, ann


def dataset_handling(
    dataset_paths,
    output_dir,
    reference_img_path="data/contrasting/Cephalograms/54.bmp",
    margin=200,
    display=False,
):
    """
    Function created by Jason.
    Process the dataset of cephalometric images and annotations.
    1. Load images and annotations from specified directories.
    2. For each image:
        a. Convert to grayscale and match histogram with reference image.
        b. Determine if cropping is needed based on left region analysis.
        c. Crop image and adjust landmarks if necessary.
        d. Save processed images and updated annotations to output directory.
    Args:
        dataset_paths (list of str)
            List of dataset directory paths.
        output_dir (str)
            Directory to save processed images and annotations.
        reference_img_path (str)
            Path to the reference image for histogram matching.
        margin (int)
            Margin to add when cropping images.
        display (bool)
            Whether to display images with landmarks during processing.

    Returns:
        None
    """
    # Initiate im_dirs
    im_files = []
    ann_files = []
    for dataset_path in dataset_paths:
        dataset_path = Path(dataset_path)
        ceph_dir = dataset_path / "Cephalograms"
        ann_dir = dataset_path / "Annotations"
        if not ceph_dir.exists():
            print(f"Warning: {ceph_dir} not found, skipping...")
            continue
        # Rename dataset files to follow the convention.
        rename_dataset_files(str(dataset_path))

        for img_file in sorted(ceph_dir.glob("*_cephalogram.*")):
            base_name = img_file.stem.replace("_cephalogram", "")
            ann_file = ann_dir / f"{base_name}_annotation.json"

            if ann_file.exists():
                im_files.append(img_file)
                ann_files.append(ann_file)

    print(f"Loaded {len(im_files)} images")
    # Handle output directories.
    img_output_dir = os.path.join(output_dir, "Cephalograms")
    ann_output_dir = os.path.join(output_dir, "Annotations")
    # Create the directories.
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(img_output_dir, exist_ok=True)
    os.makedirs(ann_output_dir, exist_ok=True)

    # Defining reference image
    reference_img = cv2.imread(reference_img_path)
    reference_gray = cv2.cvtColor(reference_img, cv2.COLOR_BGR2GRAY)
    # # Process each directory.
    # Process each image and its corresponding annotation.
    for im_path, ann_path in zip(im_files, ann_files):
        # Read image
        img = cv2.imread(im_path)
        # Grayscale the image.
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Match the image histograms.
        matched = exposure.match_histograms(gray, reference_gray)
        matched = matched.astype("uint8")
        left_region = matched[:, : img.shape[1] // 4]
        # Calculate how much of the image is background (black).
        black_fraction = np.mean(left_region < 50)
        # If more than 70% of the left quarter is black, crop the image.
        if black_fraction > 0.7:
            img, ann = image_cropping(
                img, matched, im_path, ann_path, margin=margin, display=display
            )
        else:
            # If not, just load the annotations without cropping.
            ann = plot_landmarks(
                ann_path, img, 0, margin, title=im_path, display=display
            )
            img = img[margin:, 0:]
        # Finally, save the image.
        im_filename = os.path.basename(im_path)
        save_path = os.path.join(img_output_dir, im_filename)
        cv2.imwrite(save_path, img)
        # Create annotation save paths
        ann_filename = os.path.basename(ann_path)
        ann_save_path = os.path.join(ann_output_dir, ann_filename)
        # Save new annotations
        with open(ann_save_path, "w") as f:
            json.dump(ann, f, indent=2)
        print(f"Saved: {save_path}")
