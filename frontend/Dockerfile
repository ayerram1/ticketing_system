FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm install

# Copy frontend source code
COPY . .

# Expose frontend development server port
EXPOSE 3001

# Start webpack dev server accessible from host browser
CMD ["npx", "webpack-dev-server", "--mode", "development", "--hot", "--port", "3001", "--host", "0.0.0.0", "--allowed-hosts", "all"]
