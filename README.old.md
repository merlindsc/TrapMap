# TrapMap
Professionelle Schädlingsüberwachung mit Offline-Funktion und QR-Scanning

## Features

### Dark/Light Mode Toggle

TrapMap bietet einen vollständig integrierten Dark/Light-Modus für eine optimale Benutzererfahrung zu jeder Tageszeit.

#### Desktop
- Theme-Toggle-Button befindet sich in der Sidebar-Fußzeile
- Sofortiges Umschalten zwischen hellen und dunklen Themes
- Einstellung wird im Local Storage gespeichert

#### Mobile
- **NEU**: Theme-Toggle-Button ist jetzt im Mobile-Header immer sichtbar
- Kein Öffnen der Sidebar erforderlich, um das Theme zu wechseln
- 44x44px Tap-Target für mobile-freundliche Bedienung
- Inklusive Aria-Labels für Barrierefreiheit
- Synchronisiert mit dem Sidebar-Toggle

#### Technische Details
- Verwendet CSS-Variablen für nahtlose Theme-Umschaltung
- ThemeProvider Context für globale State-Verwaltung
- Persistierung über Local Storage (`trapmap_theme`)
- Unterstützt sowohl das Sidebar-Toggle als auch das Mobile-Header-Toggle
