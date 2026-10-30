FROM node:20-alpine

# Install dependencies in the root /node_modules directory
WORKDIR /
COPY package.json package-lock.json ./
RUN npm install

WORKDIR /app
COPY . .

ENV PATH="/node_modules/.bin:${PATH}"

# Expose frontend development server port
EXPOSE 3001

# Start webpack dev server accessible from host browser
CMD ["npx", "webpack-dev-server", "--mode", "development", "--hot", "--port", "3001", "--host", "0.0.0.0", "--allowed-hosts", "all"]
