import json

# Update this path to your actual JSON file
json_path = r"C:\Users\Arnou\OneDrive\Bureaublad\Year 3 Buas\Specialisation_Project\landmark-detection-cepha-a9f1c95397b3.json"

with open(json_path, 'r') as f:
    creds = json.load(f)

# Replace newlines in private key for environment variable format
private_key = creds['private_key'].replace('\n', '\\n')

env_content = f"""GCP_TYPE={creds['type']}
GCP_PROJECT_ID={creds['project_id']}
GCP_PRIVATE_KEY_ID={creds['private_key_id']}
GCP_PRIVATE_KEY={private_key}
GCP_CLIENT_EMAIL={creds['client_email']}
GCP_CLIENT_ID={creds['client_id']}
GCP_AUTH_URI={creds['auth_uri']}
GCP_TOKEN_URI={creds['token_uri']}
GCP_AUTH_PROVIDER_CERT_URL={creds['auth_provider_x509_cert_url']}
GCP_CLIENT_CERT_URL={creds['client_x509_cert_url']}"""

# Save to .env file
with open('.env', 'w') as f:
    f.write(env_content)

print("✓ Created .env file with GCS credentials")
print("\nIMPORTANT: Add .env to your .gitignore!")
