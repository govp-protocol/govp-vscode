# GOVP Automatic Workbench

[English](README.md) · [Deutsch](README.de.md)

Crea y comprueba evidencia de trabajo terminado dentro de Visual Studio Code. La capa local funciona sin cuenta, red ni MCP; la integración remota es opcional y no tiene endpoint predeterminado.

## Primer minuto

1. Abre una carpeta local confiable.
2. Abre **GOVP → Evidencia** y pulsa **Preparar este proyecto**.
3. Ejecuta una tarea real, como `npm test` o `npm run build`, o usa **GOVP: Registrar trabajo terminado**.
4. El recibo firmado aparece en `.govp/receipts/`. Usa **GOVP: Verificar evidencia local** para comprobarlo de nuevo.

La identidad Ed25519 se genera en el equipo. Su clave privada se guarda en `SecretStorage` de VS Code y nunca se escribe en el proyecto. Cada recibo se comprueba antes y después de persistirlo.

## Significado del resultado

- `Íntegro (pendiente de L1)`: firma, hash y contenido coinciden localmente. Aún no hay atribución publicada por el dominio.
- `evidence_authentic`: L0 y la publicación L1 están confirmados; falta evaluar la confianza L2 vigente.
- `currently_trusted`: las tres capas están confirmadas para el contexto y momento evaluados.
- `No íntegro`: ha fallado alguna comprobación criptográfica o de contenido.

La extensión nunca reduce estos estados a un genérico «GOVP válido». El resultado es evidencia técnica, no certificación jurídica ni prueba de que un hecho declarado sea verdadero.

## Dominio y cola de publicación

Configura `govp.domain` con un origen HTTPS propio, como `https://example.com`, o declara un `homepage` HTTPS en el `package.json` del proyecto. Cada recibo nuevo se añade a `.govp/publication-queue/` con su dominio, canonical y huella.

La extensión no publica la cola y nunca recibe la clave privada del dominio. Puede consumirla un publicador autorizado separado. Sin dominio, la evidencia local continúa disponible, pero todavía no es atribuible a un dominio propio.

## MCP opcional

Configura `govp.mcpEndpoint` con un endpoint HTTPS terminado exactamente en `/mcp`. El proveedor debe publicar herramientas ligadas a `govp.mcpProviderNamespace`; se rechaza una herramienta homónima de otro proveedor.

VS Code realiza el descubrimiento y autorización OAuth cuando son necesarios. La extensión no lee ni conserva el token. La integración de bundles tiene dos fases: descarga y comprueba todo el inventario contra la huella aprobada, muestra una previsualización y pide confirmación humana. Después solo crea archivos en un directorio aislado ligado a la huella. No sobrescribe, no sigue symlinks, no registra tareas ni ejecuta scripts automáticamente.

## Límites deliberados

- VS Code no expone un evento global para pruebas iniciadas por otras extensiones. Se observan tareas terminadas y comandos comunicados por la integración de shell, conservando origen y confianza sin elevarlos a atribución L1.
- L1 y L2 requieren un publicador/verificador de dominio y nunca se infieren localmente.
- MCP no sustituye la aprobación humana ni autoriza mutaciones en producción.
- Las líneas de comando pueden contener datos sensibles. Desactiva `govp.observeLocalExecution` cuando la evidencia automática no sea apropiada.

## Confianza, privacidad y soporte

La extensión no incorpora telemetría ni destino remoto predeterminado. Antes de desplegarla, consulta el [aviso de privacidad](PRIVACY.es.md), las [condiciones](TERMS.es.md), la [política de seguridad](SECURITY.md), el [ciclo de soporte](SUPPORT.md), la [licencia Apache-2.0](LICENSE) y los [avisos de terceros](THIRD_PARTY_NOTICES.md).

El repositorio público incluye código, esquemas, vectores de conformidad, SBOM, modelo de amenazas y controles de publicación. Identidad oficial del paquete: `gemacode.govp-partner-workbench`.
