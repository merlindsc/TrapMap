/* ============================================================
   TRAPMAP CHATBOT SERVICE v2
   GPT-4o mini mit Function Calling - ERWEITERT
   Kann jetzt Reports generieren, Boxen anlegen, und mehr!
   ============================================================ */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// System Prompt - Der Bot kennt TrapMap in- und auswendig
const SYSTEM_PROMPT = `Du bist der TrapMap Support-Assistent. Du hilfst Kunden bei der Nutzung von TrapMap - einer Software für digitales Schädlingsmonitoring.

## Was ist TrapMap?
TrapMap digitalisiert das Schädlingsmonitoring für Schädlingsbekämpfer. Statt Papierformularen scannen Techniker QR-Codes an Monitoring-Boxen, dokumentieren den Status digital und erstellen automatisch HACCP/IFS-konforme Reports.

## Kernfunktionen:
- **QR-Code Scanning**: Jede Box hat einen QR-Code. Scannen → Status erfassen → Fertig
- **Digitale Lagepläne**: Boxen auf Grundrissen oder GPS-Karten platzieren
- **Automatische Reports**: PDF-Reports per Knopfdruck, audit-sicher
- **Kontrollintervalle**: Automatische Erinnerungen bei überfälligen Kontrollen
- **Multi-Mandanten**: Mehrere Kunden/Objekte verwalten
- **Partner-Accounts**: Kunden Zugriff auf ihre eigenen Daten geben

## Status-Typen für Boxen:
- 🟢 Grün (ok): Alles in Ordnung, kein Befall
- 🟡 Gelb (activity): Leichte Aktivität festgestellt
- 🟠 Orange (warning): Erhöhte Aktivität, Maßnahmen empfohlen
- 🔴 Rot (critical): Kritischer Befall, sofortiges Handeln nötig

## Kontrollintervalle:
- Fix: Exakt alle X Tage (7, 14, 21, 30, 60, 90)
- Range: Zwischen X und Y Tagen (flexibel)

## Preise (nach BETA):
- Solo (29€/Monat): 1 User, 5 Objekte, 100 Boxen
- Starter (79€/Monat): 3 User, 15 Objekte, 300 Boxen
- Professional (149€/Monat): 10 User, 50 Objekte, 1.000 Boxen
- Business (299€/Monat): 25 User, 150 Objekte, 5.000 Boxen
- Enterprise: Individuell

## Zusätzliche Boxen kaufen:
- 100 Boxen = +10€/Monat
- 200 Boxen = +20€/Monat
- usw.
Wenn User Boxen kaufen will:
1. Frage nach Anzahl (in 100er Schritten)
2. Zeige Preis und frage nach Bestätigung
3. Bei Bestätigung: purchase_boxes mit confirmed=true aufrufen
4. Boxen werden SOFORT erstellt und QR-Codes per E-Mail geliefert!

## BETA-Phase:
Bis März 2026 ist TrapMap komplett kostenlos nutzbar!

## Compliance:
TrapMap ist konform mit: HACCP, IFS, ISO 22000, AIB, DSGVO

## Dein Verhalten:
- Antworte auf Deutsch, freundlich und hilfsbereit
- Nutze die verfügbaren Funktionen um Daten abzurufen UND AKTIONEN AUSZUFÜHREN
- Wenn der User einen Report will, generiere ihn mit generate_report!
- Wenn der User Boxen oder Objekte anlegen will, mach es!
- Halte Antworten kurz und präzise
- Bei technischen Problemen: Verweise auf info@trap-map.de oder 0152/026 370 89
- Du kannst NUR Daten der Organisation des eingeloggten Users sehen/ändern

## WICHTIG - Aktionen ausführen:
Wenn der User sagt "erstelle Report für Objekt X" oder "generiere PDF für Objekt X" oder "pdf objekt X", dann:
1. Rufe SOFORT get_objects_list auf um die Objekt-IDs zu bekommen
2. Finde die richtige object_id (Objekt 1 = erstes in der Liste)
3. Rufe SOFORT generate_report mit der object_id auf
4. Gib dem User den Download-Link zurück

WICHTIG: Sage NIEMALS "Generiere den Report..." ohne die generate_report Funktion aufzurufen!
Du MUSST die Funktion aufrufen, nicht nur davon reden!

Wenn User nach "Objekt 1" fragt, meint er das erste Objekt in der Liste, nicht ID=1!

Beispiel:
- User: "pdf für objekt 1"
- Du rufst get_objects_list auf → bekommst [{nummer: 1, id: 35, name: "Bäckerei"}]
- Du rufst generate_report mit object_id: 35 auf
- Du gibst den Link zurück`;

