"""Configuration and constants"""

import json

LANDMARK_NAMES = [
    {"title": "A-point", "symbol": "A"},
    {"title": "Anterior Nasal Spine", "symbol": "ANS"},
    {"title": "B-point", "symbol": "B"},
    {"title": "Menton", "symbol": "Me"},
    {"title": "Nasion", "symbol": "N"},
    {"title": "Orbitale", "symbol": "Or"},
    {"title": "Pogonion", "symbol": "Pog"},
    {"title": "Posterior Nasal Spine", "symbol": "PNS"},
    {"title": "Sella", "symbol": "S"},
    {"title": "Articulare", "symbol": "Ar"},
    {"title": "Gnathion", "symbol": "Gn"},
    {"title": "Gonion", "symbol": "Go"},
    {"title": "Porion", "symbol": "Po"},
    {"title": "Lower Incisor Tip", "symbol": "LIT"},
    {"title": "Upper Incisor Tip", "symbol": "UIT"},
    {"title": "Labrale inferius", "symbol": "Li"},
    {"title": "Labrale superius", "symbol": "Ls"},
    {"title": "Soft Tissue Pogonion", "symbol": "Pos"},
    {"title": "Subnasale", "symbol": "Sn"},
]


def load_config(config_path: str = "models/config/config_deepfuse_ceph.json"):
    """
    Loads model and runtime configuration from a JSON file.
    If the file is not found, a safe default configuration is returned
    to ensure the system can still run.

    Args:
        config_path (str): Path to JSON configuration.

    Returns:
        dict containing configuration parameters:
            - 'device' (str): Computational device (cpu or cuda)
            - 'image_size' (List[int]): input image resolution.
            - 'heatmap_size' (List[int]): Output heatmap resolution.
            - 'num_landmarks' (int): Number of landmarks
            - 'sigma' (float): Gaussian sigma for heatmap generation.
    """
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
        return config
    except FileNotFoundError:
        return {
            "device": "cpu",
            "image_size": [512, 512],
            "heatmap_size": [128, 128],
            "num_landmarks": 19,
            "sigma": 2.0,
        }
