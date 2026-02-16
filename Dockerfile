# ---- Build stage ----
FROM registry.access.redhat.com/ubi8/nodejs-20:latest AS build
WORKDIR /opt/app-root/src

# Ensure npm global prefix structure exists for non-root user
RUN install -d "$HOME/.npm-global/lib" "$HOME/.npm-global/bin"

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Use Red Hat UBI with nginx (no rate limits, no auth required)
FROM registry.access.redhat.com/ubi9/nginx-124

COPY --from=build /opt/app-root/src/_site /usr/share/nginx/html

# Permissions so random UID (in group 0) can read files
RUN chgrp -R 0 /usr/share/nginx/html && chmod -R g+rX /usr/share/nginx/html

# Replace the whole nginx config with our OpenShift-safe config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

# Nginx default listens on 80; OpenShift often expects 8080.
# Override with a simple conf:
RUN printf "server { listen 8080; server_name _; root /usr/share/nginx/html; include /etc/nginx/mime.types; location / { try_files \\$uri \\$uri/ /index.html; } }\n" \
  > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]