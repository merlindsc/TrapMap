# API Dokumentation - TrapMap

Vollständige REST API Referenz für das TrapMap Backend.

**Base URL:** `http://localhost:3000` (Development) oder `https://api.trapmap.com` (Production)

**Authentifizierung:** Die meisten Endpoints erfordern einen JWT Token im Authorization Header:
```
Authorization: Bearer <token>
```

---

## Auth Routes

**Base Path:** `/api/auth`

### POST /login
Login mit Email und Passwort.

- **Auth Required:** Nein
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role": "technician",
      "organisation_id": "org-id"
    }
  }
  ```
- **Validierung:**
  - Email erforderlich
  - Passwort erforderlich (min. 8 Zeichen)

### POST /refresh
JWT Token erneuern mit Refresh Token.

- **Auth Required:** Nein
- **Request Body:**
  ```json
  {
    "refreshToken": "refresh-token"
  }
  ```
- **Response:**
  ```json
  {
    "token": "new-jwt-token"
  }
  ```

### POST /change-password
Passwort ändern (authentifizierter User).

- **Auth Required:** Ja
- **Required Role:** Beliebig (eigenes Passwort)
- **Request Body:**
  ```json
  {
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Passwort erfolgreich geändert"
  }
  ```
- **Validierung:**
  - Neues Passwort min. 8 Zeichen

### POST /set-password
Neues Passwort setzen (nach erstem Login).

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Request Body:**
  ```json
  {
    "newPassword": "newpassword123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Passwort erfolgreich gesetzt"
  }
  ```
- **Validierung:**
  - Passwort min. 8 Zeichen

### POST /forgot-password
Passwort vergessen - Reset-Email anfordern.

- **Auth Required:** Nein
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Falls ein Account existiert, wurde eine E-Mail gesendet"
  }
  ```
- **Hinweis:** Gibt immer Erfolg zurück (Security)

### POST /reset-password
Passwort mit Token zurücksetzen.

- **Auth Required:** Nein
- **Request Body:**
  ```json
  {
    "token": "reset-token-from-email",
    "newPassword": "newpassword123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Passwort erfolgreich zurückgesetzt"
  }
  ```
- **Validierung:**
  - Passwort min. 8 Zeichen

### GET /me
Aktuellen User abrufen.

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:**
  ```json
  {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role": "technician",
      "organisation_id": "org-id",
      "first_name": "Max",
      "last_name": "Mustermann"
    }
  }
  ```

---

## Objects Routes

**Base Path:** `/api/objects`

### GET /
Alle Objekte abrufen (nur aktive).

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Query Parameters:**
  - `include_archived=true` - Auch archivierte Objekte einschließen
- **Response:**
  ```json
  [
    {
      "id": "object-id",
      "name": "Objekt 1",
      "address": "Musterstraße 1",
      "lat": 51.5074,
      "lng": -0.1278,
      "organisation_id": "org-id",
      "is_archived": false
    }
  ]
  ```

### GET /archived
Nur archivierte Objekte abrufen.

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:** Array von Objekt-Objekten

### GET /:id
Einzelnes Objekt abrufen.

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:**
  ```json
  {
    "id": "object-id",
    "name": "Objekt 1",
    "address": "Musterstraße 1",
    "lat": 51.5074,
    "lng": -0.1278,
    "organisation_id": "org-id",
    "is_archived": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
  ```

### POST /
Neues Objekt erstellen.

- **Auth Required:** Ja
- **Required Role:** `editor` (admin, supervisor, technician)
- **Request Body:**
  ```json
  {
    "name": "Neues Objekt",
    "address": "Musterstraße 1",
    "lat": 51.5074,
    "lng": -0.1278
  }
  ```
- **Response:** Erstelltes Objekt

### PATCH /:id
Objekt aktualisieren.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Request Body:**
  ```json
  {
    "name": "Geänderter Name",
    "address": "Neue Straße 1"
  }
  ```
- **Response:** Aktualisiertes Objekt

### PATCH /:id/location
GPS Position des Objekts setzen.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Request Body:**
  ```json
  {
    "lat": 51.5074,
    "lng": -0.1278
  }
  ```
- **Response:** Aktualisiertes Objekt

### POST /:id/archive
Objekt archivieren (Boxen werden zurück ins Lager verschoben).

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Objekt archiviert"
  }
  ```

### POST /:id/restore
Archiviertes Objekt wiederherstellen.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Objekt wiederhergestellt"
  }
  ```

### DELETE /:id
Objekt löschen.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## Boxes Routes

**Base Path:** `/api/boxes`

### GET /
Alle Boxen abrufen.

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Query Parameters:**
  - `object_id` - Nur Boxen eines bestimmten Objekts
- **Response:**
  ```json
  [
    {
      "id": "box-id",
      "qr_code": "TEST-001",
      "number": 1,
      "status": "active",
      "object_id": "object-id",
      "organisation_id": "org-id",
      "lat": 51.5074,
      "lng": -0.1278
    }
  ]
  ```

### GET /pool
Boxen im Lager (ohne Objekt-Zuordnung).

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:** Array von Box-Objekten ohne `object_id`

### GET /unplaced/:objectId
Unplatzierte Boxen eines Objekts (zugeordnet, aber ohne GPS/Grundriss-Position).

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:** Array von Box-Objekten