// Function Definitions für GPT - ERWEITERT
const FUNCTIONS = [
  {
    name: "get_boxes_count",
    description: "Gibt die Anzahl der Boxen des Users zurück, optional gefiltert nach Status oder Objekt",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["ok", "activity", "warning", "critical"],
          description: "Filter nach Status"
        },
        object_id: {
          type: "integer",
          description: "Filter nach Objekt-ID"
        }
      }
    }
  },
  {
    name: "get_boxes_list",
    description: "Gibt eine Liste der Boxen zurück mit Details",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximale Anzahl (default 10)"
        },
        status: {
          type: "string",
          enum: ["ok", "activity", "warning", "critical"],
          description: "Filter nach Status"
        },
        object_id: {
          type: "integer",
          description: "Filter nach Objekt-ID"
        }
      }
    }
  },
  {
    name: "get_objects_list",
    description: "Gibt die Liste der Objekte/Standorte des Users zurück mit ID, Name und Adresse",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_object_details",
    description: "Gibt Details zu einem spezifischen Objekt zurück",
    parameters: {
      type: "object",
      properties: {
        object_id: {
          type: "integer",
          description: "Die ID des Objekts"
        }
      },
      required: ["object_id"]
    }
  },
  {
    name: "get_overdue_boxes",
    description: "Gibt alle überfälligen Boxen zurück, die kontrolliert werden müssen",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_recent_scans",
    description: "Gibt die letzten Kontrollen/Scans zurück",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Anzahl der Scans (default 5)"
        },
        object_id: {
          type: "integer",
          description: "Filter nach Objekt-ID"
        }
      }
    }
  },
  {
    name: "get_dashboard_stats",
    description: "Gibt Übersichts-Statistiken zurück: Gesamtanzahl Boxen, nach Status, überfällig",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "generate_report",
    description: "Generiert einen PDF-Report für ein Objekt. Gibt einen Download-Link zurück.",
    parameters: {
      type: "object",
      properties: {
        object_id: {
          type: "integer",
          description: "Die ID des Objekts für den Report"
        },
        report_type: {
          type: "string",
          enum: ["standard", "detailed", "summary"],
          description: "Art des Reports (default: standard)"
        },
        date_from: {
          type: "string",
          description: "Startdatum für Report (YYYY-MM-DD, optional)"
        },
        date_to: {
          type: "string",
          description: "Enddatum für Report (YYYY-MM-DD, optional)"
        }
      },
      required: ["object_id"]
    }
  },
  {
    name: "create_object",
    description: "Erstellt ein neues Objekt/Standort",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name des Objekts (z.B. 'Bäckerei Müller')"
        },
        address: {
          type: "string",
          description: "Straße und Hausnummer"
        },
        city: {
          type: "string",
          description: "Stadt"
        },
        zip: {
          type: "string",
          description: "Postleitzahl"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "search_box",
    description: "Sucht eine Box nach QR-Code oder Bezeichnung",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Suchbegriff (QR-Code oder Teil davon)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "purchase_boxes",
    description: "Kauft zusätzliche Boxen für die Organisation. 100 Boxen = 10€/Monat mehr. Boxen werden sofort erstellt und QR-Codes per E-Mail geliefert.",
    parameters: {
      type: "object",
      properties: {
        quantity: {
          type: "integer",
          description: "Anzahl der Boxen (in 100er Schritten: 100, 200, 300...)"
        },
        confirmed: {
          type: "boolean",
          description: "Muss true sein um den Kauf abzuschließen. Bei false wird nur der Preis angezeigt."
        }
      },
      required: ["quantity"]
    }
  },
  {
    name: "get_pricing_info",
    description: "Zeigt aktuelle Preise und verfügbare Box-Pakete an",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

// Function Implementations
async function executeFunction(name, args, organisationId, userId) {
  console.log(`[Chatbot] Executing function: ${name}`, args);
  
  switch (name) {
    case "get_boxes_count": {
      let query = supabase
        .from('boxes')
        .select('id', { count: 'exact' })
        .eq('organisation_id', organisationId);
      
      if (args.status) query = query.eq('current_status', args.status);
      if (args.object_id) query = query.eq('object_id', args.object_id);
      
      const { count, error } = await query;
      if (error) throw error;
      return { count };
    }

    case "get_boxes_list": {
      const limit = args.limit || 10;
      let query = supabase
        .from('boxes')
        .select(`
          id, 
          qr_code, 
          current_status, 
          last_scan,
          control_interval_days,
          object_id,
          objects(name)
        `)
        .eq('organisation_id', organisationId)
        .order('last_scan', { ascending: false, nullsFirst: false })
        .limit(limit);
      
      if (args.status) query = query.eq('current_status', args.status);
      if (args.object_id) query = query.eq('object_id', args.object_id);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data.map(b => ({
        id: b.id,
        qr_code: b.qr_code,
        status: b.current_status || 'unbekannt',
        letzte_kontrolle: b.last_scan ? new Date(b.last_scan).toLocaleDateString('de-DE') : 'Nie',
        intervall_tage: b.control_interval_days || 30,
        objekt: b.objects?.name || 'Nicht zugewiesen',
        object_id: b.object_id
      }));
    }

    case "get_objects_list": {
      const { data, error } = await supabase
        .from('objects')
        .select('id, name, address, city, zip')
        .eq('organisation_id', organisationId)
        .order('name');
      
      if (error) throw error;
      
      // Nummeriere die Objekte für einfachere Referenz
      return data.map((obj, index) => ({
        nummer: index + 1,
        id: obj.id,
        name: obj.name,
        adresse: obj.address ? `${obj.address}, ${obj.zip || ''} ${obj.city || ''}`.trim() : 'Keine Adresse'
      }));
    }

    case "get_object_details": {
      const { data: obj, error } = await supabase
        .from('objects')
        .select('*')
        .eq('id', args.object_id)
        .eq('organisation_id', organisationId)
        .single();
      
      if (error) throw error;
      
      // Boxen-Statistik für dieses Objekt
      const { data: boxes } = await supabase
        .from('boxes')
        .select('id, current_status')
        .eq('object_id', args.object_id);
      
      return {
        id: obj.id,
        name: obj.name,
        adresse: `${obj.address || ''}, ${obj.zip || ''} ${obj.city || ''}`.trim(),
        boxen_gesamt: boxes?.length || 0,
        boxen_ok: boxes?.filter(b => b.current_status === 'ok').length || 0,
        boxen_warnung: boxes?.filter(b => ['warning', 'critical'].includes(b.current_status)).length || 0
      };
    }

    case "get_overdue_boxes": {
      const { data, error } = await supabase
        .from('boxes')
        .select(`
          id, 
          qr_code, 
          current_status,
          last_scan,
          control_interval_days,
          objects(name)
        `)
        .eq('organisation_id', organisationId);
      
      if (error) throw error;
      
      const now = new Date();
      const overdue = data.filter(box => {
        if (!box.last_scan) return true;
        const lastScan = new Date(box.last_scan);
        const daysSince = Math.floor((now - lastScan) / (1000 * 60 * 60 * 24));
        return daysSince > (box.control_interval_days || 30);
      });
      
      return overdue.map(b => ({
        id: b.id,
        qr_code: b.qr_code,
        objekt: b.objects?.name || 'Unbekannt',
        tage_überfällig: b.last_scan 
          ? Math.floor((now - new Date(b.last_scan)) / (1000 * 60 * 60 * 24)) - (b.control_interval_days || 30)
          : 999,
        status: 'Nie kontrolliert'
      }));
    }

    case "get_recent_scans": {
      const limit = args.limit || 5;
      let query = supabase
        .from('scans')
        .select(`
          id,
          status,
          scanned_at,
          notes,
          boxes(qr_code, object_id, objects(name))
        `)
        .eq('organisation_id', organisationId)
        .order('scanned_at', { ascending: false })
        .limit(limit);
      
      if (args.object_id) {
        // Filter by object through boxes
        const { data: boxIds } = await supabase
          .from('boxes')
          .select('id')
          .eq('object_id', args.object_id);
        
        if (boxIds && boxIds.length > 0) {
          query = query.in('box_id', boxIds.map(b => b.id));
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data.map(s => ({
        datum: new Date(s.scanned_at).toLocaleDateString('de-DE'),
        uhrzeit: new Date(s.scanned_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        box: s.boxes?.qr_code || 'Unbekannt',
        objekt: s.boxes?.objects?.name || 'Unbekannt',
        status: s.status,
        notiz: s.notes || '-'
      }));
    }

    case "get_dashboard_stats": {
      const { data: boxes, error } = await supabase
        .from('boxes')
        .select('id, current_status, last_scan, control_interval_days')
        .eq('organisation_id', organisationId);
      
      if (error) throw error;
      
      const { data: objects } = await supabase
        .from('objects')
        .select('id')
        .eq('organisation_id', organisationId);
      
      const now = new Date();
      const stats = {
        objekte: objects?.length || 0,
        boxen_gesamt: boxes.length,
        boxen_ok: boxes.filter(b => b.current_status === 'ok').length,
        boxen_aktivität: boxes.filter(b => b.current_status === 'activity').length,
        boxen_warnung: boxes.filter(b => b.current_status === 'warning').length,
        boxen_kritisch: boxes.filter(b => b.current_status === 'critical').length,
        boxen_überfällig: boxes.filter(b => {
          if (!b.last_scan) return true;
          const days = Math.floor((now - new Date(b.last_scan)) / (1000 * 60 * 60 * 24));
          return days > (b.control_interval_days || 30);
        }).length
      };
      
      return stats;
    }

    case "generate_report": {
      // Prüfe ob Objekt existiert und dem User gehört
      const { data: obj, error: objError } = await supabase
        .from('objects')
        .select('id, name')
        .eq('id', args.object_id)
        .eq('organisation_id', organisationId)
        .single();
      
      if (objError || !obj) {
        return { 
          success: false, 
          error: `Objekt mit ID ${args.object_id} nicht gefunden oder kein Zugriff.` 
        };
      }
      
      // Generiere Report-URL (der Frontend kann diese öffnen)
      const baseUrl = process.env.FRONTEND_URL || 'https://trap-map.de';
      const apiUrl = process.env.API_URL || 'https://trapmap-backend.onrender.com';
      
      // Report-Link erstellen
      const reportUrl = `${apiUrl}/api/audit-reports/${args.object_id}`;
      
      return {
        success: true,
        message: `PDF-Report für "${obj.name}" wurde generiert!`,
        objekt_name: obj.name,
        objekt_id: obj.id,
        download_url: reportUrl,
        hinweis: `Klicke auf den Link um den Report herunterzuladen: ${reportUrl}`
      };
    }

    case "create_object": {
      const { data, error } = await supabase
        .from('objects')
        .insert({
          organisation_id: organisationId,
          name: args.name,
          address: args.address || null,
          city: args.city || null,
          zip: args.zip || null,
          created_by: userId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: `Objekt "${args.name}" wurde erstellt!`,
        objekt_id: data.id,
        name: data.name
      };
    }

    case "search_box": {
      const { data, error } = await supabase
        .from('boxes')
        .select(`
          id,
          qr_code,
          current_status,
          last_scan,
          objects(name)
        `)
        .eq('organisation_id', organisationId)
        .ilike('qr_code', `%${args.query}%`)
        .limit(10);
      
      if (error) throw error;
      
      if (data.length === 0) {
        return { found: false, message: `Keine Box mit "${args.query}" gefunden.` };
      }
      
      return {
        found: true,
        anzahl: data.length,
        boxen: data.map(b => ({
          id: b.id,
          qr_code: b.qr_code,
          status: b.current_status || 'unbekannt',
          objekt: b.objects?.name || 'Nicht zugewiesen',
          letzte_kontrolle: b.last_scan ? new Date(b.last_scan).toLocaleDateString('de-DE') : 'Nie'
        }))
      };
    }

    case "get_pricing_info": {
      return {
        pakete: [
          { boxen: 100, preis: "10€/Monat" },
          { boxen: 200, preis: "20€/Monat" },
          { boxen: 300, preis: "30€/Monat" },
          { boxen: 500, preis: "50€/Monat" },
          { boxen: 1000, preis: "100€/Monat" }
        ],
        hinweis: "Boxen werden sofort erstellt und QR-Codes per E-Mail geliefert!",
        beta_hinweis: "Während der BETA-Phase (bis März 2026) sind alle Boxen kostenlos!"
      };
    }

    case "purchase_boxes": {
      const quantity = args.quantity;
      const confirmed = args.confirmed === true;
      
      // Validierung
      if (quantity < 100 || quantity % 100 !== 0) {
        return {
          success: false,
          error: "Bitte in 100er Schritten kaufen (100, 200, 300...)"
        };
      }
      
      const pricePerMonth = (quantity / 100) * 10;
      
      // Wenn nicht bestätigt, nur Preis anzeigen
      if (!confirmed) {
        return {
          needs_confirmation: true,
          quantity: quantity,
          price: `${pricePerMonth}€/Monat`,
          message: `${quantity} Boxen kosten ${pricePerMonth}€/Monat zusätzlich. Boxen werden sofort erstellt und QR-Codes per E-Mail geliefert. Soll ich den Kauf abschließen?`
        };
      }
      
      // KAUF DURCHFÜHREN
      console.log(`[Chatbot] Processing purchase: ${quantity} boxes for org ${organisationId}`);
      
      try {
        // 1. Organisation-Daten holen
        const { data: org, error: orgError } = await supabase
          .from('organisations')
          .select('id, name')
          .eq('id', organisationId)
          .single();
        
        // 2. User-Daten holen
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', userId)
          .single();
        
        console.log('[Chatbot] Org:', org, 'OrgError:', orgError);
        console.log('[Chatbot] User:', user, 'UserError:', userError);
        
        const userEmail = user?.email || 'kunde@trap-map.de';
        const orgName = org?.name || `Organisation ${organisationId}`;
        
        const timestamp = Date.now();
        
        // Höchste Box-Nummer finden für fortlaufende Nummerierung
        const { data: lastBox } = await supabase
          .from('boxes')
          .select('qr_code')
          .eq('organisation_id', organisationId)
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        // Nächste Nummer ermitteln (z.B. DSE-0211 -> 212)
        let startNum = 1;
        if (lastBox && lastBox.qr_code) {
          const match = lastBox.qr_code.match(/(\d+)$/);
          if (match) {
            startNum = parseInt(match[1]) + 1;
          }
        }
        
        // Prefix aus existierendem QR-Code oder "BOX"
        let prefix = 'BOX';
        if (lastBox && lastBox.qr_code) {
          const prefixMatch = lastBox.qr_code.match(/^([A-Za-z]+)/);
          if (prefixMatch) {
            prefix = prefixMatch[1];
          }
        }
        
        // 1. Erst QR-Codes erstellen
        const qrCodes = [];
        for (let i = 0; i < quantity; i++) {
          const num = startNum + i;
          const qrCode = `${prefix}-${String(num).padStart(4, '0')}`;
          qrCodes.push({
            id: qrCode,
            organisation_id: organisationId,
            printed: false,
            assigned: false,
            sequence_number: num
          });
        }
        
        const { error: qrError } = await supabase
          .from('qr_codes')
          .insert(qrCodes);
        
        if (qrError) {
          console.error('[Chatbot] QR-Code creation error:', qrError);
          return { success: false, error: 'Fehler beim Erstellen der QR-Codes: ' + qrError.message };
        }
        
        // 2. Dann Boxen erstellen mit den QR-Codes
        const boxes = [];
        for (let i = 0; i < quantity; i++) {
          const num = startNum + i;
          const qrCode = `${prefix}-${String(num).padStart(4, '0')}`;
          boxes.push({
            organisation_id: organisationId,
            qr_code: qrCode,
            current_status: 'green',
            status: 'green',
            active: true,
            control_interval_days: 30
          });
        }
        
        // Boxen in DB einfügen
        const { data: createdBoxes, error: boxError } = await supabase
          .from('boxes')
          .insert(boxes)
          .select('id, qr_code');
        
        if (boxError) {
          console.error('[Chatbot] Box creation error:', boxError);
          return { success: false, error: 'Fehler beim Erstellen der Boxen: ' + boxError.message };
        }
        
        // 3. QR-Order erstellen für Tracking (optional - falls Tabelle existiert)
        let orderId = timestamp;
        try {
          const { data: order } = await supabase
            .from('qr_orders')
            .insert({
              organisation_id: organisationId,
              user_id: userId,
              quantity: quantity,
              status: 'completed',
              order_type: 'chatbot_purchase'
            })
            .select()
            .single();
          if (order) orderId = order.id;
        } catch (orderErr) {
          console.log('[Chatbot] QR-Order table might not exist, skipping:', orderErr.message);
        }
        
        // 4. E-Mail mit QR-Codes senden
        try {
          const emailService = require('./email.service');
          
          await emailService.sendEmail({
            to: userEmail,
            subject: `🎉 Ihre ${quantity} neuen TrapMap Boxen sind bereit!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">Vielen Dank für Ihren Kauf!</h1>
                
                <p>Ihre <strong>${quantity} neuen Boxen</strong> wurden erfolgreich erstellt und sind ab sofort in Ihrem TrapMap-Account verfügbar.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Bestelldetails:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li>📦 Anzahl: <strong>${quantity} Boxen</strong></li>
                    <li>💰 Monatlicher Preis: <strong>${pricePerMonth}€</strong></li>
                    <li>📅 Bestellnummer: <strong>#${orderId}</strong></li>
                  </ul>
                </div>
                
                <h3>Ihre QR-Codes:</h3>
                <div style="background: #1f2937; color: #10b981; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;">
                  ${createdBoxes.slice(0, 20).map(b => b.qr_code).join('<br>')}
                  ${quantity > 20 ? `<br>... und ${quantity - 20} weitere` : ''}
                </div>
                
                <p style="margin-top: 20px;">
                  <a href="https://trap-map.de/boxes" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Boxen in TrapMap ansehen
                  </a>
                </p>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  Bei Fragen: info@trap-map.de oder 0152/026 370 89
                </p>
              </div>
            `
          });
          
          // Admin-Benachrichtigung
          await emailService.sendEmail({
            to: 'info@trap-map.de',
            subject: `💰 Neuer Box-Kauf: ${quantity} Boxen`,
            html: `
              <h2>Neuer Kauf über Chatbot!</h2>
              <ul>
                <li><strong>Organisation:</strong> ${orgName} (ID: ${organisationId})</li>
                <li><strong>User:</strong> ${userEmail}</li>
                <li><strong>Anzahl:</strong> ${quantity} Boxen</li>
                <li><strong>Monatspreis:</strong> ${pricePerMonth}€</li>
                <li><strong>Bestellnummer:</strong> #${orderId}</li>
              </ul>
              <p><strong>⚠️ Rechnung muss noch erstellt werden!</strong></p>
            `
          });
          
        } catch (emailErr) {
          console.error('[Chatbot] Email error:', emailErr.message);
          // Kauf trotzdem erfolgreich, nur E-Mail fehlgeschlagen
        }
        
        console.log(`[Chatbot] Purchase completed: ${quantity} boxes`);
        
        return {
          success: true,
          message: `🎉 Kauf erfolgreich! ${quantity} Boxen wurden erstellt.`,
          details: {
            anzahl: quantity,
            monatspreis: `${pricePerMonth}€`,
            bestellnummer: orderId,
            boxen_erstellt: createdBoxes.length
          },
          hinweis: `Die QR-Codes wurden an ${userEmail} gesendet. Die Boxen sind sofort in deinem Account verfügbar!`
        };
        
      } catch (purchaseError) {
        console.error('[Chatbot] Purchase error:', purchaseError);
        return {
          success: false,
          error: 'Fehler beim Kaufvorgang: ' + purchaseError.message
        };
      }
    }

    default:
      throw new Error(`Unbekannte Funktion: ${name}`);
  }
}

// Haupt-Chat-Funktion
async function chat(messages, organisationId, userId) {
  try {
    // GPT-4o mini mit Function Calling
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
      functions: FUNCTIONS,
      function_call: "auto",
      max_tokens: 1500,
      temperature: 0.7
    });

    const message = response.choices[0].message;

    // Wenn GPT eine Funktion aufrufen will
    if (message.function_call) {
      const functionName = message.function_call.name;
      const functionArgs = JSON.parse(message.function_call.arguments || '{}');
      
      console.log(`[Chatbot] Calling function: ${functionName}`, functionArgs);
      
      // Funktion ausführen
      const functionResult = await executeFunction(functionName, functionArgs, organisationId, userId);
      
      // Ergebnis zurück an GPT geben
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
          message,
          {
            role: "function",
            name: functionName,
            content: JSON.stringify(functionResult)
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      return {
        response: secondResponse.choices[0].message.content,
        function_called: functionName,
        function_result: functionResult,
        tokens_used: response.usage.total_tokens + secondResponse.usage.total_tokens
      };
    }

    // Direkte Antwort ohne Funktionsaufruf
    return {
      response: message.content,
      function_called: null,
      tokens_used: response.usage.total_tokens
    };

  } catch (error) {
    console.error('[Chatbot] Error:', error);
    throw error;
  }
}

module.exports = {
  chat
};