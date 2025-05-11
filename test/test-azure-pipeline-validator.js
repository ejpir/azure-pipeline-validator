/**
 * Test for Azure Pipeline YAML Validator
 *
 * This script demonstrates how to use the Azure Pipeline validator.
 */

const path = require("path");
const fs = require("fs/promises");

// Need to use ts-node to load TypeScript file
require("ts-node/register");
const validator = require("../azure-pipeline-validator.ts");
const { validateYaml, printValidationResult } = validator;

// Test files to validate
const testFiles = [
  // Test files in the test directory
  path.join(__dirname, "test-valid.yml"),
  path.join(__dirname, "test-invalid.yml"),

  // Pipeline files if they exist
  // add others
];

/**
 * Filter test files to only include existing files
 */
async function filterExistingFiles(files) {
  const existingFiles = [];

  for (const file of files) {
    try {
      await fs.access(file);
      existingFiles.push(file);
    } catch (err) {
      console.log(`Skipping non-existent file: ${file}`);
    }
  }

  return existingFiles;
}

/**
 * Run the tests
 */
async function runTests(contextLines = 5) {
  const filesToTest = await filterExistingFiles(testFiles);

  console.log("Testing Azure Pipeline YAML Validator");
  console.log("=====================================");
  // Get the absolute path to the schema in the test directory
  const absoluteSchemaPath = path.join(__dirname, "schema.json");
  console.log(`Using schema: ${absoluteSchemaPath}`);
  console.log(`Showing ${contextLines} context lines around errors`);
  console.log(`Testing ${filesToTest.length} files`);
  console.log();

  // Count for test summary
  let validCount = 0;
  let invalidCount = 0;
  let errorCount = 0;

  for (const file of filesToTest) {
    console.log(`Validating: ${file}`);
    try {
      const result = await validateYaml(file, absoluteSchemaPath);
      printValidationResult(result, { contextLines });

      if (result.isValid) {
        validCount++;
      } else if (result.error) {
        errorCount++;
      } else {
        invalidCount++;
      }
    } catch (err) {
      console.error(`Error validating ${file}: ${err.message}`);
      errorCount++;
    }
    console.log();
  }

  // Print test summary
  console.log("Test Summary:");
  console.log(`- Valid files: ${validCount}`);
  console.log(`- Invalid files: ${invalidCount}`);
  console.log(`- Files with errors: ${errorCount}`);
  console.log(`- Total files tested: ${filesToTest.length}`);

  return {
    validCount,
    invalidCount,
    errorCount,
    totalTested: filesToTest.length,
  };
}

// Run tests if called directly
if (require.main === module) {
  // Get context lines from command line argument if provided
  const contextLines = process.argv[2] ? parseInt(process.argv[2], 10) : 5;

  runTests(contextLines)
    .then((summary) => {
      // Exit with non-zero code if any files failed validation
      if (summary.invalidCount > 0 || summary.errorCount > 0) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Test failed:", err);
      process.exit(2);
    });
}

module.exports = {
  runTests,
  filterExistingFiles,
};
