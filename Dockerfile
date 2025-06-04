# Combined Frontend + Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for both frontend and backend
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install backend dependencies
RUN cd server && npm install --only=production

# Install frontend dependencies and build
RUN cd client && npm install && npm run build

# Copy source code
COPY client/ ./client/
COPY server/ ./server/

# Build frontend
RUN cd client && npm run build

# Move built frontend to server's public directory
RUN mkdir -p server/public && cp -r client/build/* server/public/

# Set working directory to server
WORKDIR /app/server

# Expose port
EXPOSE 3001

# Start the backend server (which will also serve frontend)
CMD ["npm", "start"]