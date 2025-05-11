# Azure Pipeline YAML Validator

This utility validates Azure Pipeline YAML files against a schema using the azure-pipelines-language-server library.

## Features

- Validates Azure Pipeline YAML files against a schema
- Provides detailed diagnostics for validation issues
- Shows context lines around each error for easier debugging
- Can be used as a library or from the command line
- Implements the same validation logic as the Azure DevOps Pipeline editor
- Uses TypeScript source files directly from the language service

## Installation

The validator depends on a few Node.js packages. To install them:

```bash
cd azure-pipeline-validator
npm install
```

## Usage

### Command Line

You can use the validator in three ways:

#### 1. Using the bin script (recommended)

```bash
./bin/validate <yaml-file> <schema-file> [context-lines]
```

#### 2. Using npm scripts

```bash
npm run validate <yaml-file> <schema-file> [context-lines]
```

#### 3. Directly with Node.js

```bash
# Using the TypeScript implementation
npx ts-node azure-pipeline-validator.ts <yaml-file> <schema-file> [context-lines]

# Using the JavaScript wrapper
node azure-pipeline-validator.js <yaml-file> <schema-file> [context-lines]
```

Examples:
```bash
# Basic validation
./bin/validate pipelines/pipeline.yml test/schema.json

# Show 10 lines of context around each error
./bin/validate pipelines/pipeline.yml test/schema.json 10
```

### As a Library

The validator can be used as a library in both JavaScript and TypeScript projects:

#### JavaScript usage

```javascript
// Need to register ts-node first to import from TypeScript files
require('ts-node/register');
const { validateYaml, printValidationResult } = require('./azure-pipeline-validator.ts');

async function validateMyPipeline() {
  const result = await validateYaml(
    '/path/to/pipeline.yml',
    '/path/to/schema.json'
  );

  // Print results with 10 lines of context around each error
  printValidationResult(result, { contextLines: 10 });

  // Access validation results programmatically
  if (result.isValid) {
    console.log('Pipeline is valid!');
  } else {
    console.log('Pipeline has issues.');
    // Access diagnostics for details
    console.log(result.diagnostics);
  }
}
```

#### TypeScript usage

```typescript
import { validateYaml, printValidationResult } from './azure-pipeline-validator';

async function validateMyPipeline() {
  const result = await validateYaml(
    '/path/to/pipeline.yml',
    '/path/to/schema.json'
  );

  // Print results with 5 lines of context around each error
  printValidationResult(result, { contextLines: 5 });

  // Access validation results programmatically
  if (result.isValid) {
    console.log('Pipeline is valid!');
  } else {
    console.log('Pipeline has issues.');
    // Access diagnostics for details
    console.log(result.diagnostics);
  }
}
```

## Running Tests

A test script is provided to demonstrate usage:

```bash
# Run tests with npm
npm test

# Directly run test script with specified context lines
node test/test-azure-pipeline-validator.js 5
```

This script will:
1. Validate test files in the test directory (test-valid.yml and test-invalid.yml)
2. Show validation results for all test files with the specified number of context lines
3. Report a summary of validation results

## Implementation Details

The validator uses the following components from the azure-pipelines-language-server library, importing directly from TypeScript source files:

- YAMLValidation: Performs the actual validation
- JSONSchemaService: Loads and processes the JSON schema
- yamlParser: Parses YAML content into a document model

### Architecture

The implementation consists of:

1. **TypeScript implementation** (azure-pipeline-validator.ts): The main validator implementation, importing directly from language service TypeScript sources.

2. **JavaScript wrapper** (azure-pipeline-validator.js): A simple wrapper that registers ts-node and imports the TypeScript implementation.

3. **Command-line wrapper** (bin/validate): A shell script that simplifies running the validator.

4. **Test framework** (test/test-azure-pipeline-validator.js): Tests for the validator.

The `runValidationTest` function is implemented in a similar way to the original test files to ensure compatibility.

### TypeScript Source Imports

Unlike the original implementation which used compiled JavaScript files (.js), this implementation imports TypeScript source files (.ts) directly, making it easier to follow the original code patterns and easier to maintain.

## Validation Results Format

The validation results are returned as an object with the following structure:

```javascript
{
  isValid: boolean,       // true if no validation issues found
  hasErrors: boolean,     // true if there are error-level issues (not just warnings)
  diagnostics: [          // array of diagnostic objects
    {
      severity: number,   // 1 = Error, 2 = Warning, etc.
      range: {
        start: { line: number, character: number },
        end: { line: number, character: number }
      },
      message: string     // The validation message
    },
    // ... more diagnostics
  ],
  filePath: string,       // Path to the validated file
  fileContent: string     // Content of the file (used for context display)
}
```

## Error Handling

If there's an error processing the file (e.g., file not found, invalid schema), the validation result will have:

```javascript
{
  isValid: false,
  error: string,          // Error message
  filePath: string        // Path to the file
}
```
