# Directus Dockerfile for OpenShift
FROM node:20-bookworm-slim

WORKDIR /app

# Install Directus
RUN npm install -g directus

# Create necessary directories with appropriate permissions
RUN mkdir -p /app/uploads /app/extensions && \
    chown -R 1000:0 /app && \
    chmod -R g+rwX /app

# Set working directory and environment
ENV NODE_ENV=production
ENV DIRECTUS_PORT=8055

EXPOSE 8055

# Use a non-root user for OpenShift compatibility
USER 1000

# Start Directus
CMD ["directus", "start"]
