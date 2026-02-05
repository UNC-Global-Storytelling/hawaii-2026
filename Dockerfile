# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/_site /usr/share/nginx/html

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