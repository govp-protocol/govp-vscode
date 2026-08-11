# Contrato MCP esperado

El endpoint se descubre mediante `McpHttpServerDefinition` con la etiqueta corta estable `GOVP AW` y debe ser HTTPS con ruta exacta `/mcp`. VS Code expone sus herramientas bajo `mcp_govp_aw_<tool>`; ese es el namespace configurado por defecto. También se admite una herramienta exacta únicamente si lleva la etiqueta de proveedor configurada en su descripción. No hay fallback.

Herramientas de implantación: `get_implementation`, `generate_specification`, `request_approval`, `get_bundle`, `list_bundle_artifacts`, `get_bundle_artifact` y `validate_source_mapping`.

`get_implementation` debe declarar `approvalsAreHumanOnly: true` y `productionMutationAllowed: false`. Las pruebas, el inventario y cada lectura de artefacto deben estar ligados al mismo `artifactSetSha256`. Las respuestas JSON se limitan a 1 MiB; el bundle a 500 archivos, 2 MiB por archivo y 32 MiB total.
