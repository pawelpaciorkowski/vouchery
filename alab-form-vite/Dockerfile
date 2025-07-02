# Etap 1: Budowanie aplikacji React
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Ustawienie adresu URL API podczas budowania
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Etap 2: Serwowanie plików statycznych przez Nginx
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
# Usuń domyślną zawartość Nginx
RUN rm -rf ./*
# Skopiuj zbudowaną aplikację z etapu "build"
COPY --from=build /app/dist .
# Skopiuj własną konfigurację Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]