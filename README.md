# GOVP Automatic Workbench

GOVP Automatic Workbench crea y comprueba evidencia del trabajo real dentro de VS Code. La capa local funciona sin cuenta, red ni MCP; la conexión remota es opcional.

## Primer minuto

1. Abre una carpeta confiable.
2. Abre **GOVP → Evidencia** y pulsa **Preparar este proyecto**.
3. Ejecuta una tarea real, por ejemplo `npm test` o `npm run build`, o usa **GOVP: Registrar trabajo terminado**.
4. El recibo firmado aparece en `.govp/receipts/`. Usa **GOVP: Verificar evidencia local** para volver a comprobarlo.

La identidad Ed25519 se genera en el equipo y su clave privada se guarda en `SecretStorage` de VS Code; nunca se escribe en el proyecto. La extensión comprueba el recibo antes y después de guardarlo.

## Qué significa el resultado

- `Íntegro (pendiente de L1)`: firma, hash y contenido coinciden localmente. Aún no hay atribución publicada por el dominio.
- `evidence_authentic`: L0 y la publicación L1 se han confirmado; falta evaluar confianza vigente L2.
- `currently_trusted`: las tres capas se han confirmado en el contexto y momento evaluados.
- `No íntegro`: alguna comprobación criptográfica o de contenido ha fallado.

Nunca se muestra el genérico “GOVP válido”. Las advertencias del verificador se conservan y se presentan.

## Dominio y publicación

Configura `govp.domain` con un origen como `https://example.com`, o declara un `homepage` HTTPS en `package.json`. Cada recibo nuevo se añade a `.govp/publication-queue/` con su dominio, canonical y huella. La extensión no publica y nunca recibe la clave del dominio: un publicador autorizado consume esa cola.

Si no hay dominio, la evidencia local sigue siendo útil y se muestra: **“tu evidencia es íntegra pero todavía no es atribuible a tu dominio”**.

## MCP opcional

Configura `govp.mcpEndpoint` con un endpoint HTTPS terminado exactamente en `/mcp`. El proveedor remoto debe publicar herramientas ligadas al namespace de `govp.mcpProviderNamespace`; la extensión no acepta herramientas homónimas de otro proveedor.

El alta del servidor es automática al abrir el proyecto. Si el endpoint exige OAuth, VS Code realiza el descubrimiento y presenta su autorización nativa; la extensión no captura ni persiste el token.

La integración de bundles es bifásica: primero se descarga y comprueba el inventario completo contra el `artifactSetSha256` aprobado, se muestra una previsualización y se pide confirmación humana. Después solo se crean archivos nuevos. No se sobrescriben archivos, no se siguen symlinks y se excluyen rutas ejecutables o sensibles.

## Límites deliberados

- La API pública de VS Code no expone un evento global para pruebas iniciadas por otras extensiones. Se observan tareas terminadas y comandos informados como ejecutados por la integración de shell; el recibo conserva el nivel de confianza y si la línea estaba autenticada, sin elevarlo a una atribución L1.
- L1 y L2 requieren el publicador/verificador de dominio; no se infieren localmente.
- El MCP no sustituye aprobaciones humanas ni puede mutar producción.

Contratos, vectores y referencias están en `schema/`, `conformance/` y `reference/`. Consulta [SECURITY.md](SECURITY.md) para reportar vulnerabilidades.
