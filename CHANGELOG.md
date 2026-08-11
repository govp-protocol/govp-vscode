# Changelog

## 0.3.1

- Corrige la vinculación exacta con el namespace que VS Code asigna a GOVP Implementation MCP.
- Mantiene el rechazo de herramientas homónimas publicadas por otros proveedores.

## 0.3.0

- Añade operación local completa sin cuenta, red ni MCP.
- Guarda la identidad Ed25519 en SecretStorage y verifica cada recibo antes y después de persistirlo.
- Observa tareas y ejecuciones de terminal reales con origen explícito.
- Añade gate local, diagnósticos, cadena de recibos y cola de publicación por dominio.
- Separa los veredictos L0, L1 y L2 y conserva advertencias.
- Liga herramientas MCP al proveedor configurado y aplica bundles con preflight y escritura bifásica sin sobrescrituras.
- Elimina endpoints Preview, mapas de fuentes embebidos y rutas ejecutables del bundle aplicable.
