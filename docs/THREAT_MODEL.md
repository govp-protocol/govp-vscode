# Threat model — GOVP Automatic Workbench 0.4.0

## Activos y fronteras

Los activos son la identidad local, los recibos, su cadena, la política, la cola de publicación, el inventario aprobado y los archivos del proyecto. Las fronteras son VS Code/SecretStorage, el workspace, el proveedor MCP configurado y el publicador de dominio.

## Amenazas tratadas

- **MCP impostor:** una herramienta solo se invoca si pertenece al namespace configurado de forma no ambigua.
- **Bundle cambiado:** inventario y contenidos se vuelven a hashear y deben coincidir con el `artifactSetSha256` aprobado y con las pruebas.
- **TOCTOU y sobrescritura:** preflight completo, confirmación humana ligada a la huella, creación atómica sin overwrite, nueva comprobación de symlinks y rollback de lo creado.
- **Ejecución encubierta:** el bundle completo se instala bajo `.govp/implementations/<huella>/`; no sobrescribe el proyecto, no registra tareas ni ejecuta scripts automáticamente.
- **Path traversal/colisiones:** rutas absolutas, vacías, `..`, variantes de separador, duplicados NFC o por mayúsculas se rechazan.
- **Recibo inventado o editado:** el evento queda dentro del payload firmado, el subject externo queda ligado por SHA-256 y se verifica antes y después de escribir.
- **Borrado de un eslabón:** cada recibo referencia ID y digest del anterior; el gate local informa referencias ausentes o distintas.
- **Exfiltración de clave:** la clave local solo se conserva en SecretStorage; la clave de dominio nunca entra en la extensión.
- **Fuga por logs:** la línea de comando puede formar parte del recibo local, pero no se duplica en el canal de salida de la extensión.
- **Retención no deseada:** la identidad local puede eliminarse de SecretStorage solo cuando no quedan recibos ni cola, evitando romper una cadena existente por accidente.
- **Falso verde:** L0, L1 y L2 se presentan por separado; no se transforma una integridad local en confianza vigente.
- **DoS por entradas:** respuestas MCP, políticas, mapeos, número y tamaño de artefactos están acotados.

## Riesgos residuales

Un host o una instalación de VS Code comprometidos pueden observar memoria y acciones del usuario. Una persona puede declarar manualmente un evento falso; el origen queda marcado `manual` y no se presenta como observación de sistema. La publicación y confianza vigentes dependen de servicios externos y se mantienen pendientes si no se comprueban.
