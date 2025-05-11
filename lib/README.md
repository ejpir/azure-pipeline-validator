# Azure Pipeline YAML Language Service

This directory contains a minimal set of files required for YAML validation in the Azure Pipeline validator.

## Contents

The directory structure includes:

- `language-service/` - Core language service files for YAML validation
  - `src/` - Source TypeScript files
    - `parser/` - YAML and JSON parsing
    - `services/` - YAML validation and JSON schema services
    - `utils/` - Utility functions

These files are extracted from the original azure-pipelines-language-server and azure-pipelines-language-service packages, keeping only what's needed for validation.