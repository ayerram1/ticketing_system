FROM node:20-alpine

# Install dependencies in the root /node_modules directory
WORKDIR /
COPY package.json package-lock.json ./
RUN npm install

WORKDIR /app
COPY . .

ENV PATH="/node_modules/.bin:${PATH}"

# Expose backend port
EXPOSE 3301

# Default command
CMD ["npm", "start"]
