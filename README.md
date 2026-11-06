# Katers Futterrechner

Installierbare PWA zum Zusammenstellen einer Tagesration innerhalb eines Kalorienbudgets (standardmäßig 300 kcal). Die App läuft ohne Backend und speichert Futtermittel, Kategorien und Ration in **IndexedDB**, der lokalen Browser-Datenbank.

## Funktionen

- Futtermittel über eine Eingabemaske anlegen, bearbeiten und löschen.
- Frei erweiterbare Kategorien, vorbelegt mit Nassfutter, Trockenfutter, Snacks und Schleckpaste. Verwendete Kategorien und Futtermittel können erst nach dem Entfernen ihrer Verweise gelöscht werden.
- Kalorien je 100 g oder je Stück unabhängig von der Kategorie erfassen.
- Mehrere Futtersorten pro Tagesration; genau eine Position optional automatisch aus dem Restbudget berechnen. Automatische Mengen werden auf 0,1 g beziehungsweise ganze Stücke abgerundet.
- Lokale Datenspeicherung, JSON-Sicherung und -Import, Kopieren der Ration.
- Übernahme alter JSON-Backups und vorhandener Prototypdaten aus localStorage, sofern der Prototyp unter derselben Origin geöffnet wurde.
- Offline-Nutzung nach dem ersten erfolgreichen Online-Aufruf mit abgeschlossenem Service-Worker-Setup.

Die vorbelegten Futtermittel verwenden die übergebenen Werte: Trockenfutter Huhn 393,3 und Fisch 402 kcal/100 g; Ente pur 120,21, Huhn mit Kaninchen 115,79, Huhn pur 115,79, Rind pur 159,91 und Wildschwein pur 125,30 kcal/100 g. Schleckpaste ist mit 49 kcal/100 g eingetragen, Dreamies vorläufig mit 2 kcal/Stück.

Eine neue Tagesration enthält separate Mengenfelder für Nassfutter, Trockenfutter, Dreamies und Schleckpaste (anfangs 0 g). Bei vorhandenen Browserdaten werden die neuen Futtermittel einmalig ergänzt; bestehende Einträge und Rationen bleiben erhalten. Vorhandene gleichnamige Futtermittel derselben Kategorie und Einheit werden nicht überschrieben. Neue Futtermittel lassen sich über „Futter hinzufügen“ in die bestehende Ration aufnehmen.

## Lokal starten

Im Projektverzeichnis `npm start` ausführen (Python 3 erforderlich) und `http://localhost:8080` öffnen. Ein Build und npm-Abhängigkeiten sind nicht erforderlich. Direktes Öffnen von `index.html` als lokale Datei unterstützt die PWA nicht.

## Auf einem Webserver bereitstellen

`index.html`, `styles.css`, `app.js`, `data.js`, `texts.js`, `presentation.js`, `updates.js`, `version.js`, `version.json`, `calculation.js`, `storage.js`, `manifest.webmanifest`, `sw.js`, `og-image.jpg` und den Ordner `icons/` zusammen auf einen statischen **HTTPS-Webserver** hochladen. Unterverzeichnisse werden unterstützt. PHP und eine Server-Datenbank sind nicht nötig. HTTPS ist für Service Worker und Installation erforderlich; localhost ist für die Entwicklung ausgenommen.

Auf dem iPhone in Safari „Teilen“ → „Zum Home-Bildschirm“ wählen. Andere unterstützte Browser bieten eine Installation über ihr Menü oder die eingeblendete Schaltfläche an. Die tatsächliche iOS-Installation wurde noch nicht auf einem iPhone geprüft.

Die Daten sind an Browser und Origin (Protokoll, Host und Port) gebunden. Ein Serverwechsel übernimmt sie nicht automatisch. Dafür auf dem alten Gerät exportieren und am neuen Standort importieren. Beim Import werden die aktuellen Daten nach Bestätigung ersetzt. Browserdaten können gelöscht werden; regelmäßig JSON-Sicherungen erstellen.

### Neue Versionen erkennen und veröffentlichen

Der Ablauf folgt Threadline: `version.js` enthält den lokal geladenen App- und Cache-Stand; `version.json` liefert die veröffentlichten Versionsdaten. Die App prüft beim Start, bei Rückkehr in den Vordergrund beziehungsweise Fokus und zusätzlich alle drei Minuten im sichtbaren Fenster. Automatische Fokusprüfungen haben mindestens drei Minuten Abstand; eine wiederhergestellte Online-Verbindung löst ebenfalls eine Prüfung aus. „Nach Updates suchen“ im Fußbereich prüft jederzeit manuell.

Eine neue Version erscheint als Hinweis mit „Jetzt aktualisieren“. Vor dem Aktivieren und dem einmaligen Neuladen wird die Ration in IndexedDB gespeichert. Auch bei einer Aktivierung durch ein anderes App-Fenster speichert die Seite vor dem Neuladen. Die erste Installation lädt die Seite nicht unnötig neu. Anders als Threadlines unmittelbare Aktivierung wartet der Futterrechner auf die Update-Schaltfläche, damit eine laufende Eingabe nicht durch ein Hintergrundupdate unterbrochen wird.

