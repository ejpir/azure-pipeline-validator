# Contributing to Azure Pipeline Validator

This package is designed to provide Azure Pipeline YAML validation using the Azure Pipelines Language Server library.

## Installation for Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Special Requirements

### Azure Pipeline Language Server Library

This package requires the Azure Pipelines Language Server library files to be installed at:
```
/lib/azure-pipelines-language-server/language-service/
```

This library is not available as a standard npm package in the format required, which is why we have to bundle it with the package.

### Building and Testing

1. Run tests:
   ```bash
   npm test
   ```

2. Create a package:
   ```bash
   npm pack
   ```

3. Install locally for testing:
   ```bash
   npm install -g .
   ```

## Package Structure

- `src/` - Source code
- `bin/` - Command line interface scripts
- `test/` - Test files
- `lib/` - Azure Pipelines Language Server library (required at runtime)

## Testing Changes

You can test your changes by running:
```bash
node bin/azure-pipeline-validator path/to/pipeline.yml path/to/schema.json
```

## Building and Publishing

To build the package:
```bash
npm pack
```

To publish the package:
```bash
npm publish
```

## License

MIT