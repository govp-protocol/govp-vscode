# Aviso de privacidad — GOVP Automatic Workbench

Fecha de efectividad: 15 de agosto de 2026  
Estado: candidato de publicación; requiere revisión jurídica antes de publicarse en Marketplace  
Idiomas: [English](PRIVACY.md) · [Deutsch](PRIVACY.de.md)

## Responsable y contacto

BRILYETZ SOCIEDAD LIMITADA (Brilyetz, S.L.), que opera bajo la marca Gemacode, NIF B22551485, C/ Autonomía 13, Principal Izquierda, 48012 Bilbao, Bizkaia, España, es responsable de los datos personales que reciba mediante su soporte o sus servicios alojados opcionales. Contacto: research@gemacode.org.

La extensión local puede utilizarse sin cuenta ni servicio de Gemacode. Brilyetz no recibe datos por el mero hecho de instalar o utilizar localmente la extensión.

## Tratamiento local

Cuando está activada, la extensión trata información dentro de VS Code para crear y comprobar evidencias. Puede incluir:

- nombre del workspace e identificadores derivados de su URI;
- nombres y origen de tareas, nombre del terminal y línea de comando comunicada por VS Code;
- hora de ejecución, código de salida y metadatos de confianza del comando;
- identificadores, hashes, firmas y claves públicas de los recibos;
- dominio configurado y metadatos de la cola de publicación; y
- archivos elegidos por el usuario para comprobación local.

Las líneas de comando y el contenido del workspace pueden contener datos personales o secretos. El usuario debe evitar incluir credenciales o datos personales innecesarios en comandos destinados a evidencia. La extensión no copia el texto del comando en su registro de salida.

Los recibos, la política y la cola se guardan bajo `.govp/`. La clave privada Ed25519 local se guarda mediante `SecretStorage` de VS Code, no en el proyecto. La extensión no incorpora telemetría ni identificadores publicitarios.

## Red y terceros

Todos los ajustes remotos están vacíos por defecto. El flujo local no necesita red.

Si el usuario configura un endpoint MCP, VS Code se conecta a él y puede realizar el descubrimiento y la autorización OAuth. La extensión solo invoca herramientas ligadas al namespace configurado. VS Code, el operador MCP, el proveedor de identidad y el operador de red pueden tratar datos de conexión, cuenta y solicitud bajo sus propios avisos. La extensión no lee ni conserva el token OAuth.

Si el usuario abre una URL de partners configurada, se abre externamente y su operador recibe los datos ordinarios de una petición web. Esta extensión no transmite la cola de publicación; un publicador separado puede consumirla bajo su propia configuración y aviso de privacidad.

Microsoft trata de forma independiente datos de instalación y diagnóstico del Marketplace conforme a sus propios términos y documentación.

## Finalidades, conservación y derechos

Brilyetz trata las comunicaciones de soporte para responder y proteger el servicio, sobre la base de la prestación solicitada y el interés legítimo en soporte y seguridad. Cada servicio alojado opcional debe informar separadamente de finalidades, bases jurídicas, destinatarios, transferencias y conservación. Solo se solicitará consentimiento cuando sea la base aplicable.

Los archivos locales permanecen hasta que el usuario los elimina. VS Code controla `SecretStorage`; el usuario puede eliminar la identidad local mediante el comando correspondiente después de archivar o borrar los recibos y la cola. En el estado local del workspace de VS Code permanece un marcador booleano que impide recrear silenciosamente la clave; **Preparar este proyecto** lo elimina. Los registros de soporte solo se conservan durante el tiempo necesario para resolver la solicitud, cumplir obligaciones y defender reclamaciones.

Cuando Brilyetz sea responsable, pueden ejercerse los derechos de acceso, rectificación, supresión, limitación, portabilidad u oposición, según proceda, escribiendo a research@gemacode.org. También puede reclamarse ante la Agencia Española de Protección de Datos u otra autoridad competente.

Los cambios materiales se registrarán en el repositorio y las notas de versión. Introducir telemetría o recogida remota exige una nueva revisión del flujo de datos y actualizar este aviso antes de publicar.
