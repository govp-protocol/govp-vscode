# Datenschutzhinweis — GOVP Automatic Workbench

Gültig ab: 15. August 2026  
Status: am 15. August 2026 von einem autorisierten Brilyetz-Administrator für die Marketplace-Veröffentlichung von Version 0.4.0 genehmigt
Sprachen: [English](PRIVACY.md) · [Español](PRIVACY.es.md)

## Verantwortlicher und Kontakt

BRILYETZ SOCIEDAD LIMITADA (Brilyetz, S.L.), tätig unter der Marke Gemacode, NIF B22551485, C/ Autonomía 13, Principal Izquierda, 48012 Bilbao, Bizkaia, Spanien, ist für personenbezogene Daten verantwortlich, die über den eigenen Support oder optionale gehostete Dienste eingehen. Kontakt: research@gemacode.org.

Die lokale Erweiterung kann ohne Konto und ohne Gemacode-Dienst verwendet werden. Brilyetz erhält nicht allein durch Installation oder lokale Nutzung Daten.

## Lokale Verarbeitung

Wenn aktiviert, verarbeitet die Erweiterung innerhalb von VS Code Informationen, um Nachweise zu erstellen und zu prüfen. Dazu können gehören:

- Name des Arbeitsbereichs und aus seiner URI abgeleitete Kennungen;
- Aufgabennamen und -quelle, Terminalname und die von VS Code gemeldete Befehlszeile;
- Ausführungszeit, Exit-Status und Vertrauensmetadaten des Befehls;
- Belegkennungen, Hashes, Signaturen und öffentliche Signaturschlüssel;
- konfigurierte Projektdomain und Metadaten der Veröffentlichungswarteschlange; sowie
- vom Benutzer für eine lokale Prüfung ausgewählte Dateien.

Befehlszeilen und Arbeitsbereichsinhalte können personenbezogene Daten oder Geheimnisse enthalten. Zugangsdaten und unnötige personenbezogene Daten sollten nicht in Befehlen stehen, die als Nachweis erfasst werden. Die Erweiterung kopiert den Befehlstext nicht in ihr Ausgabprotokoll.

Belege, Richtlinie und Warteschlange liegen unter `.govp/`. Der lokale private Ed25519-Schlüssel wird über VS Code `SecretStorage`, nicht im Projekt gespeichert. Die Erweiterung enthält keine Telemetrie oder Werbekennungen.

## Netzwerk und Dritte

Alle Remote-Einstellungen sind standardmäßig leer. Der lokale Ablauf benötigt kein Netzwerk.

Bei Konfiguration eines MCP-Endpunkts verbindet sich VS Code mit diesem und kann OAuth-Erkennung und -Autorisierung durchführen. Die Erweiterung ruft nur an den konfigurierten Provider-Namespace gebundene Werkzeuge auf. VS Code, MCP-Betreiber, Identitätsanbieter und Netzbetreiber können Verbindungs-, Konto- und Anfragedaten nach ihren eigenen Hinweisen verarbeiten. Die Erweiterung liest oder speichert das OAuth-Token nicht.

Eine konfigurierte Partner-URL wird extern geöffnet; der Betreiber erhält die üblichen Web-Anfragedaten. Diese Erweiterung überträgt die Veröffentlichungswarteschlange nicht. Ein separat betriebener Publisher kann sie nach eigener Konfiguration und eigenem Datenschutzhinweis verarbeiten.

Microsoft verarbeitet Marketplace-Installations- und Diagnosedaten eigenständig nach den eigenen Bedingungen und Datenschutzhinweisen.

## Zwecke, Aufbewahrung und Rechte

Brilyetz verarbeitet Supportkommunikation zur Bearbeitung von Anfragen und zum Schutz des Dienstes auf Grundlage der angeforderten Leistung und berechtigter Interessen an Support und Sicherheit. Optionale gehostete Dienste müssen Zwecke, Rechtsgrundlagen, Empfänger, Übermittlungen und Aufbewahrung am Nutzungsort gesondert ausweisen. Eine Einwilligung wird nur verlangt, wenn sie die einschlägige Rechtsgrundlage ist.

Lokale Dateien bleiben bestehen, bis sie der Benutzer löscht. VS Code kontrolliert `SecretStorage`; die lokale Identität kann mit dem entsprechenden Befehl entfernt werden, nachdem Belege und Warteschlange archiviert oder gelöscht wurden. Im lokalen VS-Code-Arbeitsbereichsstatus verbleibt eine boolesche Sperrmarkierung, die eine unbemerkte Neuerzeugung verhindert; **Dieses Projekt vorbereiten** entfernt sie. Supportunterlagen werden nur so lange aufbewahrt, wie es für Bearbeitung, gesetzliche Pflichten und Rechtsverteidigung erforderlich ist.

Soweit Brilyetz Verantwortlicher ist, können Betroffene je nach Anwendbarkeit Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit oder Widerspruch über research@gemacode.org verlangen. Beschwerden sind bei der spanischen Datenschutzbehörde oder der zuständigen Aufsichtsbehörde möglich.

Wesentliche Änderungen werden im Repository und in den Versionshinweisen dokumentiert. Remote-Erhebung oder Telemetrie erfordern vor Veröffentlichung eine neue Datenflussprüfung und eine Aktualisierung dieses Hinweises.
