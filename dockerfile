# Basis-Image
FROM node:18-alpine as build

# Arbeitsverzeichnis
WORKDIR /app

# Gesamtes Projekt kopieren (einschließlich client)
COPY . .

# Backend-Abhängigkeiten installieren (ohne postinstall-Hook)
RUN npm ci --ignore-scripts

# Frontend-Abhängigkeiten separat installieren
RUN cd client && npm ci

# Frontend bauen
RUN cd client && npm run build

# Produktions-Image
FROM node:18-alpine

WORKDIR /app

# Nur die für die Produktion notwendigen Dateien kopieren
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/client/build ./client/build
COPY --from=build /app/server.js ./

# Uploads-Verzeichnis erstellen
RUN mkdir -p uploads

# Port freigeben
EXPOSE 5000

# Startbefehl definieren
CMD ["node", "server.js"]