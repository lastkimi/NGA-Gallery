FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create data directories
RUN mkdir -p /app/data/images/{full,thumb,preview} /app/logs

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
