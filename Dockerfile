# --- Stage 1: Build the React application ---
FROM node:20-alpine as builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
# The build output will be in the 'dist' directory
RUN npm run build

# --- Stage 2: Serve the application using Nginx ---
FROM nginx:stable-alpine as production

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application files from the builder stage
# The build output is expected in /app/dist
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (as configured in nginx.conf)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]