# Anforderungen und erste Umsetzungsidee

## Ausgangspunkt

Der Kater ist auf Diät und darf maximal 300 kcal pro Tag erhalten. Unterschiedliche Nassfuttersorten, Trockenfutter und Snacks haben unterschiedliche Kalorienwerte. Eine Eingabemaske soll dabei helfen, daraus eine passende Tagesration zusammenzustellen.

Quelle: die im Projektchat übermittelte Anforderung und der angehängte erste Entwurf `katers-futterrechner.html`. Der zuvor verlinkte geteilte Chat war inhaltlich nicht abrufbar.

## Fachliche Anforderungen

- Standardbudget: maximal 300 kcal pro Tag.
- Mehrere Futtersorten und Kategorien innerhalb einer Ration kombinieren.
- Kalorienwerte je Futtersorte hinterlegen: kcal je 100 g für Nass- und Trockenfutter, kcal je Stück für Snacks.
- Mengen eingeben und die Kalorien je Position, die Gesamtkalorien sowie das verbleibende Budget unmittelbar anzeigen.
- Bei einer Mengenänderung andere Mengen automatisch anpassen, sodass die Ration möglichst auf das Tagesbudget kommt, ohne es zu überschreiten.
- Eine Überschreitung durch manuell festgelegte Mengen sichtbar anzeigen.

Beispiel: 85 g Ente mit 120 kcal je 100 g ergeben 102 kcal. Vom Tagesbudget bleiben 198 kcal für Trockenfutter und Snacks übrig. Deren Mengen hängen von ihren jeweiligen Kalorienwerten und der gewählten Aufteilung ab.

## Erste Umsetzungsidee im Prototyp

Der Entwurf ist eine einzelne deutschsprachige HTML-Datei mit eingebettetem CSS und JavaScript. Er lässt sich direkt im Browser öffnen und benötigt keinen Server.

- Einstellbares Tagesziel, vorbelegt mit 300 kcal.
- Verwaltung von Futtersorten mit Bezeichnung, Kategorie und Kalorienwert; Anlegen, Bearbeiten und Löschen.
- Tagesration mit beliebig ergänzbaren und entfernbaren Positionen.
- Genau eine wählbare Position wird automatisch aus dem Restbudget berechnet. Alle übrigen Mengen bleiben manuell einstellbar. Wahlweise sind alle Mengen manuell.
- Die automatische Menge ist gegen direkte Eingabe gesperrt. Wer beispielsweise Trockenfutter manuell ändern möchte, wählt zuvor eine andere Position für die automatische Berechnung.
- Zusammenfassung mit Gesamtkalorien, Rest beziehungsweise Überschreitung sowie einem nach Futterkategorien aufgeteilten Balken.
- Lokale Speicherung im Browser, Kopieren der Ration und JSON-Export beziehungsweise -Import zur Datensicherung.
- Tagesration leeren, ohne gespeicherte Futtersorten zu löschen.
- An Mobilgeräte angepasste Darstellung.

Die Beispieldaten sind Ente (120 kcal/100 g, 85 g), Trockenfutter (380 kcal/100 g) und Snacks (4 kcal/Stück, 2 Stück). Trockenfutter wird standardmäßig automatisch berechnet. Das ergibt 50 g Trockenfutter und insgesamt 300 kcal. Diese Werte sind Beispieldaten, keine geprüften Produktangaben.

## Berechnungsregeln des Entwurfs

- Futterkalorien: Menge in g × kcal je 100 g ÷ 100.
- Snackkalorien: Stückzahl × kcal je Stück.
- Automatische Menge: verbleibendes Budget nach allen manuellen Positionen ÷ kcal je g beziehungsweise Stück.
- Automatische Gramm-Mengen werden auf 0,1 g abgerundet, Snackmengen auf ganze Stücke. Ein kleiner Rest ist deshalb möglich.
- Übersteigen die manuellen Positionen das Budget bereits, wird die automatische Menge auf null gesetzt und die Überschreitung angezeigt.

## Noch festzulegende Erweiterungen

Die ursprüngliche Anforderung lässt offen, wie mehrere andere Mengen gleichzeitig angepasst werden sollen. Der erste Entwurf löst dies mit genau einer automatischen Position. Eine gleichzeitige Anpassung von Trockenfutter und Snacks benötigt zusätzliche Regeln, etwa feste Snackzahlen, gesperrte Mengen oder vorgegebene Kalorienanteile.

## Hinweise für die Weiterentwicklung

### Erweiterung: PWA und Browser-Datenbank

Die aktuelle Anwendung im Projektstamm setzt die nachfolgende Anforderung um:

- Installierbare PWA mit Manifest, App-Icons und Service Worker für die Offline-Nutzung.
- Speicherung von Kategorien, Futtermitteln und Tagesration in IndexedDB statt localStorage.
- Eingabemaske für neue Futtermittel mit frei wählbarer Kategorie.
- Vier Startkategorien: Nassfutter, Trockenfutter, Snacks und Schleckpaste. Weitere Kategorien können ergänzt werden.
- Kategorie und Einheit sind unabhängig: Ein Futtermittel kann Kalorien je 100 g oder je Stück erhalten.
- Die ursprüngliche Regel mit einer automatisch berechneten Position bleibt bestehen.

Die folgenden Übergabehinweise beschreiben den ursprünglichen Einzeldatei-Prototyp. Für Installation und Bereitstellung der neuen PWA gilt die aktuelle README; dafür müssen mehrere Dateien zusammen über HTTPS bereitgestellt werden.

### Ergänzende Übergabe aus dem ursprünglichen Chat

- Beispieldaten für Ente, Trockenfutter und Snacks sind bereits eingetragen. Futtersorten lassen sich hinzufügen, bearbeiten und löschen. Auch mehrere Nassfuttersorten sind innerhalb einer Tagesration möglich.
- Daten bleiben lokal im jeweiligen Browser gespeichert. Ein JSON-Export dient als Sicherung und kann auf einem anderen Gerät importiert werden. Eine automatische Synchronisierung zwischen Geräten ist damit nicht verbunden.
- Auf dem iPhone kann das Öffnen einer lokalen HTML-Datei je nach verwendeter App eingeschränkt sein. Die Nutzbarkeit muss auf dem gewünschten Gerät geprüft werden.
- Der aktuelle Prototyp kann auf einem eigenen Webserver betrieben werden: Dafür genügt das Hochladen der einzelnen HTML-Datei. PHP und eine Datenbank sind nicht erforderlich. Die Daten bleiben auch dabei im Browser gespeichert.
- Als nächster Schritt sollen zunächst Mengenberechnung und Futterverwaltung ausprobiert werden. Anschließend wird die Bedienung anhand der Erfahrungen gezielt verbessert.

### Technische Weiterentwicklung

Der Originalentwurf liegt unverändert unter `prototype/katers-futterrechner.html`. Für die weitere Umsetzung gelten die Projektregeln aus `AGENTS.md`: Struktur, Styles, Berechnungslogik, Daten und sichtbare Texte in geeignete separate Dateien aufteilen.

Beim Prüfen der Datei fällt auf, dass jede Mengeneingabe die gesamte Rationsansicht neu aufbaut; dabei kann der Eingabefokus verloren gehen. Vor einer produktiven Nutzung sollten außerdem gespeicherte und importierte Daten vollständig validiert werden, einschließlich positiver Tagesziele, eindeutiger IDs und gültiger Verweise auf Futtersorten.
