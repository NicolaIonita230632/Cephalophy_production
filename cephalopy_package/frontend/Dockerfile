# ---- Stage 1: Build the frontend ----
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and lock file first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Build argument for API URL
ARG VITE_API_BASE_URL=https://ceph-backend-1022645602437.europe-west1.run.app/api/v1

# Create .env.production file
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env.production

# Verify the file was created
RUN cat .env.production

# Build with production mode explicitly set
RUN npm run build -- --mode production


# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run requires port 8080
ENV PORT=8080
EXPOSE 8080

# Start nginx (will use the PORT from nginx.conf)
CMD ["nginx", "-g", "daemon off;"]
