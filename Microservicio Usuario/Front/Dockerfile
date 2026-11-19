# Etapa 1: Build de la aplicación Angular 19
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: Servidor Web Nginx ligero
FROM nginx:alpine
COPY --from=build /app/dist/smartgym-usuarios-front/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
