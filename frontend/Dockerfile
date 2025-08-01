# Use nginx to serve static files
FROM nginx:alpine

# Copy the built frontend files
COPY dist/ /usr/share/nginx/html/

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
