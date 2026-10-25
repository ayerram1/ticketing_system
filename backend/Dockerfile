FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm install

# Copy application source code (excludes ignored files per .dockerignore)
COPY . .

# Ensure empty certs directory exists without bundling any secret cert files
RUN mkdir -p /app/certs

# Expose backend port
EXPOSE 3301

# Default command
CMD ["npm", "start"]
