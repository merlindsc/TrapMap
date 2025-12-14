/* ============================================================
   TRAPMAP - ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB)
   Rechtlich vollständig für SaaS-Dienst
   ============================================================ */

import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./Legal.css";

export default function AGB() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">
          <ArrowLeft size={18} />
          Zurück zur Startseite
        </Link>

        <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

        <section className="legal-section">
          <h2>§ 1 Geltungsbereich</h2>
          <p>
            (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") gelten für alle Verträge 
            zwischen Merlin Jakob Hanika, TrapMap, Egenbüttelweg 40A, 22880 Wedel (nachfolgend 
            „Anbieter") und dem Kunden über die Nutzung der webbasierten Software TrapMap 
            (nachfolgend „Software" oder „Dienst").
          </p>
          <p>
            (2) Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des 
            Kunden werden nur dann und insoweit Vertragsbestandteil, als der Anbieter ihrer Geltung 
            ausdrücklich schriftlich zugestimmt hat.
          </p>
          <p>
            (3) Kunde im Sinne dieser AGB können sowohl Verbraucher als auch Unternehmer sein. 
            Unternehmer ist eine natürliche oder juristische Person oder eine rechtsfähige 
            Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts in Ausübung ihrer 
            gewerblichen oder selbständigen beruflichen Tätigkeit handelt.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 2 Vertragsgegenstand</h2>
          <p>
            (1) Gegenstand des Vertrages ist die Bereitstellung der Software TrapMap zur digitalen 
            Dokumentation von Schädlingsmonitoring als Software-as-a-Service (SaaS) über das 
            Internet.
          </p>
          <p>
            (2) Die Software umfasst insbesondere folgende Funktionen:
          </p>
          <ul>
            <li>QR-Code basiertes Erfassen und Dokumentieren von Monitoring-Boxen</li>
            <li>Digitale Lagepläne und GPS-gestützte Kartendarstellung</li>
            <li>Verwaltung von Objekten, Boxen und Kontrollen</li>
            <li>Automatische Erstellung von Audit-konformen Reports</li>
            <li>Foto-Dokumentation</li>
            <li>Benutzerverwaltung (Admin, Techniker, Partner)</li>
          </ul>
          <p>
            (3) Der Anbieter stellt die Software in der jeweils aktuellen Version zur Verfügung. 
            Der Anbieter ist berechtigt, die Software weiterzuentwickeln und anzupassen. Dabei 
            bleibt der wesentliche Funktionsumfang erhalten.
          </p>
          <p>
            (4) Der Anbieter schuldet keine Anpassung der Software an die individuellen Bedürfnisse 
            des Kunden, es sei denn, dies wurde ausdrücklich vereinbart.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 3 Vertragsschluss</h2>
          <p>
            (1) Die Darstellung der Software auf der Website stellt kein rechtlich bindendes 
            Angebot dar, sondern eine Aufforderung zur Abgabe eines Angebots.
          </p>
          <p>
            (2) Mit der Registrierung gibt der Kunde ein verbindliches Angebot zum Abschluss eines 
            Nutzungsvertrages ab. Der Vertrag kommt zustande, wenn der Anbieter die Registrierung 
            bestätigt oder die Nutzung freischaltet.
          </p>
          <p>
            (3) Der Vertragstext wird vom Anbieter nicht gespeichert und ist nach Vertragsschluss 
            nicht mehr zugänglich. Der Kunde sollte diese AGB daher vor Vertragsschluss speichern 
            oder ausdrucken.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 4 Kostenlose Testphase</h2>
          <p>
            (1) Der Anbieter bietet eine kostenlose Testphase bis zum 01.02.2026 an. Während dieser 
            Zeit kann die Software kostenlos und unverbindlich getestet werden.
          </p>
          <p>
            (2) Die Testphase geht nicht automatisch in ein kostenpflichtiges Abonnement über. 
            Nach Ablauf der Testphase muss der Kunde aktiv ein Abonnement abschließen, um die 
            Software weiter nutzen zu können.
          </p>
          <p>
            (3) Der Anbieter behält sich vor, den Umfang der in der Testphase verfügbaren 
            Funktionen einzuschränken.
          </p>
          <p>
            (4) Der Anbieter kann die Testphase jederzeit beenden oder die Konditionen ändern, 
            wobei bestehende Testzugänge bis zum 01.02.2026 davon unberührt bleiben.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 5 Preise und Zahlungsbedingungen</h2>
          <p>
            (1) Es gelten die zum Zeitpunkt des Vertragsschlusses auf der Website angegebenen 
            Preise. Alle Preise verstehen sich in Euro und inklusive der gesetzlichen 
            Mehrwertsteuer.
          </p>
          <p>
            (2) Die aktuellen Preispakete sind:
          </p>
          <ul>
            <li><strong>Einzelkämpfer:</strong> 25,00 € / Monat (1 Admin, 3 Objekte, 50 Boxen)</li>
            <li><strong>3er Flat:</strong> 65,00 € / Monat (3 User, 5 Objekte, 150 Boxen)</li>
            <li><strong>10er Runde:</strong> 190,00 € / Monat (10 User, 20 Objekte, 650 Boxen, 2 Partner-Accounts)</li>
            <li><strong>Enterprise:</strong> Individuelle Preisgestaltung nach Vereinbarung</li>
          </ul>
          <p>
            (3) Die Zahlung erfolgt monatlich im Voraus. Der Anbieter stellt eine Rechnung aus, 
            die innerhalb von 14 Tagen zu begleichen ist.
          </p>
          <p>
            (4) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zur Software zu 
            sperren, bis die ausstehenden Zahlungen beglichen sind.
          </p>
          <p>
            (5) Der Anbieter behält sich vor, die Preise mit einer Ankündigungsfrist von 30 Tagen 
            zum Ende des Abrechnungszeitraums zu ändern. Preisänderungen gelten nicht für bereits 
            bezahlte Zeiträume.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 6 Nutzungsrechte</h2>
          <p>
            (1) Der Anbieter räumt dem Kunden für die Dauer des Vertrages ein einfaches, nicht 
            übertragbares und nicht unterlizenzierbares Recht ein, die Software bestimmungsgemäß 
            zu nutzen.
          </p>
          <p>
            (2) Die Nutzung ist auf die im jeweiligen Preispaket enthaltene Anzahl von Benutzern, 
            Objekten und Boxen beschränkt.
          </p>
          <p>
            (3) Der Kunde darf die Software nicht:
          </p>
          <ul>
            <li>Kopieren, modifizieren oder dekompilieren</li>
            <li>An Dritte weitergeben oder unterlizenzieren</li>
            <li>Für rechtswidrige Zwecke nutzen</li>
            <li>In einer Weise nutzen, die die Software oder andere Nutzer beeinträchtigt</li>
          </ul>
          <p>
            (4) Der Kunde bleibt Eigentümer aller von ihm in die Software eingegebenen Daten.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 7 Pflichten des Kunden</h2>
          <p>
            (1) Der Kunde ist verpflichtet, seine Zugangsdaten (Benutzername, Passwort) geheim zu 
            halten und vor dem Zugriff durch Dritte zu schützen. Bei Verdacht auf Missbrauch ist 
            der Anbieter unverzüglich zu informieren.
          </p>
          <p>
            (2) Der Kunde ist für alle Aktivitäten verantwortlich, die unter seinem Account 
            erfolgen.
          </p>
          <p>
            (3) Der Kunde verpflichtet sich, die Software nicht missbräuchlich zu nutzen und keine 
            Inhalte einzustellen, die gegen geltendes Recht oder Rechte Dritter verstoßen.
          </p>
          <p>
            (4) Der Kunde stellt sicher, dass er über die erforderlichen Rechte an den von ihm 
            hochgeladenen Inhalten (insbesondere Fotos) verfügt.
          </p>
          <p>
            (5) Der Kunde ist für die Einhaltung der datenschutzrechtlichen Vorgaben bei der 
            Verarbeitung personenbezogener Daten seiner Mitarbeiter und Kunden verantwortlich.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 8 Verfügbarkeit</h2>
          <p>
            (1) Der Anbieter bemüht sich um eine Verfügbarkeit der Software von 99% im 
            Jahresmittel. Hiervon ausgenommen sind Zeiten, in denen die Software aufgrund von 
            technischen oder sonstigen Problemen, die nicht im Einflussbereich des Anbieters 
            liegen (höhere Gewalt, Verschulden Dritter etc.), nicht erreichbar ist.
          </p>
          <p>
            (2) Geplante Wartungsarbeiten werden nach Möglichkeit vorab angekündigt und außerhalb 
            der üblichen Geschäftszeiten durchgeführt.
          </p>
          <p>
            (3) Der Anbieter ist berechtigt, die Software vorübergehend zu sperren, wenn dies aus 
            Sicherheitsgründen erforderlich ist.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 9 Datensicherung</h2>
          <p>
            (1) Der Anbieter führt regelmäßige Backups der Kundendaten durch.
          </p>
          <p>
            (2) Dem Kunden wird empfohlen, wichtige Daten zusätzlich lokal zu sichern, 
            insbesondere durch regelmäßigen Export von Reports.
          </p>
          <p>
            (3) Der Anbieter haftet nicht für Datenverlust, der durch höhere Gewalt, Handlungen 
            des Kunden oder technische Störungen außerhalb des Einflussbereichs des Anbieters 
            verursacht wurde.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 10 Haftung</h2>
          <p>
            (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für 
            Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.
          </p>
          <p>
            (2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher 
            Vertragspflichten (Kardinalpflichten). Die Haftung ist in diesen Fällen auf den 
            vorhersehbaren, vertragstypischen Schaden begrenzt.
          </p>
          <p>
            (3) Die Haftung für mittelbare Schäden, insbesondere entgangenen Gewinn, ist bei 
            leichter Fahrlässigkeit ausgeschlossen.
          </p>
          <p>
            (4) Die Haftungsbeschränkungen gelten nicht, soweit der Anbieter einen Mangel 
            arglistig verschwiegen oder eine Garantie übernommen hat.
          </p>
          <p>
            (5) Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 11 Vertragslaufzeit und Kündigung</h2>
          <p>
            (1) Der Vertrag wird auf unbestimmte Zeit geschlossen und verlängert sich automatisch, 
            sofern er nicht gekündigt wird.
          </p>
          <p>
            (2) <strong>Der Vertrag ist monatlich kündbar zum Monatsende.</strong> Die Kündigung 
            muss in Textform (E-Mail genügt) erfolgen.
          </p>
          <p>
            (3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
          </p>
          <p>
            (4) Ein wichtiger Grund liegt insbesondere vor, wenn:
          </p>
          <ul>
            <li>Der Kunde trotz Mahnung mit der Zahlung von mindestens zwei Monatsbeträgen in Verzug ist</li>
            <li>Der Kunde wiederholt gegen wesentliche Vertragspflichten verstößt</li>
            <li>Der Kunde die Software missbräuchlich nutzt</li>
          </ul>
          <p>
            (5) Nach Beendigung des Vertrages werden die Kundendaten innerhalb von 30 Tagen 
            gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Der Kunde 
            kann vor Vertragsende einen Export seiner Daten anfordern.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 12 Datenschutz</h2>
          <p>
            (1) Der Anbieter verarbeitet personenbezogene Daten des Kunden gemäß der 
            Datenschutzerklärung und den geltenden datenschutzrechtlichen Bestimmungen, 
            insbesondere der DSGVO.
          </p>
          <p>
            (2) Soweit der Kunde personenbezogene Daten seiner Mitarbeiter oder Kunden in die 
            Software eingibt, agiert der Anbieter als Auftragsverarbeiter gemäß Art. 28 DSGVO. 
            Ein entsprechender Auftragsverarbeitungsvertrag wird auf Anfrage bereitgestellt.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 13 Änderungen der AGB</h2>
          <p>
            (1) Der Anbieter ist berechtigt, diese AGB zu ändern, soweit dies zur Anpassung an 
            veränderte rechtliche Rahmenbedingungen, technische Entwicklungen oder neue 
            Leistungen erforderlich ist und der Kunde nicht unangemessen benachteiligt wird.
          </p>
          <p>
            (2) Änderungen werden dem Kunden mindestens 30 Tage vor Inkrafttreten per E-Mail 
            mitgeteilt. Widerspricht der Kunde nicht innerhalb von 30 Tagen nach Zugang der 
            Mitteilung, gelten die geänderten AGB als angenommen.
          </p>
          <p>
            (3) Auf das Widerspruchsrecht und die Folgen des Schweigens wird der Kunde in der 
            Änderungsmitteilung hingewiesen.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 14 Schlussbestimmungen</h2>
          <p>
            (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des 
            UN-Kaufrechts.
          </p>
          <p>
            (2) Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder 
            öffentlich-rechtliches Sondervermögen, ist Gerichtsstand für alle Streitigkeiten 
            aus diesem Vertrag Wedel.
          </p>
          <p>
            (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die 
            Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
          <p>
            (4) Die Vertragssprache ist Deutsch.
          </p>
        </section>

        <section className="legal-section">
          <h2>§ 15 Widerrufsrecht für Verbraucher</h2>
          <p><strong>Widerrufsbelehrung</strong></p>
          <p><strong>Widerrufsrecht</strong></p>
          <p>
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu 
            widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.
          </p>
          <p>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Merlin Jakob Hanika, TrapMap, 
            Egenbüttelweg 40A, 22880 Wedel, E-Mail: info@trap-map.de, Telefon: +49 4103 1870570) 
            mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder 
            E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
          </p>
          <p><strong>Folgen des Widerrufs</strong></p>
          <p>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen 
            erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag 
            zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns 
            eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie 
            bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde 
            ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser 
            Rückzahlung Entgelte berechnet.
          </p>
          <p>
            Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen 
            sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis 
            zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich 
            dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum 
            Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
          </p>
        </section>

        <div className="legal-footer">
          <p>Stand: Dezember 2024</p>
        </div>
      </div>
    </div>
  );
}