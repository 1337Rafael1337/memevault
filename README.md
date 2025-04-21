# MemeVault

MemeVault ist eine Webanwendung zum Erstellen, Teilen und Bewerten von Memes. Mit dieser App kannst du eigene Bilder hochladen, Text hinzuf�gen und deine Meme-Kreationen mit anderen teilen.

## Funktionen

- **Bild-Upload**: Lade deine eigenen Bilder hoch, die als Basis f�r Memes dienen
- **Meme-Editor**: F�ge oberen und unteren Text zu deinen Bildern hinzu
- **Abstimmungssystem**: Stimme f�r deine Lieblings-Memes ab
- **Meme-Galerie**: Durchsuche alle erstellten Memes

## Technologie-Stack

- **Frontend**: React.js, React Router, Axios
- **Backend**: Node.js, Express
- **Datenbank**: MongoDB
- **Bildbearbeitung**: HTML5 Canvas API

## Installation

### Voraussetzungen

- Node.js (v14 oder h�her)
- MongoDB

### Setup

1. Repository klonen  
    ```bash
    git clone https://github.com/1337Rafael1337/memevault.git
    cd memevault
    ```
2. Automatische Einrichtung
    ```bash
    npm install
    ``
    Dieser Befehl installiert alle Backend- und Frontend-Abh�ngigkeiten, erstellt das uploads-Verzeichnis und richtet die .env-Datei ein.
3. Server und Client starten  
    ```bash
    npm run dev-full
    ```
    Dieser Befehl startet sowohl den Backend-Server als auch den Frontend-Client gleichzeitig.

4. �ffne http://localhost:3000 in deinem Browser  
    

## Entwicklung

### Branching-Strategie

+ main: Produktions-/Stabiler Code
+ develop: Integrationsumgebung f�r neue Features
+ feature/\*: Einzelne Feature-Entwicklung

## Lizenz

Dieses Projekt ist unter der Apache-2.0 license lizenziert � siehe die LICENSE Datei f�r Details.

## Kontakt

contact@memevault.de

