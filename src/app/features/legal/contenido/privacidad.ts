import type { TextoLegal } from './tipos';

/**
 * BORRADOR pendiente de validación jurídica. La estructura sigue el contenido mínimo de la política de tratamiento
 * (Decreto 1377 de 2013, art. 13; compilado en el Decreto 1074 de 2015, art. 2.2.2.25.3.1) y los derechos y plazos de la
 * Ley 1581 de 2012 (arts. 8, 14, 15 y 16). Ver docs/legal/FUENTES.md. Cada `[POR DEFINIR]` está en docs/legal/PENDIENTES_ABOGADO.md.
 */
export const PRIVACIDAD_1_0: TextoLegal = {
  documento: 'PRIVACIDAD',
  version: '1.0',
  fecha: '2026-10-28',
  titulo: 'Política de tratamiento de datos personales y aviso de privacidad',
  resumen: 'Qué datos personales trata {{empresa}} con SILA, para qué, quién los recibe, cuánto tiempo y cómo puedes ejercer tus derechos.',
  secciones: [
    {
      id: 'responsable',
      titulo: '1. Responsable del tratamiento',
      parrafos: [
        'El responsable del tratamiento de los datos que se registran en este sistema es {{empresa}} [POR DEFINIR: razón social completa, NIT, domicilio, dirección, correo electrónico y teléfono de la empresa].',
        'El sistema SILA lo opera SILA, persona natural identificada con NIT 1069715364-1, con domicilio en Villavicencio (Meta, Colombia), correo SILA@gmail.com, teléfono 3202647726, que actúa como encargado del tratamiento por cuenta de la empresa. El proveedor es además responsable de los datos de seguridad que él mismo genera para operar el servicio (bitácoras técnicas y cuentas de administración del sistema).',
        'Esta política es la de la empresa frente a sus usuarios, clientes y proveedores. No cubre las cuentas del panel del proveedor del sistema, que tienen su propia política.',
      ],
    },
    {
      id: 'titulares',
      titulo: '2. De quién son los datos y cuáles se tratan',
      parrafos: ['Según quién seas, el sistema guarda estos datos tuyos:'],
      items: [
        'Empleados y demás usuarios del sistema: usuario, nombre, correo, rol, clave (guardada de forma irreversible, no en texto legible), datos del segundo factor (secreto cifrado, códigos de respaldo, y por cada dispositivo registrado una llave pública, su nombre y su tipo), foto de perfil si decides subirla, y por cada acceso la dirección IP y el navegador.',
        'Clientes de la empresa (personas naturales): tipo y número de documento, nombre, correo, teléfono, dirección, límite de crédito, saldo y movimientos (ventas, abonos, comprobantes).',
        'Proveedores y campesinos que entregan leche (personas naturales): tipo y número de documento, nombre, teléfono, litros y calidad de lo entregado, precios y pagos.',
        'En cualquier caso: el historial de cambios (valor anterior y nuevo de lo que se modifica), los eventos de acceso (por ejemplo, el inicio de la pregunta que haces al asistente: los primeros 200 caracteres) y los registros de errores del sistema.',
      ],
      cierre: ['El sistema no pide datos sensibles. Si alguien los escribe en un campo libre o en un archivo, esa persona debe evitarlo (ver el apartado de datos sensibles).'],
    },
    {
      id: 'finalidades',
      titulo: '3. Para qué se usan (finalidades)',
      items: [
        'Usuarios: crear y proteger tu cuenta, autenticarte, registrar quién hizo qué (trazabilidad) y detectar accesos indebidos.',
        'Clientes: registrar ventas, créditos, abonos y comprobantes; llevar la cartera; emitir los comprobantes de la venta.',
        'Proveedores: registrar la recepción de leche y materias primas, su calidad, precios y pagos; llevar las cuentas con proveedores.',
        'Todos: cumplir obligaciones contables y tributarias de la empresa, atender consultas y reclamos, y dar seguridad al sistema.',
      ],
      cierre: ['Los datos no se usan para publicidad ni se venden. Si {{empresa}} quiere usarlos para otra finalidad (por ejemplo, contacto comercial), debe contar antes con la autorización del titular.'],
    },
    {
      id: 'autorizacion',
      titulo: '4. Autorización',
      parrafos: [
        'El tratamiento de tus datos requiere tu autorización previa e informada, dada por un medio que permita consultarla después (Ley 1581 de 2012, art. 9). Al pedirla, el responsable debe informarte el tratamiento y su finalidad, tus derechos y sus datos de contacto (art. 12), y conservar prueba de ello (art. 17).',
        'Para los usuarios del sistema, la autorización y el conocimiento de esta política se registran al aceptarla en SILA. Para clientes y proveedores, quien los registra debe contar con su autorización y poder demostrarlo. La prueba de esa autorización la conserva {{empresa}} por su cuenta (por ejemplo, un formato firmado): hoy SILA no tiene un campo para guardarla.',
      ],
    },
    {
      id: 'sensibles',
      titulo: '5. Datos sensibles y datos de niños, niñas y adolescentes',
      parrafos: [
        'Son sensibles los datos que afectan la intimidad o cuyo uso indebido puede causar discriminación, como los de salud, origen racial, orientación política o los datos biométricos (Ley 1581 de 2012, art. 5). Su tratamiento está prohibido salvo las excepciones de la ley, como tu autorización explícita (art. 6).',
        'Face ID y la huella digital que puedes usar como segundo factor se verifican en tu dispositivo: el sistema no recibe ni guarda tu cara ni tu huella, solo una llave pública.',
        'El tratamiento de datos de niños, niñas y adolescentes está prohibido, salvo los de naturaleza pública (art. 7). No registres datos de menores de edad en SILA. El tipo de documento «TI» (tarjeta de identidad) existe en el sistema, pero solo debe usarse si {{empresa}} cuenta con la autorización del representante legal del menor y el tratamiento respeta su interés superior.',
      ],
    },
    {
      id: 'terceros',
      titulo: '6. Quién más recibe los datos (encargados y terceros)',
      items: [
        'El proveedor del sistema, como encargado del tratamiento.',
        'Google (Google Drive), solo si el administrador conecta la copia de seguridad: se envía una copia cifrada de los archivos, con nombres sin sentido. Google ve datos técnicos (tamaño, fechas, la cuenta y la IP). Ver el aviso de Google Drive.',
        'El servicio de inteligencia artificial del asistente, solo si tu empresa lo tiene y lo usas: OpenAI (modelo gpt-6-luna), que procesa en Estados Unidos y recibe tu pregunta y los datos que el asistente lee para responderla [POR DEFINIR: por cuánto tiempo los conserva y si los usa para entrenar]. Ver el aviso de uso de IA.',
        'Autoridades, cuando la ley lo exija.',
      ],
      cierre: ['No se entregan datos a empresas de publicidad ni a centrales de riesgo. SILA no reporta ni consulta centrales de riesgo; si {{empresa}} lo hiciera por su cuenta, aplicarían reglas adicionales (habeas data financiero) que esta política no cubre.'],
    },
    {
      id: 'transferencias',
      titulo: '7. Transferencias internacionales',
      parrafos: [
        'La ley prohíbe transferir datos personales a países que no ofrezcan un nivel adecuado de protección, salvo excepciones, como la autorización expresa e inequívoca del titular (Ley 1581 de 2012, art. 26).',
        'Los servidores del sistema en producción son de Contabo y están en Estados Unidos. El servicio de IA (OpenAI) procesa en Estados Unidos, y Google puede procesar datos fuera de Colombia. El envío de datos al proveedor como encargado se hace bajo un contrato de transmisión entre {{empresa}} y el proveedor; para las demás transferencias se requiere la autorización expresa e inequívoca del titular (art. 26 de la Ley 1581). [POR DEFINIR: el abogado confirma esta base legal y si hace falta la declaración de conformidad de la SIC.]',
      ],
    },
    {
      id: 'seguridad',
      titulo: '8. Seguridad',
      items: [
        'Acceso con usuario y clave, con segundo factor obligatorio para los administradores.',
        'Los archivos se guardan cifrados y se revisan con antivirus.',
        'Las claves y los códigos de respaldo no se guardan en texto legible.',
        'Se registra quién hace cada cambio y cada acceso.',
        'Cada empresa tiene su propio esquema de base de datos, separado del de las demás.',
      ],
      cierre: ['Ninguna medida es infalible. Si ocurre una violación de los códigos de seguridad o riesgos en la administración de la información, el proveedor avisará a {{empresa}} sin demora y se informará a la SIC, como exigen los arts. 17 y 18 de la Ley 1581 de 2012; {{empresa}} informará a los titulares afectados.'],
    },
    {
      id: 'conservacion',
      titulo: '9. Cuánto tiempo se conservan los datos',
      parrafos: [
        'Algunas normas contables y tributarias obligan a conservar libros, comprobantes y soportes por un tiempo; por eso los comprobantes y movimientos no se pueden borrar a pedido de un titular mientras dure esa obligación. Los datos se conservan mientras sean necesarios para las finalidades de esta política y mientras una norma (contable, tributaria, laboral, etc.) o el contrato obligue a conservarlos; los plazos concretos son los que fije la ley aplicable a cada tipo de dato.',
        'Los datos que no deban conservarse por ley se suprimirán o anonimizarán al vencer su finalidad. Hoy el sistema desactiva clientes y proveedores, pero no tiene una función para anonimizarlos: las solicitudes de supresión se atienden caso a caso por el canal de consultas y reclamos.',
      ],
    },
    {
      id: 'derechos',
      titulo: '10. Tus derechos como titular',
      parrafos: ['Según el art. 8 de la Ley 1581 de 2012, tienes derecho a:'],
      items: [
        'conocer, actualizar y rectificar tus datos ante el responsable o el encargado;',
        'solicitar prueba de la autorización que diste;',
        'ser informado, si lo pides, del uso que se ha dado a tus datos;',
        'presentar quejas ante la Superintendencia de Industria y Comercio (SIC);',
        'revocar la autorización o pedir la supresión de tus datos, cuando no se respeten los principios, derechos y garantías de la ley, y la SIC lo haya determinado;',
        'acceder gratis a tus datos que hayan sido tratados.',
      ],
      cierre: ['La página «Derechos y canal de PQR» explica cómo ejercerlos.'],
    },
    {
      id: 'procedimiento',
      titulo: '11. Consultas y reclamos',
      parrafos: [
        'Las consultas y reclamos se reciben por el canal de atención de SILA (correo SILA@gmail.com, teléfono 3202647726, Villavicencio, Meta), de lunes a viernes de 8:00 a. m. a 6:00 p. m. (hora de Colombia), excepto festivos. SILA los tramita con {{empresa}}, que es la responsable de tus datos.',
        'Una consulta se responde en máximo 10 días hábiles; si no es posible, se te informa el motivo y la nueva fecha, que no puede pasar de 5 días hábiles más (art. 14). Un reclamo se resuelve en máximo 15 días hábiles, prorrogables por hasta 8 días hábiles más con aviso de los motivos (art. 15). Solo puedes acudir a la SIC después de haber agotado la consulta o el reclamo ante el responsable (art. 16).',
      ],
    },
    {
      id: 'rnbd',
      titulo: '12. Registro Nacional de Bases de Datos',
      parrafos: ['[POR DEFINIR: si {{empresa}} está obligada a inscribir sus bases de datos en el Registro Nacional de Bases de Datos de la SIC (depende de sus activos) y, si lo está, su número de registro.]'],
    },
    {
      id: 'vigencia',
      titulo: '13. Vigencia y cambios',
      parrafos: [
        'Esta política (versión 1.0) rige desde el 28 de octubre de 2026. Las bases de datos estarán vigentes mientras {{empresa}} use SILA y mientras la ley obligue a conservar los datos. Si cambia de forma sustancial, habrá una versión nueva con su número y fecha, y el sistema te pedirá aceptarla otra vez. Las versiones anteriores se conservan para poder consultar qué aceptaste.',
        'Este es un borrador pendiente de validación jurídica: no debe usarse con clientes reales sin la revisión de un abogado.',
      ],
    },
  ],
};
