/* ============================================================
   TRAPMAP - DATENSCHUTZERKLÄRUNG
   DSGVO-konform mit allen genutzten Diensten
   ============================================================ */

import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./Legal.css";

export default function Datenschutz() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">
          <ArrowLeft size={18} />
          Zurück zur Startseite
        </Link>

        <h1>Datenschutzerklärung</h1>

        {/* ÜBERSICHT */}
        <section className="legal-section">
          <h2>1. Datenschutz auf einen Blick</h2>
          
          <h3>Allgemeine Hinweise</h3>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren 
            personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene 
            Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. 
            Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem 
            Text aufgeführten Datenschutzerklärung.
          </p>

          <h3>Datenerfassung auf dieser Website</h3>
          <p><strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong></p>
          <p>
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen 
            Kontaktdaten können Sie dem Abschnitt „Hinweis zur verantwortlichen Stelle" in dieser 
            Datenschutzerklärung entnehmen.
          </p>

          <p><strong>Wie erfassen wir Ihre Daten?</strong></p>
          <p>
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann 
            es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben oder bei der 
            Registrierung angeben.
          </p>
          <p>
            Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website 
            durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. 
            Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser 
            Daten erfolgt automatisch, sobald Sie diese Website betreten.
          </p>

          <p><strong>Wofür nutzen wir Ihre Daten?</strong></p>
          <p>
            Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu 
            gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden. 
            Im Rahmen unserer Software TrapMap werden Ihre Daten zur Erbringung unserer 
            Dienstleistungen im Bereich Schädlingsmonitoring verarbeitet.
          </p>

          <p><strong>Welche Rechte haben Sie bezüglich Ihrer Daten?</strong></p>
          <p>
            Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und 
            Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein 
            Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine 
            Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung 
            jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten 
            Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. 
            Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
          </p>
          <p>
            Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns 
            wenden.
          </p>
        </section>

        {/* HOSTING */}
        <section className="legal-section">
          <h2>2. Hosting</h2>
          
          <h3>Render</h3>
          <p>
            Wir hosten unsere Website bei Render. Anbieter ist die Render Services, Inc., 
            525 Brannan Street, Suite 300, San Francisco, CA 94107, USA.
          </p>
          <p>
            Wenn Sie unsere Website besuchen, werden Ihre personenbezogenen Daten auf den Servern 
            von Render verarbeitet. Hierbei können auch personenbezogene Daten an den Mutterkonzern 
            von Render in die USA übermittelt werden.
          </p>
          <p>
            Die Verwendung von Render erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir 
            haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer 
            Website. Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die 
            Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO.
          </p>
          <p>
            Die Datenübertragung in die USA wird auf die Standardvertragsklauseln der EU-Kommission 
            gestützt. Details finden Sie hier: 
            <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer" className="legal-link-inline">
              https://render.com/privacy
            </a>
          </p>
        </section>

        {/* ALLGEMEINE HINWEISE */}
        <section className="legal-section">
          <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>
          
          <h3>Datenschutz</h3>
          <p>
            Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir 
            behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen 
            Datenschutzvorschriften sowie dieser Datenschutzerklärung.
          </p>
          <p>
            Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. 
            Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. 
            Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir 
            sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
          </p>
          <p>
            Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei der 
            Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der 
            Daten vor dem Zugriff durch Dritte ist nicht möglich.
          </p>

          <h3>Hinweis zur verantwortlichen Stelle</h3>
          <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
          <p>
            Merlin Jakob Hanika<br />
            TrapMap<br />
            Egenbüttelweg 40A<br />
            22880 Wedel<br />
            Deutschland
          </p>
          <p>
            Telefon: +49 4103 1870570<br />
            E-Mail: info@trap-map.de
          </p>
          <p>
            Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder 
            gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen 
            Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
          </p>

          <h3>Speicherdauer</h3>
          <p>
            Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt 
            wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die 
            Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder 
            eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern 
            wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer 
            personenbezogenen Daten haben (z. B. steuer- oder handelsrechtliche 
            Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung nach Fortfall dieser 
            Gründe.
          </p>

          <h3>Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung</h3>
          <p>
            Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir Ihre 
            personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 
            lit. a DSGVO, sofern besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO verarbeitet 
            werden. Im Falle einer ausdrücklichen Einwilligung in die Übertragung personenbezogener 
            Daten in Drittstaaten erfolgt die Datenverarbeitung außerdem auf Grundlage von Art. 49 
            Abs. 1 lit. a DSGVO. Sofern Sie in die Speicherung von Cookies oder in den Zugriff auf 
            Informationen in Ihr Endgerät (z. B. via Device-Fingerprinting) eingewilligt haben, 
            erfolgt die Datenverarbeitung zusätzlich auf Grundlage von § 25 Abs. 1 TTDSG. Die 
            Einwilligung ist jederzeit widerrufbar.
          </p>

          <h3>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
          <p>
            Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. 
            Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit 
            der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
          </p>

          <h3>Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen</h3>
          <p>
            <strong>
              WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F DSGVO 
              ERFOLGT, HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS IHRER BESONDEREN 
              SITUATION ERGEBEN, GEGEN DIE VERARBEITUNG IHRER PERSONENBEZOGENEN DATEN WIDERSPRUCH 
              EINZULEGEN; DIES GILT AUCH FÜR EIN AUF DIESE BESTIMMUNGEN GESTÜTZTES PROFILING.
            </strong>
          </p>
          <p>
            <strong>
              WERDEN IHRE PERSONENBEZOGENEN DATEN VERARBEITET, UM DIREKTWERBUNG ZU BETREIBEN, SO 
              HABEN SIE DAS RECHT, JEDERZEIT WIDERSPRUCH GEGEN DIE VERARBEITUNG SIE BETREFFENDER 
              PERSONENBEZOGENER DATEN ZUM ZWECKE DERARTIGER WERBUNG EINZULEGEN.
            </strong>
          </p>

          <h3>Beschwerderecht bei der zuständigen Aufsichtsbehörde</h3>
          <p>
            Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei 
            einer Aufsichtsbehörde zu. Das Beschwerderecht besteht unbeschadet anderweitiger 
            verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
          </p>
          <p>
            Die zuständige Aufsichtsbehörde für Schleswig-Holstein ist:
          </p>
          <p>
            Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein (ULD)<br />
            Holstenstraße 98<br />
            24103 Kiel<br />
            Telefon: 0431 988-1200<br />
            E-Mail: mail@datenschutzzentrum.de<br />
            Website: <a href="https://www.datenschutzzentrum.de" target="_blank" rel="noopener noreferrer" className="legal-link-inline">
              https://www.datenschutzzentrum.de
            </a>
          </p>

          <h3>Recht auf Datenübertragbarkeit</h3>
          <p>
            Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung 
            eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem 
            gängigen, maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die direkte 
            Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, 
            soweit es technisch machbar ist.

          </p>

          <h3>Auskunft, Löschung und Berichtigung</h3>
          <p>
            Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf 
            unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft 
            und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung 
            oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene 
            Daten können Sie sich jederzeit an uns wenden.
          </p>

          <h3>Recht auf Einschränkung der Verarbeitung</h3>
          <p>
            Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten 
            zu verlangen. Hierzu können Sie sich jederzeit an uns wenden.
          </p>

          <h3>SSL- bzw. TLS-Verschlüsselung</h3>
          <p>
            Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher 
            Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die Sie an uns als Seitenbetreiber 
            senden, eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie 
            daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt und an 
            dem Schloss-Symbol in Ihrer Browserzeile.
          </p>
          <p>
            Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns 
            übermitteln, nicht von Dritten mitgelesen werden.
          </p>
        </section>

        {/* DATENERFASSUNG AUF DIESER WEBSITE */}
        <section className="legal-section">
          <h2>4. Datenerfassung auf dieser Website</h2>

          <h3>Cookies</h3>
          <p>
            Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Datenpakete 
            und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für 
            die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem 
            Endgerät gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch 
            gelöscht. Permanente Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese 
            selbst löschen oder eine automatische Löschung durch Ihren Webbrowser erfolgt.
          </p>
          <p>
            Cookies können von uns (First-Party-Cookies) oder von Drittunternehmen stammen 
            (sog. Third-Party-Cookies). Third-Party-Cookies ermöglichen die Einbindung bestimmter 
            Dienstleistungen von Drittunternehmen innerhalb von Webseiten.
          </p>
          <p>
            Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs, zur 
            Bereitstellung bestimmter, von Ihnen erwünschter Funktionen oder zur Optimierung der 
            Website erforderlich sind (notwendige Cookies), werden auf Grundlage von Art. 6 Abs. 1 
            lit. f DSGVO gespeichert, sofern keine andere Rechtsgrundlage angegeben wird. Der 
            Websitebetreiber hat ein berechtigtes Interesse an der Speicherung von notwendigen 
            Cookies zur technisch fehlerfreien und optimierten Bereitstellung seiner Dienste.
          </p>
          <p>
            Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert 
            werden und Cookies nur im Einzelfall erlauben, die Annahme von Cookies für bestimmte 
            Fälle oder generell ausschließen sowie das automatische Löschen der Cookies beim 
            Schließen des Browsers aktivieren. Bei der Deaktivierung von Cookies kann die 
            Funktionalität dieser Website eingeschränkt sein.
          </p>

          <h3>Einwilligung mit Usercentrics</h3>
          <p>
            Diese Website nutzt einen eigenen Cookie-Consent-Banner zur Einholung Ihrer Einwilligung 
            zur Speicherung bestimmter Cookies auf Ihrem Endgerät oder zum Einsatz bestimmter 
            Technologien.
          </p>
          <p>
            Wenn Sie unsere Website betreten, werden folgende Cookies gespeichert, sofern Sie 
            eingewilligt haben:
          </p>
          <ul>
            <li><strong>Notwendige Cookies:</strong> Session-Cookies für die Authentifizierung und Funktion der Anwendung</li>
            <li><strong>Präferenz-Cookies:</strong> Speicherung Ihrer bevorzugten Einstellungen (z.B. Sprache, Theme)</li>
          </ul>

          <h3>Kontaktformular</h3>
          <p>
            Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem 
            Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung 
            der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben 
            wir nicht ohne Ihre Einwilligung weiter.
          </p>
          <p>
            Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, 
            sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung 
            vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die 
            Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns 
            gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung (Art. 6 
            Abs. 1 lit. a DSGVO) sofern diese abgefragt wurde.
          </p>
          <p>
            Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur 
            Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die 
            Datenspeicherung entfällt (z. B. nach abgeschlossener Bearbeitung Ihrer Anfrage). 
            Zwingende gesetzliche Bestimmungen – insbesondere Aufbewahrungsfristen – bleiben 
            unberührt.
          </p>

          <h3>Registrierung auf dieser Website</h3>
          <p>
            Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen auf der Seite 
            zu nutzen. Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des 
            jeweiligen Angebotes oder Dienstes, für den Sie sich registriert haben. Die bei der 
            Registrierung abgefragten Pflichtangaben müssen vollständig angegeben werden. 
            Anderenfalls werden wir die Registrierung ablehnen.
          </p>
          <p>
            Für wichtige Änderungen etwa beim Angebotsumfang oder bei technisch notwendigen 
            Änderungen nutzen wir die bei der Registrierung angegebene E-Mail-Adresse, um Sie auf 
            diesem Wege zu informieren.
          </p>
          <p>
            Die Verarbeitung der bei der Registrierung eingegebenen Daten erfolgt zum Zwecke der 
            Durchführung des durch die Registrierung begründeten Nutzungsverhältnisses und ggf. zur 
            Anbahnung weiterer Verträge (Art. 6 Abs. 1 lit. b DSGVO).
          </p>
          <p>
            Die bei der Registrierung erfassten Daten werden von uns gespeichert, solange Sie auf 
            dieser Website registriert sind und werden anschließend gelöscht. Gesetzliche 
            Aufbewahrungsfristen bleiben unberührt.
          </p>
        </section>

        {/* EXTERNE DIENSTE */}
        <section className="legal-section">
          <h2>5. Externe Dienste und Drittanbieter</h2>

          <h3>Supabase (Datenbank)</h3>
          <p>
            Wir nutzen Supabase als Datenbank-Dienst für unsere Anwendung. Anbieter ist Supabase, 
            Inc., 970 Toa Payoh North #07-04, Singapore 318992.
          </p>
          <p>
            Bei der Nutzung von TrapMap werden Ihre Daten auf Servern von Supabase gespeichert. 
            Dies umfasst:
          </p>
          <ul>
            <li>Registrierungsdaten (E-Mail, verschlüsseltes Passwort)</li>
            <li>Nutzerdaten im Rahmen des Schädlingsmonitorings</li>
            <li>Dokumentationen und hochgeladene Bilder</li>
          </ul>
          <p>
            Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          </p>
          <p>
            Weitere Informationen: 
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="legal-link-inline">
              https://supabase.com/privacy
            </a>
          </p>

          <h3>Resend (E-Mail-Dienst)</h3>
          <p>
            Für den Versand von E-Mails (z.B. Registrierungsbestätigung, Passwort-Reset) nutzen wir 
            den Dienst Resend. Anbieter ist Resend, Inc., mit Sitz in den USA.
          </p>
          <p>
            Beim E-Mail-Versand werden Ihre E-Mail-Adresse und der Inhalt der Nachricht an Resend 
            übermittelt. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p>
            Weitere Informationen: 
            <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="legal-link-inline">
              https://resend.com/legal/privacy-policy
            </a>
          </p>

          <h3>MapTiler (Kartendienst)</h3>
          <p>
            Für die Darstellung von Karten nutzen wir MapTiler. Anbieter ist MapTiler AG, 
            Höfnerstrasse 98, 6314 Unterägeri, Schweiz.
          </p>
          <p>
            Bei der Nutzung der Kartenfunktion wird Ihre IP-Adresse an MapTiler übermittelt. 
            Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).
          </p>
          <p>
            Weitere Informationen: 
            <a href="https://www.maptiler.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="legal-link-inline">
              https://www.maptiler.com/privacy-policy/
            </a>
          </p>

          <h3>Mapbox (Kartendienst)</h3>
          <p>
            Alternativ nutzen wir auch Mapbox für Kartenfunktionen. Anbieter ist Mapbox Inc., 
            740 15th Street NW, 5th Floor, Washington, DC 20005, USA.
          </p>
          <p>
            Bei der Nutzung wird Ihre IP-Adresse an Mapbox übermittelt. Die Verarbeitung erfolgt 
            auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
          </p>
          <p>
            Weitere Informationen: 
            <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="legal-link-inline">
              https://www.mapbox.com/legal/privacy
            </a>
          </p>
        </section>

        {/* TRAPMAP SPEZIFISCH */}
        <section className="legal-section">
          <h2>6. Datenverarbeitung in TrapMap</h2>

          <h3>Zweck der Datenverarbeitung</h3>
          <p>
            TrapMap ist eine Software für digitales Schädlingsmonitoring. Im Rahmen der Nutzung 
            werden folgende Daten verarbeitet:
          </p>
          <ul>
            <li><strong>Kontodaten:</strong> E-Mail-Adresse, Name, Firmenname</li>
            <li><strong>Objektdaten:</strong> Adressen und Standorte von überwachten Objekten</li>
            <li><strong>Monitoring-Daten:</strong> Status von Fallen/Boxen, Kontrolldaten, Zeitstempel</li>
            <li><strong>Mediendaten:</strong> Hochgeladene Fotos zur Dokumentation</li>
            <li><strong>Standortdaten:</strong> GPS-Koordinaten (nur bei expliziter Freigabe)</li>
          </ul>

          <h3>GPS-Standortdaten</h3>
          <p>
            TrapMap kann GPS-Standortdaten erfassen, um Boxen auf einer Karte zu positionieren. 
            Diese Funktion wird nur aktiviert, wenn Sie dies explizit erlauben. Sie können die 
            GPS-Funktion jederzeit in Ihrem Browser oder Gerät deaktivieren.
          </p>
          <p>
            Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
          </p>

          <h3>Foto-Dokumentation</h3>
          <p>
            Bei der Nutzung der Foto-Dokumentation werden Bilder auf unseren Servern gespeichert. 
            Die Fotos werden mit Zeitstempel und ggf. Standortdaten verknüpft.
          </p>
          <p>
            Die Verarbeitung erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) und zur 
            Erfüllung gesetzlicher Dokumentationspflichten im Bereich Schädlingsbekämpfung.
          </p>

          <h3>Aufbewahrungsfristen</h3>
          <p>
            Monitoring-Daten werden gemäß den gesetzlichen Anforderungen (HACCP, IFS) für 
            mindestens 3 Jahre aufbewahrt. Sie können die Löschung Ihrer Daten nach Ablauf der 
            gesetzlichen Fristen verlangen.
          </p>

          <h3>Partner-Accounts</h3>
          <p>
            Wenn Ihr Schädlingsbekämpfer Ihnen einen Partner-Account einrichtet, erhalten Sie 
            Lesezugriff auf bestimmte Objekte. Dabei werden Ihre E-Mail-Adresse und die Ihnen 
            zugeordneten Objekte gespeichert.
          </p>
        </section>

        {/* DATENSICHERHEIT */}
        <section className="legal-section">
          <h2>7. Datensicherheit</h2>
          <p>
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten 
            gegen Manipulation, Verlust, Zerstörung oder unbefugten Zugriff zu schützen. Unsere 
            Sicherheitsmaßnahmen werden entsprechend der technologischen Entwicklung fortlaufend 
            verbessert.
          </p>
          <p>
            Zu unseren Maßnahmen gehören:
          </p>
          <ul>
            <li>SSL/TLS-Verschlüsselung aller Datenübertragungen</li>
            <li>Verschlüsselte Speicherung von Passwörtern (bcrypt)</li>
            <li>Regelmäßige Sicherheits-Updates</li>
            <li>Zugriffskontrolle und Berechtigungssystem</li>
          </ul>
        </section>

        <div className="legal-footer">
          <p>Stand: Dezember 2024</p>
        </div>
      </div>
    </div>
  );
}