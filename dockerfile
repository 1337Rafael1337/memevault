# Basis-Image
FROM node:18-alpine as build

# Arbeitsverzeichnis
WORKDIR /app

# Backend-Abhängigkeiten installieren
COPY package*.json ./
RUN npm ci

# Frontend-Abhängigkeiten installieren und bauen
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

# Alle Backend-Dateien kopieren
COPY . .

# Produktions-Image
FROM node:18-alpine

WORKDIR /app

# Nur die für die Produktion notwendigen Dateien kopieren
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/client/build ./client/build
COPY --from=build /app/server.js ./
COPY --from=build /app/.env.example ./.env

# Uploads-Verzeichnis erstellen
RUN mkdir -p uploads

# Port freigeben
EXPOSE 5000

# Startbefehl definieren
CMD ["node", "server.js"]