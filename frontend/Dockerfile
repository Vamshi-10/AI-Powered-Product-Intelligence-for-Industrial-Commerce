# --- Build Stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/ .

# Build the React/Vite app for production
RUN npm run build

# --- Serve Stage ---
FROM nginx:alpine

# Copy the build output from the previous stage to nginx's serving directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration to handle React Router (SPA) routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
