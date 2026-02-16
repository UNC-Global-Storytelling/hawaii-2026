# Directus Dockerfile for OpenShift
FROM node:20-bookworm-slim

WORKDIR /app

# Install Directus and clean up npm cache to avoid permission issues
RUN npm install -g directus && \
    npm cache clean --force

# Create necessary directories with appropriate permissions
RUN mkdir -p /app/uploads /app/extensions && \
    chown -R 1000:0 /app && \
    chmod -R g+rwX /app

# Set working directory and environment
ENV NODE_ENV=production
ENV DIRECTUS_PORT=8055

# Configure npm to skip cache for non-root user
ENV npm_config_cache=/tmp/.npm

EXPOSE 8055

# Use a non-root user for OpenShift compatibility
USER 1000

# Start Directus
CMD ["directus", "start"]