`version.json` wird direkt aus dem Netzwerk ohne Cache-Fallback geladen. Offline bleibt die App nutzbar; eine manuelle Versionsprüfung meldet dann, dass sie nicht möglich ist. Neue App-Dateien werden vollständig heruntergeladen, bevor die Version bereitsteht. Schlägt die Installation fehl, bleibt die bisherige Version aktiv.

Für jede Veröffentlichung:

1. `appVersion` und `cacheVersion` in `version.json` erhöhen und `label` anpassen.
2. `npm run version:sync` ausführen, um `version.js` zu erzeugen.
3. `npm test` ausführen. Der Versionstest prüft die Übereinstimmung beider Dateien.
4. Alle App-Dateien einschließlich beider Versionsdateien gemeinsam veröffentlichen, möglichst atomar. Kein zusätzliches manuelles Ändern des Cache-Namens in `sw.js` nötig.

Der Versionsstand ist unabhängig von der Version des Datenformats in IndexedDB. Updates löschen keine Futterdaten. Geprüft in Chromium mit zwei simulierten Veröffentlichungen: Erkennung, Aktivierung, Erhalt der Ration, Bereinigung alter App-Caches, fehlgeschlagener Download und Offline-Neustart.

## Entwicklung und Prüfung

Die Rationsansicht orientiert sich an der übergebenen Bildvorlage: Katzenkopf im Kopfbereich, Tagesziel mit Plus/Minus (10 kcal pro Schritt), farbiger Kalorienbalken mit Kategorieanteilen, Radioauswahl der automatisch berechneten Position und getrennte Futterbereiche. Mehrere Positionen derselben Kategorie bleiben möglich. Snacks haben Stückzähler; Schleckpaste bleibt ein eigener Bereich. In der Tagesration werden nur Futtersorte und Menge gewählt; der hinterlegte Kalorienwert erscheint als Information. Kalorienwerte werden ausschließlich in der Futterverwaltung bearbeitet. Futterverwaltung, Kategorien und Datensicherung sind darunter aufklappbar. „Zurücksetzen“ leert nach Bestätigung die Tagesration, erhält aber die Futtermittel.

### Open Graph und Favicon

Wie in [Threadline](https://github.com/marsrakete/threadline) stehen Open-Graph- und Twitter-Metadaten statisch im HTML, damit Vorschau-Crawler kein JavaScript ausführen müssen. Als öffentliche Adresse ist `https://marsrakete.github.io/KatersFutterrechner/` eingetragen. Bei einem Umzug die absoluten URLs in `og:url`, `og:image` und `twitter:image` in `index.html` anpassen.

Die bearbeitbare Vorlage liegt unter `icons/katers-futterrechner-og.svg`. `og-image.config.json` legt Rendergröße und Ausgaben fest. Nach `npm ci` erzeugt `npm run build:og-image` daraus `icons/katers-futterrechner-og.png` (1200 × 630, für die Metadaten) und `og-image.jpg`. Der SVG-zu-PNG/JPG-Build mit Resvg und Sharp ist aus Threadline übernommen und für ES-Module angepasst. Die erzeugten Bilder gehören ins Repository; für den Betrieb sind weder npm noch ein Build auf dem Webserver nötig.

Das Favicon wird wie bei Threadline als `icons/icon.svg` mit `rel="icon"` eingebunden, hier mit dem Katzenmotiv des Futterrechners. Die vorhandenen PNG-Icons für Apple Touch und die PWA bleiben erhalten. Neue Bilder und das Favicon werden ebenfalls offline gespeichert. Änderungen an Metadaten werden nach Veröffentlichung durch die jeweilige Plattform neu eingelesen; bereits gespeicherte Vorschauen können dort noch zwischengespeichert sein.

Struktur, Styles, Berechnung, Datenbankzugriff, Beispieldaten und dynamische Texte liegen in separaten Dateien. Die Datenbank enthält einen gemeinsam gespeicherten Zustandsdatensatz, damit Ration, Futtermittel und Kategorien atomar geschrieben werden.

`npm test` prüft Berechnung, Rundung, Überschreitungen, freie Kategorien, Backup-Validierung und Migration. Zusätzlich in Chromium geprüft: Futteranlage, Kategorieanlage, Eingabefokus bei Mengenänderungen, Wechsel der automatischen Position, Persistenz nach Neuladen, Offline-Neuladen, alte Browserdaten sowie mobile und Desktop-Breiten. Eine Prüfung auf echter iPhone-Hardware steht aus.

## Projektgrundlagen

- [Anforderungen und erste Umsetzungsidee](docs/anforderungen.md)
- [Unveränderter erster HTML-Entwurf](prototype/katers-futterrechner.html)
