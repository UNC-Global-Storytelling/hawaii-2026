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

USER 0

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /opt/app-root/src/_site /usr/share/nginx/html

# Permissions so random UID (in group 0) can read files
RUN chgrp -R 0 /usr/share/nginx/html && chmod -R g+rX /usr/share/nginx/html

# Replace the whole nginx config with our OpenShift-safe config
RUN cat <<'EOF' > /etc/nginx/nginx.conf
worker_processes auto;
pid /tmp/nginx.pid;

events { worker_connections 1024; }

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;

  sendfile on;
  keepalive_timeout 65;

  # temp dirs -> writable on OpenShift
  client_body_temp_path /tmp/client_temp;
  proxy_temp_path       /tmp/proxy_temp;
  fastcgi_temp_path     /tmp/fastcgi_temp;
  uwsgi_temp_path       /tmp/uwsgi_temp;
  scgi_temp_path        /tmp/scgi_temp;

  server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }
  }
}
EOF

EXPOSE 8080

# Nginx default listens on 80; OpenShift often expects 8080.
# Override with a simple conf:
RUN printf "server { listen 8080; server_name _; root /usr/share/nginx/html; include /etc/nginx/mime.types; location / { try_files \\$uri \\$uri/ /index.html; } }\n" \
  > /etc/nginx/conf.d/default.conf

USER 1001

CMD ["nginx", "-g", "daemon off;"]
