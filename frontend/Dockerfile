# Use nginx to serve static files
FROM nginx:alpine

# Install security updates and create non-root user
RUN apk update && apk upgrade && \
    addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Copy the built frontend files
COPY dist/ /usr/share/nginx/html/

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create directories and set permissions for non-root nginx
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R appuser:appuser /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx

# Switch to non-root user
USER appuser

# Expose port 8080 (non-privileged port for non-root user)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
