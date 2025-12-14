/* ============================================================
   TRAPMAP - IMPRESSUM
   Rechtlich vollständig gemäß § 5 TMG
   ============================================================ */

import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import "./Legal.css";

export default function Impressum() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">
          <ArrowLeft size={18} />
          Zurück zur Startseite
        </Link>

        <h1>Impressum</h1>
        
        <section className="legal-section">
          <h2>Angaben gemäß § 5 TMG</h2>
          <div className="legal-card">
            <p>
              <strong>Merlin Jakob Hanika</strong><br />
              TrapMap – Digitales Schädlingsmonitoring<br />
              Einzelunternehmen
            </p>
            <p className="legal-address">
              <MapPin size={16} />
              Egenbüttelweg 40A<br />
              22880 Wedel<br />
              Deutschland
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>Kontakt</h2>
          <div className="legal-card">
            <p>
              <a href="tel:+4941031870570" className="legal-link">
                <Phone size={16} />
                +49 4103 1870570
              </a>
            </p>
            <p>
              <a href="mailto:info@trap-map.de" className="legal-link">
                <Mail size={16} />
                info@trap-map.de
              </a>
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
            <strong>DE359291989</strong>
          </p>
        </section>

        <section className="legal-section">
          <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p>
            Merlin Jakob Hanika<br />
            Egenbüttelweg 40A<br />
            22880 Wedel
          </p>
        </section>

        <section className="legal-section">
          <h2>EU-Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="legal-link-inline">
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p>
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </section>

        <section className="legal-section">
          <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section className="legal-section">
          <h2>Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten 
            nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
            Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde 
            Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige 
            Tätigkeit hinweisen.
          </p>
          <p>
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den 
            allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch 
            erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei 
            Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend 
            entfernen.
          </p>
        </section>

        <section className="legal-section">
          <h2>Haftung für Links</h2>
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen 
            Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. 
            Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der 
            Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf 
            mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der 
            Verlinkung nicht erkennbar.
          </p>
          <p>
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete 
            Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von 
            Rechtsverletzungen werden wir derartige Links umgehend entfernen.
          </p>
        </section>

        <section className="legal-section">
          <h2>Urheberrecht</h2>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
            dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
            der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
            Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind 
            nur für den privaten, nicht kommerziellen Gebrauch gestattet.
          </p>
          <p>
            Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die 
            Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche 
            gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, 
            bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen 
            werden wir derartige Inhalte umgehend entfernen.
          </p>
        </section>

        <div className="legal-footer">
          <p>Stand: Dezember 2024</p>
        </div>
      </div>
    </div>
  );
}