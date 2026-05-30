"""
Shared Google Cloud Storage client factory.

Import get_storage_client() from here instead of duplicating it across modules.
"""

import logging
import os

logger = logging.getLogger(__name__)

try:
    from google.cloud import storage
    from google.oauth2 import service_account

    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    logger.warning("[gcs] google-cloud-storage not installed, GCS functionality disabled")


def get_storage_client() -> "storage.Client":
    """Initialize a Google Cloud Storage client from environment variables.

    Resolution order:
    1. GOOGLE_APPLICATION_CREDENTIALS (path to a service-account JSON file)
    2. Individual GCP_* environment variables
    3. Application Default Credentials (last resort)
    """
    if not GCS_AVAILABLE:
        raise RuntimeError("google-cloud-storage is not installed")

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path and os.path.exists(credentials_path):
        logger.info(f"[gcs] Using credentials from: {credentials_path}")
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path
        )
        return storage.Client(credentials=credentials, project=credentials.project_id)

    credentials_dict = {
        "type": os.getenv("GCP_TYPE", "service_account"),
        "project_id": os.getenv("GCP_PROJECT_ID"),
        "private_key_id": os.getenv("GCP_PRIVATE_KEY_ID"),
        "private_key": os.getenv("GCP_PRIVATE_KEY", "").replace("\\n", "\n"),
        "client_email": os.getenv("GCP_CLIENT_EMAIL"),
        "client_id": os.getenv("GCP_CLIENT_ID"),
        "auth_uri": os.getenv("GCP_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
        "token_uri": os.getenv("GCP_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        "auth_provider_x509_cert_url": os.getenv(
            "GCP_AUTH_PROVIDER_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"
        ),
        "client_x509_cert_url": os.getenv("GCP_CLIENT_CERT_URL"),
    }

    if (
        credentials_dict["project_id"]
        and credentials_dict["private_key"]
        and credentials_dict["client_email"]
    ):
        logger.info("[gcs] Using credentials from environment variables")
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict
        )
        return storage.Client(
            credentials=credentials, project=credentials_dict["project_id"]
        )

    logger.warning("[gcs] No credentials found in environment, trying default credentials")
    return storage.Client()
