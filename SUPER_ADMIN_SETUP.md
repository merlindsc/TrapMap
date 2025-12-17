# Super Admin Dashboard Setup Guide

## Problem: Dashboard lädt keine Daten

Wenn das Super Admin Dashboard keine Daten anzeigt (keine User, Organisationen oder QR-Codes), liegt dies meist an fehlenden oder falschen Umgebungsvariablen.

## Lösung

### 1. Frontend Environment Variable

Die Frontend-Anwendung benötigt die Variable `VITE_API_URL` um die API zu erreichen.

#### Entwicklung (lokal)
Erstelle eine `.env` Datei im `frontend/` Verzeichnis:

```bash
# frontend/.env
VITE_API_URL=http://localhost:5000/api
```

#### Produktion
Setze die Umgebungsvariable auf deinem Hosting-Provider:

```bash
VITE_API_URL=https://api.trap-map.de/api
# oder
VITE_API_URL=https://your-backend-url.com/api
```

**Wichtig:** Wenn `VITE_API_URL` nicht gesetzt ist, verwendet die App automatisch `http://localhost:5000/api` als Fallback (seit diesem Fix).

### 2. Backend Environment Variables

Das Backend benötigt folgende Variablen:

```bash
# backend/.env
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=your-secure-secret-change-this

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Super Admin Emails (kommasepariert)
SUPER_ADMIN_EMAILS=admin@demo.trapmap.de,merlin@trapmap.de,hilfe@die-schaedlingsexperten.de
```

### 3. Super Admin Zugriff

Nur Benutzer mit den konfigurierten E-Mail-Adressen können auf das Super Admin Dashboard zugreifen.

**Standard Super Admins:**
- admin@demo.trapmap.de
- merlin@trapmap.de
- hilfe@die-schaedlingsexperten.de

Um weitere Super Admins hinzuzufügen:
1. Setze `SUPER_ADMIN_EMAILS` in der Backend `.env`
2. Oder passe die Liste in `backend/routes/admin.routes.js` (Zeile 14-18) an

## Debugging

### Console Logs aktiviert

Beim Laden des Dashboards werden automatisch Debug-Informationen in der Browser-Console ausgegeben:

```
🔧 Super Admin Dashboard initialized
📡 API URL: http://localhost:5000/api
🔑 Token present: true
```

### Häufige Fehler

**1. API URL ist `undefined`**
- Lösung: Setze `VITE_API_URL` oder verwende den automatischen Fallback

**2. 403 Forbidden / Keine Berechtigung**
- Deine E-Mail ist nicht in der Super Admin Liste
- Prüfe `SUPER_ADMIN_EMAILS` oder `admin.routes.js`

**3. 401 Unauthorized**
- Kein gültiger Token im LocalStorage
- Lösung: Neu anmelden

**4. Network Error / Verbindung fehlgeschlagen**
- Backend läuft nicht oder ist nicht erreichbar
- Prüfe ob Backend auf Port 5000 läuft
- Prüfe CORS-Konfiguration in `backend/server.js`

### API Endpoints testen

Du kannst die Backend-Endpoints direkt testen:

```bash
# Health Check
curl http://localhost:5000/health

# Admin Stats (benötigt Token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/admin/stats

# Organisationen
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/admin/organisations
```

## Entwicklung starten

### Backend
```bash
cd backend
npm install
npm start
# oder für Auto-Reload:
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Das Frontend läuft auf `http://localhost:5173` und proxied API-Requests automatisch zu `http://localhost:5000/api` (siehe `vite.config.js`).

## Produktion

### Build Frontend
```bash
cd frontend
npm run build
# Erzeugt dist/ Verzeichnis
```

### Deploy
Die `dist/` Dateien können auf jedem Static-Hosting deployed werden (Netlify, Vercel, etc.).
Stelle sicher, dass `VITE_API_URL` korrekt auf dein Backend zeigt.

## Support

Bei weiteren Problemen:
1. Prüfe die Browser-Console für detaillierte Fehlermeldungen
2. Prüfe die Backend-Logs
3. Stelle sicher, dass alle Environment Variables gesetzt sind
4. Verifiziere, dass deine E-Mail in der Super Admin Liste ist
