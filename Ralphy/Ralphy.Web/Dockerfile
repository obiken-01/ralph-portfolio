# ── Build stage ─────────────────────────────────────────────────
FROM node:22.23.4-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Accept VITE_API_URL as build argument from Railway
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Canonical public origin for SEO tags (Seo.jsx falls back to window.location.origin)
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL

RUN npm run build

# ── Production stage ─────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]