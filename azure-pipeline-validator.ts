#!/usr/bin/env ts-node

/**
 * Azure Pipeline YAML Validator
 *
 * This utility validates Azure Pipeline YAML files against a schema.
 * Based on the yamlvalidation.test.ts from the azure-pipelines-language-server library.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as URL from 'url';
import * as yargs from 'yargs';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic } from 'vscode-languageserver-types';

// Import modules directly from source TypeScript files
import { YAMLValidation } from './lib/language-service/src/services/yamlValidation';
import { JSONSchemaService, ParseSchema } from './lib/language-service/src/services/jsonSchemaService';
import { JSONSchema } from './lib/language-service/src/jsonSchema';
import * as yamlparser from './lib/language-service/src/parser/yamlParser';

/**
 * Configuration for the workspace context
 */
const workspaceContext = {
  resolveRelativePath: (relativePath: string, resource: string) => {
    return URL.resolve(resource, relativePath);
  }
};

/**
 * Service for requesting schema files
 * @param path - Path to the schema file
 * @returns Content of the schema file
 */
const requestService = (path: string): Promise<string> => {
  return fs.readFile(path, 'utf-8');
};

/**
 * Run validation on a YAML file
 * @param content - Content of the YAML file to validate
 * @param schemaPath - Path to the schema file
 * @returns Array of diagnostics
 */
async function runValidationTest(content: string, schemaPath: string): Promise<Diagnostic[]> {
  try {
    // Schema resolver
    const schemaResolver = (url: string): Promise<JSONSchema> => {
      return Promise.resolve(ParseSchema(url));
    };

    const schemaService = new JSONSchemaService(
      schemaResolver,
      workspaceContext,
      requestService,
    );

    const yamlValidation = new YAMLValidation(schemaService, Promise);
    const textDocument = TextDocument.create(
      schemaPath,
      "azure-pipelines",
      1,
      content,
    );
    const yamlDoc = yamlparser.parse(content);

    return await yamlValidation.doValidation(textDocument, yamlDoc);
  } catch (error) {
    console.error("Error in runValidationTest:", error);
    throw error;
  }
}

/**
 * Validate a YAML file against a schema
 * @param yamlFilePath - Path to the YAML file
 * @param schemaPath - Path to the schema file
 * @returns Validation result
 */
async function validateYaml(yamlFilePath: string, schemaPath: string): Promise<any> {
  try {
    // Read the YAML file
    const yamlContent = await fs.readFile(yamlFilePath, "utf-8");

    // Run validation
    const diagnostics = await runValidationTest(yamlContent, schemaPath);

    // Check if there are any errors
    const hasErrors = diagnostics.some((d) => d.severity === 1); // Error severity

    return {
      isValid: diagnostics.length === 0,
      hasErrors: hasErrors,
      diagnostics: diagnostics,
      filePath: yamlFilePath,
      fileContent: yamlContent,
    };
  } catch (error) {
    return {
      isValid: false,
      error: (error as Error).message,
      filePath: yamlFilePath,
    };
  }
}

/**
 * Get surrounding lines of code from content
 * @param content - File content
 * @param lineNumber - Line number (1-based)
 * @param context - Number of context lines before and after
 * @returns The code with line numbers
 */
function getSurroundingLines(content: string, lineNumber: number, context: number = 5): string {
  const lines = content.split("\n");
  const startLine = Math.max(0, lineNumber - 1 - context);
  const endLine = Math.min(lines.length - 1, lineNumber - 1 + context);

  let result = "";
  for (let i = startLine; i <= endLine; i++) {
    const prefix = i === lineNumber - 1 ? "> " : "  ";
    result += `${prefix}${i + 1}: ${lines[i]}\n`;
  }

  return result;
}

/**
 * Print validation results
 * @param result - Validation result
 * @param options - Output options
 */
function printValidationResult(result: any, options: any = {}): void {
  const contextLines = options.contextLines || 5;
  const verbose = options.verbose || false;

  if (result.error) {
    console.error(`Error validating ${result.filePath}: ${result.error}`);
    return;
  }

  if (result.isValid) {
    console.log(`✅ ${result.filePath} is valid`);
  } else {
    console.error(`❌ ${result.filePath} has validation issues:`);
    result.diagnostics.forEach((diagnostic: Diagnostic) => {
      const severity = diagnostic.severity === 1 ? "Error" : "Warning";
      const line = diagnostic.range.start.line + 1;
      const character = diagnostic.range.start.character + 1;
      console.error(
        `\n  ${severity} at line ${line}, column ${character}: ${diagnostic.message}`,
      );

      // Show surrounding lines if file content is available
      if (result.fileContent && contextLines > 0) {
        console.error(
          "\n" + getSurroundingLines(result.fileContent, line, contextLines),
        );
      }

      if (verbose) {
        console.error("  Range:", JSON.stringify(diagnostic.range));
      }
    });
  }
}

// Export functions for use in other modules
export {
  validateYaml,
  runValidationTest,
  printValidationResult,
  getSurroundingLines,
};

// Allow command-line usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: ts-node azure-pipeline-validator.ts <yaml-file> <schema-file> [context-lines]",
    );
    process.exit(1);
  }

  const yamlFile = args[0];
  const schemaFile = args[1];
  const contextLines = parseInt(args[2] || "5", 10);

  validateYaml(yamlFile, schemaFile)
    .then((result) => printValidationResult(result, { contextLines }))
    .catch((err) => {
      console.error("Validation failed:", err);
      process.exit(1);
    });
}