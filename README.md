# TrapMap

**Professionelles Schädlingsmonitoring-System mit Offline-First Architektur und Multi-Tenant Support**

TrapMap ist eine moderne Anwendung für professionelles Schädlingsmonitoring mit QR-Code-basiertem Fallen-Scanning, Offline-Funktionalität und umfassenden Reporting-Features.

## 🚀 Features

- **QR-Code basiertes Fallen-Scanning** - Schnelles und fehlerfreies Scannen von Schädlingsfallen
- **Offline-Funktionalität** - Arbeiten ohne Internetverbindung mit automatischer Synchronisation
- **GPS-Tracking** - Präzise Standorterfassung und Grundriss-Platzierung
- **Multi-Tenant Architektur** - Unterstützung für mehrere Organisationen
- **Rollenbasierte Zugriffskontrolle** - 6 verschiedene Benutzerrollen:
  - `admin` - Vollzugriff auf alle Funktionen
  - `supervisor` - Management und Überwachung
  - `technician` - Feldarbeit und Scanning
  - `auditor` - Prüfung und Audit-Reports
  - `viewer` - Nur-Lese-Zugriff
  - `partner` - Eingeschränkter Partner-Zugriff
- **PDF-Berichte** - Professionelle Audit-Reports und Dokumentation
- **Push-Benachrichtigungen** - Echtzeit-Updates für wichtige Events
- **Mobile App** - Native Android-Unterstützung via Capacitor
- **Dark/Light Mode** - Optimale Benutzererfahrung zu jeder Tageszeit

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime Environment
- **Express** - Web Framework
- **Supabase** - Backend-as-a-Service mit PostgreSQL

### Frontend
- **React** - UI Framework
- **Vite** - Build Tool
- **TailwindCSS** - Utility-First CSS Framework

### Mobile
- **Capacitor** - Native Mobile Runtime (Android)

### Database
- **PostgreSQL** - via Supabase

## 📦 Installation

### Backend Setup

```bash
cd backend
npm install

# Environment Variables konfigurieren
cp .env.example .env
# .env mit deinen Werten füllen

# Server starten
npm start

# Development mit Auto-Reload
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Environment Variables konfigurieren
cp .env.example .env
# .env mit deinen Werten füllen

# Development Server starten
npm run dev

# Production Build
npm run build
```

## 🔐 Environment Variables

### Backend (.env)

```env
# Server
PORT=3000
NODE_ENV=production

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Email (optional)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Push Notifications (optional)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

### Frontend (.env)

```env
# API
VITE_API_URL=http://localhost:3000

# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_KEY=your-supabase-anon-key

# App
VITE_APP_NAME=TrapMap
```

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

## 🔒 Security Features

TrapMap implementiert mehrere Sicherheitsebenen:

- **Helmet** - HTTP Security Headers
- **Rate Limiting** - Schutz vor Brute-Force-Angriffen
- **JWT Authentication** - Sichere Token-basierte Authentifizierung
- **RBAC** - Rollenbasierte Zugriffskontrolle mit 6 Rollen
- **Input Sanitization** - Validierung und Bereinigung aller Eingaben
- **HTTPS** - Verschlüsselte Kommunikation (Production)
- **CORS** - Konfigurierbare Cross-Origin Resource Sharing
- **SQL Injection Protection** - via Supabase Prepared Statements

## 📚 Dokumentation

- [API Dokumentation](docs/API.md) - Vollständige API Reference
- [Benutzerrollen](docs/ROLES.md) - Übersicht über alle Rollen und Berechtigungen
- [Offline-Modus](docs/OFFLINE.md) - Funktionsweise der Offline-Synchronisation

## 🚀 CI/CD

Das Projekt nutzt GitHub Actions für automatisierte Tests und Deployments:

- **Backend Tests** - Jest Unit Tests mit Coverage
- **Frontend Build** - Vite Production Build
- **Security Audit** - npm audit für Dependencies
- **Linting** - ESLint für Code-Qualität

## 🤝 Contributing

Contributions sind willkommen! Bitte erstelle einen Pull Request mit deinen Änderungen.

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist unter der MIT Lizenz lizenziert - siehe [LICENSE](LICENSE) für Details.

## 👥 Team

TrapMap Team - Professionelles Schädlingsmonitoring für die digitale Zukunft

## 🐛 Support

Bei Fragen oder Problemen erstelle bitte ein Issue im GitHub Repository.

---

Made with ❤️ by TrapMap Team
