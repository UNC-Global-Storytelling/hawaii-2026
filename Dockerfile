# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/_site /usr/share/nginx/html

# OpenShift runs as random UID; make nginx files readable
RUN chmod -R g+rX /usr/share/nginx/html && \
    chgrp -R 0 /usr/share/nginx/html

EXPOSE 8080

# Nginx default listens on 80; OpenShift often expects 8080.
# Override with a simple conf:
RUN printf "server { listen 8080; server_name _; root /usr/share/nginx/html; include /etc/nginx/mime.types; location / { try_files \\$uri \\$uri/ /index.html; } }\n" \
  > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]