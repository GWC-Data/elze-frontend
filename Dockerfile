FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_ADK_API_BASE_URL=/svc/adk
ARG VITE_CONTEXT_API_URL=
ARG VITE_AGENT_LIBRARY_API_URL=
ENV VITE_ADK_API_BASE_URL=$VITE_ADK_API_BASE_URL \
    VITE_CONTEXT_API_URL=$VITE_CONTEXT_API_URL \
    VITE_AGENT_LIBRARY_API_URL=$VITE_AGENT_LIBRARY_API_URL

RUN npm run build

FROM nginx:1.29-alpine

RUN apk add --no-cache ca-certificates

ENV ADK_API_KEY=""
ENV PORT=8080
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/05-check-upstreams.envsh /docker-entrypoint.d/05-check-upstreams.envsh
RUN sed -i 's/\r$//' /docker-entrypoint.d/05-check-upstreams.envsh \
 && chmod +x /docker-entrypoint.d/05-check-upstreams.envsh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
