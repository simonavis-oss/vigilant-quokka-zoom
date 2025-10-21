# --- Stage 1: Build the React application ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
# We only copy package.json to allow npm install to generate the lock file if missing
COPY package.json ./
RUN npm install

# Copy remaining source code and build
COPY . .
RUN npm run build

# --- Stage 2: Serve the application using Nginx ---
FROM nginx:stable-alpine AS runner

# Copy the built application files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (default Nginx port)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]