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
  // Get the exported functions from the TypeScript module
  const { validateYaml, printValidationResult } = require('./azure-pipeline-validator.ts');

  // Get command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node azure-pipeline-validator.js <yaml-file> <schema-file> [context-lines]");
    process.exit(1);
  }

  // Parse arguments
  const yamlFile = args[0];
  const schemaFile = args[1];
  const contextLines = parseInt(args[2] || "5", 10);

  // Run validation and display results
  validateYaml(yamlFile, schemaFile)
    .then((result) => printValidationResult(result, { contextLines }))
    .catch((err) => {
      console.error("Validation failed:", err);
      process.exit(1);
    });
}