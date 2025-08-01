#!/bin/sh

# Set default PORT if not provided
export PORT=${PORT:-8080}

# Substitute environment variables in nginx config template
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start nginx
exec nginx -g "daemon off;"