### GET /:id
Einzelne Box abrufen.

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:**
  ```json
  {
    "id": "box-id",
    "qr_code": "TEST-001",
    "number": 1,
    "status": "active",
    "object_id": "object-id",
    "organisation_id": "org-id",
    "lat": 51.5074,
    "lng": -0.1278,
    "placement": "map",
    "notes": "Notizen"
  }
  ```

### GET /:id/scans
Scan-Historie einer Box abrufen.

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:**
  ```json
  [
    {
      "id": "scan-id",
      "box_id": "box-id",
      "user_id": "user-id",
      "finding_type": "keine_auffaelligkeiten",
      "scanned_at": "2024-01-01T12:00:00Z",
      "photo_url": "https://...",
      "notes": "Alles in Ordnung"
    }
  ]
  ```

### PATCH /:id
Box aktualisieren (partielle Updates).

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Request Body:**
  ```json
  {
    "status": "maintenance",
    "notes": "In Wartung"
  }
  ```
- **Response:** Aktualisierte Box
- **Status Values:** `active`, `inactive`, `maintenance`, `storage`

### PUT /:id/position
GPS Position der Box setzen.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Request Body:**
  ```json
  {
    "lat": 51.5074,
    "lng": -0.1278,
    "method": "gps"
  }
  ```
- **Response:** Aktualisierte Box

### DELETE /:id
Box löschen (soft delete).

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Response:**
  ```json
  {
    "success": true
  }
  ```

### POST /:id/assign
Box einem Objekt zuweisen (aus Lager).

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Request Body:**
  ```json
  {
    "object_id": "object-id"
  }
  ```
- **Response:** Aktualisierte Box

### POST /:id/return-to-pool
Box zurück ins Lager verschieben.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Response:** Aktualisierte Box (ohne `object_id`)

### PUT /:id/move
Box zu anderem Objekt verschieben.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Request Body:**
  ```json
  {
    "target_object_id": "new-object-id"
  }
  ```
- **Response:** Aktualisierte Box
- **Hinweis:** Wichtiges Feature für Box-Transfer zwischen Objekten

### POST /renumber/:objectId
Boxen eines Objekts neu nummerieren.

- **Auth Required:** Ja
- **Required Role:** `editor`
- **Response:**
  ```json
  {
    "success": true,
    "updated": 15
  }
  ```

---

## Scans Routes

**Base Path:** `/api/scans`

### GET /
Scan History abrufen (neueste zuerst).

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Query Parameters:**
  - `limit` - Anzahl Ergebnisse (default: 50)
- **Response:**
  ```json
  [
    {
      "id": "scan-id",
      "box_id": "box-id",
      "user_id": "user-id",
      "finding_type": "keine_auffaelligkeiten",
      "scanned_at": "2024-01-01T12:00:00Z",
      "photo_url": "https://...",
      "notes": "Notizen",
      "lat": 51.5074,
      "lng": -0.1278
    }
  ]
  ```

### GET /box/:boxId
Scan History für eine spezifische Box.

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Response:** Array von Scan-Objekten

### POST /
Neuen Scan erstellen (mit optionalem Foto).

- **Auth Required:** Ja
- **Required Role:** Beliebig
- **Content-Type:** `multipart/form-data` (bei Foto-Upload)
- **Request Body:**
  ```json
  {
    "box_id": "box-id",
    "finding_type": "keine_auffaelligkeiten",
    "notes": "Alles in Ordnung",
    "lat": 51.5074,
    "lng": -0.1278,
    "update_gps": true
  }
  ```
- **Optional File:** `photo` (max. 10MB, JPG/PNG/GIF/WEBP)
- **Response:**
  ```json
  {
    "id": "scan-id",
    "box_id": "box-id",
    "finding_type": "keine_auffaelligkeiten",
    "scanned_at": "2024-01-01T12:00:00Z",
    "photo_url": "https://..."
  }
  ```
- **Finding Types:**
  - `keine_auffaelligkeiten` - Keine Auffälligkeiten
  - `koeder_angefressen` - Köder angefressen
  - `fang` - Fang/Schädling gefangen
  - `defekt` - Falle defekt
  - `verschoben` - Falle verschoben
  - `beschaedigt` - Falle beschädigt
  - `fehlt` - Falle fehlt

---

## Benutzerrollen

Die API verwendet 6 verschiedene Rollen:

1. **admin** - Vollzugriff auf alle Funktionen
2. **supervisor** - Management und Überwachung
3. **technician** - Feldarbeit und Scanning
4. **auditor** - Prüfung und Reports
5. **viewer** - Nur-Lese-Zugriff
6. **partner** - Eingeschränkter Partner-Zugriff

### Rollenberechtigung:
- **editor** = `admin`, `supervisor`, `technician` (Schreibzugriff)
- **Alle** = Jede Rolle hat Zugriff (Lesezugriff)

---

## Error Responses

Alle Fehler folgen diesem Format:

```json
{
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (Validierungsfehler)
- `401` - Unauthorized (fehlende/ungültige Authentifizierung)
- `403` - Forbidden (fehlende Berechtigung)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Die API ist Rate-Limited um Missbrauch zu verhindern:

- **Login:** 5 Requests pro 15 Minuten pro IP
- **Standard Endpoints:** 100 Requests pro 15 Minuten pro IP

Bei Überschreitung: `429 Too Many Requests`

---

## Pagination

Noch nicht implementiert. Alle Listen geben alle Ergebnisse zurück. Kann in Zukunft hinzugefügt werden.

---

**Version:** 1.0.0  
**Last Updated:** Dezember 2024
