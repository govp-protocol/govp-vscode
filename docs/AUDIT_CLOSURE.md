# Cierre de los 15 puntos de robustez

1. **Paquete mínimo:** esbuild genera un único fichero sin sourcemap ni `sourcesContent`.
2. **Sin Preview implícito:** endpoint MCP, canal y dominio tienen defaults vacíos.
3. **URLs estrictas:** HTTPS, sin credenciales; MCP termina exactamente en `/mcp` y el dominio configurado es un origen.
4. **Proveedor ligado:** solo se invoca el namespace exacto configurado (`mcp_govp_implemen` por defecto); ambigüedad o ausencia falla cerrada.
5. **Límites remotos:** timeout de 30 segundos y respuesta máxima de 1 MiB.
6. **Contrato runtime:** `approvalsAreHumanOnly` debe ser `true` y `productionMutationAllowed` debe ser `false`.
7. **Pruebas ligadas:** el digest de pruebas debe coincidir con el `artifactSetSha256` aprobado.
8. **Paridad byte-exacta:** orden UTF-8, JSON estable, vector compartido y referencia Python.
9. **Inventario acotado:** formato exacto, 1–500 artefactos, 2 MiB por fichero y 32 MiB total.
10. **Contenido ligado:** ruta, tipo, tamaño y SHA-256 de cada respuesta deben coincidir con el inventario.
11. **Rutas no ambiguas:** se rechazan absolutas, traversal, separadores dobles, duplicados NFC y colisiones por mayúsculas.
12. **Deny-list ejecutable:** hooks, configuración VS Code, workflows, devcontainers, `.envrc`, `package.json` y `Makefile` no se aplican.
13. **Preflight y TOCTOU:** se revisa el bundle completo, se presenta la huella aprobada, se requiere confirmación y se vuelven a comprobar symlinks.
14. **Escritura recuperable:** solo creación atómica sin overwrite; un fallo revierte los ficheros creados por esa operación.
15. **Mapeo no ejecutable:** esquema exacto, allowlist de tipos, destino único, previsualización y confirmación antes del MCP.

Controles adicionales de la capa local: identidad en SecretStorage, evento dentro de la firma, subject derivado y ligado, veredicto derivado no sustituible, verificación antes/después de persistir, cadena por digest y Problems para recibos ausentes o rotos.
