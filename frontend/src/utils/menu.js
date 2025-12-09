export const menuStructure = {
    superadmin: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Einsätze", to: "/jobs" },
      { label: "Objekte", to: "/objects" },
      { label: "Layouts", to: "/layouts" },
      { label: "Boxen", to: "/boxes" },
      { label: "QR-Scan", to: "/scan" },
      { label: "Historie", to: "/history" },
      { label: "Nutzer", to: "/users" },
      { label: "Organisationen", to: "/orgs" },
      { label: "Logs", to: "/logs" },
      { label: "API Tools", to: "/api-tools" },
      { label: "Einstellungen", to: "/settings" },
    ],
  
    admin: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Einsätze", to: "/jobs" },
      { label: "Objekte", to: "/objects" },
      { label: "Layouts", to: "/layouts" },
      { label: "Boxen", to: "/boxes" },
      { label: "QR-Scan", to: "/scan" },
      { label: "Historie", to: "/history" },
      { label: "Nutzer", to: "/users" },
      { label: "Berichte", to: "/reports" },
      { label: "Einstellungen", to: "/settings" },
    ],
  
    technician: [
      { label: "Heute", to: "/tech" },
      { label: "Objekte", to: "/tech/objects" },
      { label: "Layouts", to: "/tech/layouts" },   // ganz wichtig
      { label: "Boxen", to: "/tech/boxes" },
      { label: "QR-Scan", to: "/tech/scan" },
      { label: "Verlauf", to: "/tech/history" },
      { label: "Einstellungen", to: "/settings" },
    ],
  
    supervisor: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Touren", to: "/tours" },
      { label: "Techniker", to: "/technicians" },
      { label: "Objekte", to: "/objects" },
      { label: "Layouts", to: "/layouts" },
      { label: "Berichte", to: "/reports" },
      { label: "Historie", to: "/history" },
      { label: "Einstellungen", to: "/settings" },
    ],
  
    auditor: [
      { label: "Audits", to: "/audits" },
      { label: "Objekte", to: "/objects" },
      { label: "Boxenstatus", to: "/boxes" },
      { label: "Protokolle", to: "/reports" },
      { label: "Exporte", to: "/exports" },
      { label: "Historie", to: "/history" },
      { label: "Logout", to: "/logout" },
    ],
  };
  