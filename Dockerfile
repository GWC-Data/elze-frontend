# The "web" image: the built SPA, served by nginx, which is also the gateway
# to every backend. See nginx.conf for why the browser only ever sees one origin.

# ---------------------------------------------------------------- build
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Every service URL is a same-origin relative path, routed by nginx.conf.
# Vite inlines VITE_* at build time, so these are build args, not runtime env:
# changing one means rebuilding this image (`docker compose build web`).
#
#   /api        -> backend/        (Express)      - http.ts hardcodes it already
#   /svc/adk    -> Elze-backend    (ADK API :8300) - every agent: analyst, playbooks, extraction
ARG VITE_ADK_API_BASE_URL=/svc/adk
ARG VITE_CONTEXT_API_URL=
ENV VITE_ADK_API_BASE_URL=$VITE_ADK_API_BASE_URL \
    VITE_CONTEXT_API_URL=$VITE_CONTEXT_API_URL
#
# VITE_ADK_API_KEY is deliberately NOT a build arg. Anything VITE_* is inlined
# into the JavaScript every visitor downloads, so a key baked in is a published
# key. nginx attaches it server-side instead (ADK_API_KEY, below).
# .dockerignore keeps frontend/.env out of the build context, so a value there
# cannot leak in either; adkAgentApi.ts sends no header when it is empty.

RUN npm run build

# ---------------------------------------------------------------- serve
FROM nginx:1.29-alpine

# nginx.conf is installed as a TEMPLATE: the image's entrypoint runs envsubst
# over /etc/nginx/templates/*.template into /etc/nginx/conf.d/ at startup,
# substituting only variables that are set. ADK_API_KEY must therefore always
# be defined - empty means "send no X-API-Key", matching an ADK API with
# ADK_API_AUTH_TOKEN unset. Set it to that token at runtime to enable the key.
ENV ADK_API_KEY=""
# Where nginx.conf proxies to. Defaults are the compose service names (Docker,
# `gcloud run compose`); cloudbuild.yaml overrides them with 127.0.0.1:<port>
# because a plain multi-container Cloud Run service has no name resolution.
ENV BACKEND_UPSTREAM=backend:8080 \
    ADK_UPSTREAM=adk-api:8300
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run's ingress container port. The image's own CMD
# (nginx -g 'daemon off;') is kept.
EXPOSE 80
