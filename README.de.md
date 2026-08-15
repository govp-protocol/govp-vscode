# GOVP Automatic Workbench

[English](README.md) · [Español](README.es.md)

Erstellt und prüft Nachweise abgeschlossener Arbeit in Visual Studio Code. Die lokale Ebene funktioniert ohne Konto, Netzwerk oder MCP; die Remote-Integration ist optional und enthält keinen voreingestellten Endpunkt.

## Erste Minute

1. Einen vertrauenswürdigen lokalen Ordner öffnen.
2. **GOVP → Nachweise** öffnen und **Dieses Projekt vorbereiten** wählen.
3. Eine reale Aufgabe wie `npm test` oder `npm run build` ausführen oder **GOVP: Abgeschlossene Arbeit erfassen** verwenden.
4. Der signierte Beleg liegt in `.govp/receipts/`. Mit **GOVP: Lokalen Nachweis prüfen** lässt er sich erneut prüfen.

Die lokale Ed25519-Identität entsteht auf dem Gerät. Ihr privater Schlüssel bleibt in VS Code `SecretStorage` und wird nie in das Projekt geschrieben. Jeder Beleg wird vor und nach dem Speichern geprüft.

## Bedeutung eines Ergebnisses

- `Integrität bestätigt (L1 ausstehend)`: Lokale Signatur, Hash und Inhalt stimmen überein; die Domainzuordnung ist noch nicht veröffentlicht.
- `evidence_authentic`: L0 und L1 sind bestätigt; die aktuelle L2-Vertrauensbewertung steht aus.
- `currently_trusted`: Alle drei Ebenen sind für Kontext und Prüfzeitpunkt bestätigt.
- `Nicht integer`: Eine kryptografische oder inhaltliche Prüfung ist fehlgeschlagen.

Die Erweiterung macht daraus nie eine pauschale Aussage „GOVP gültig“. Das Ergebnis ist technischer Nachweis, keine rechtliche Zertifizierung und kein Beweis für die Wahrheit eines erklärten Ereignisses.

## Domain und Veröffentlichungswarteschlange

`govp.domain` auf einen eigenen HTTPS-Ursprung wie `https://example.com` setzen oder im `package.json` des Projekts eine HTTPS-`homepage` angeben. Jeder neue Beleg erhält unter `.govp/publication-queue/` einen Eintrag mit Domain, kanonischer Referenz und Prüfsumme.

Die Erweiterung veröffentlicht diese Warteschlange nicht und erhält niemals den privaten Domain-Schlüssel. Ein separat autorisierter Publisher kann sie verarbeiten. Ohne Domain bleibt der lokale Nachweis nutzbar, ist aber noch keiner eigenen Domain zugeordnet.

## Optionales MCP

`govp.mcpEndpoint` auf einen HTTPS-Endpunkt setzen, der exakt mit `/mcp` endet. Der Anbieter muss Werkzeuge im Namespace `govp.mcpProviderNamespace` veröffentlichen; gleichnamige Werkzeuge anderer Anbieter werden abgelehnt.

VS Code führt bei Bedarf OAuth-Erkennung und -Autorisierung durch. Die Erweiterung liest oder speichert das Token nicht. Bundles werden in zwei Phasen integriert: Das vollständige Inventar wird gegen die freigegebene Prüfsumme geprüft, als Vorschau gezeigt und menschlich bestätigt. Danach entstehen Dateien nur in einem isolierten, prüfsummengebundenen Verzeichnis. Vorhandene Dateien werden nicht überschrieben, Symlinks nicht verfolgt, Aufgaben nicht registriert und Skripte nicht automatisch ausgeführt.

## Bewusste Grenzen

- VS Code stellt kein globales Ereignis für Tests anderer Erweiterungen bereit. Erfasst werden abgeschlossene Aufgaben und von der Shell-Integration gemeldete Befehle mit Herkunft und Vertrauensniveau, ohne sie zu L1 hochzustufen.
- L1 und L2 benötigen einen Domain-Publisher/-Prüfer und werden lokal nie abgeleitet.
- MCP ersetzt keine menschliche Freigabe und autorisiert keine Produktionsänderung.
- Befehlszeilen können sensible Inhalte enthalten. `govp.observeLocalExecution` deaktivieren, wenn automatische Nachweise ungeeignet sind.

## Vertrauen, Datenschutz und Support

Die Erweiterung enthält keine Telemetrie und kein voreingestelltes Remote-Ziel. Vor dem Einsatz bitte [Datenschutzhinweis](PRIVACY.de.md), [Bedingungen](TERMS.de.md), [Sicherheitsrichtlinie](SECURITY.md), [Supportzyklus](SUPPORT.md), [Apache-2.0-Lizenz](LICENSE) und [Dritthinweise](THIRD_PARTY_NOTICES.md) lesen.

Das öffentliche Repository enthält Quellcode, Schemata, Konformitätsvektoren, SBOM, Bedrohungsmodell und Freigabekontrollen. Offizielle Paketidentität: `gemacode.govp-partner-workbench`.
