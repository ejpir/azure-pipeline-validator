#!/usr/bin/env node

/**
 * Azure Pipeline YAML Validator
 *
 * This utility validates Azure Pipeline YAML files against a schema.
 * This is a JavaScript wrapper for the TypeScript implementation.
 */

// Ensure the TypeScript is compiled before running
require('ts-node/register');

// Import and re-export the TypeScript module
module.exports = require('./azure-pipeline-validator.ts');

// Allow command-line usage
if (require.main === module) {
  // Just delegate to the TypeScript implementation
  require('./azure-pipeline-validator.ts');
}