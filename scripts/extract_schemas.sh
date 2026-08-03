#!/bin/bash

# Extracts the schemas from the target page payload. If this payload is too large,
# then use curl to fetch the payloads and save it to a file.
# E.g. curl 'https://app.graphql-hive.com/graphql' ... > payload.json

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed. Please install it first."
  exit 1
fi

# Check if a file was provided
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_json_file>"
  exit 1
fi

JSON_FILE="$1"

# Extract the 'service' and base64-encoded 'source', separated by a tab
jq -r '.data.project.target.latestSchemaVersion.schemas.edges[].node | "\(.service)\t\(.source | @base64)"' "$JSON_FILE" \
  | while IFS=$'\t' read -r service source_b64; do
    # Skip if service name is empty or null
    if [ -z "$service" ] || [ "$service" = "null" ]; then
      continue
    fi

    echo "Creating file: ${service}"

    # Decode the base64 source and write it to the file
    echo "$source_b64" | base64 --decode > "${service}"
  done

echo "Done!"
