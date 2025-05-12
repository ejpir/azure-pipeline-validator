FROM node:24.0.1-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Make sure the validate script is executable
RUN chmod +x ./bin/azure-pipeline-validator

# Set the entrypoint to the validator script
ENTRYPOINT ["./bin/azure-pipeline-validator"]

# Default command will be overridden by user arguments
CMD []