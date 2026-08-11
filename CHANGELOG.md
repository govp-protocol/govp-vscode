# Changelog

## 0.3.7

- Ajusta los mensajes de instalación al singular y plural para mantener una UX clara.

## 0.3.6

- Incluye y valida el manifiesto separado requerido por `verify-bundle`.
- El kit aislado instalado desde VS Code queda ejecutable y verificable sin completar archivos a mano.

## 0.3.5

- Instala el bundle funcional completo en una carpeta aislada ligada a su huella.
- Conserva los cuatro `package.json` sin tocar ni sobrescribir el proyecto del cliente.
- La instalación es reversible eliminando únicamente esa carpeta de huella.

## 0.3.4

- Descarga y verifica el bundle autorizado con una sola confirmación MCP.
- Conserva la verificación por artefacto y la huella global antes de escribir.
- Elimina el flujo impracticable de una autorización por cada archivo.

## 0.3.3

- Reconoce una aprobación de piloto externo ligada a la huella actual sin afirmar que producción esté activa.
- Permite revisar e integrar el bundle autorizado directamente desde VS Code.

## 0.3.2

- Consulta `run_conformance_suite` antes de abrir la decisión humana del bundle.
- Rechaza resultados incompletos o ligados a una huella distinta.
- Muestra el detalle 4/4 dentro de VS Code antes de continuar al canal de partners.

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
