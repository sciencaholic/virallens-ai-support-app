# Combined Frontend + Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install backend dependencies
RUN cd server && npm install --only=production

# Install frontend dependencies
RUN cd client && npm install

# Copy source code (MUST come before build)
COPY client/ ./client/
COPY server/ ./server/

# Build frontend AFTER copying source code
RUN cd client && npm run build

# Move built frontend to server's public directory
RUN mkdir -p server/public && cp -r client/build/* server/public/

# Set working directory to server
WORKDIR /app/server

# Expose port
EXPOSE 3001

# Start the backend server (which will also serve frontend)
CMD ["npm", "start"]