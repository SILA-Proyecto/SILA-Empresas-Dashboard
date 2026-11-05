import type { TextoLegal } from './tipos';

/** BORRADOR pendiente de validación jurídica. Cada `[POR DEFINIR]` está en docs/legal/PENDIENTES_ABOGADO.md. */
export const TERMINOS_1_0: TextoLegal = {
  documento: 'TERMINOS',
  version: '1.0',
  fecha: '2026-10-28',
  titulo: 'Términos y condiciones de uso',
  resumen: 'Las reglas para usar SILA: tu cuenta, el uso aceptable, lo que subes, el asistente de IA y qué pasa si el servicio se suspende.',
  secciones: [
    {
      id: 'quien',
      titulo: '1. Quién ofrece el servicio y a quién se dirige',
      parrafos: [
        'SILA es un sistema de gestión para empresas de lácteos (ventas, inventario, producción, compras, cartera, comprobantes y archivos). {{empresa}} lo usa para administrar su negocio y da acceso a sus empleados y colaboradores (en adelante, «tú» o «el usuario»).',
        'El servicio lo presta SILA, persona natural identificada con NIT 1069715364-1, con domicilio en Villavicencio (Meta, Colombia) (en adelante, «el proveedor»). Estos términos regulan el uso que haces del sistema; la relación entre el proveedor y {{empresa}} se rige por el contrato de prestación de servicios que ambos hayan firmado.',
      ],
    },
    {
      id: 'aceptacion',
      titulo: '2. Aceptación electrónica y su prueba',
      parrafos: [
        'Para usar SILA debes aceptar estos términos y la política de privacidad, marcando las casillas de la pantalla «Aceptar términos» y pulsando «Aceptar y continuar». Sin esa aceptación el sistema no te deja entrar a las funciones del negocio.',
        'Tu aceptación queda registrada en el servidor de {{empresa}} con tu usuario, la versión de cada documento, la fecha y hora, la dirección IP y el navegador. Ese registro es la prueba de que aceptaste.',
        'La Ley 527 de 1999 reconoce efectos jurídicos al mensaje de datos (art. 5) y lo admite como medio de prueba (art. 10); su valor se aprecia según la sana crítica (art. 11).',
      ],
    },
    {
      id: 'cuenta',
      titulo: '3. Tu cuenta, tu clave y el segundo factor',
      items: [
        'Tu cuenta es personal e intransferible: no la compartas ni dejes que otra persona use tu usuario.',
        'Guarda tu clave y tu segundo factor (aplicación de autenticación, códigos de respaldo y, si lo registras, Face ID o huella). No los entregues a nadie, ni siquiera a quien diga ser de soporte.',
        'Si crees que alguien conoce tu clave o perdiste el teléfono, cámbiala o avisa al administrador de {{empresa}} de inmediato.',
        'Lo que se haga con tu cuenta se te atribuye, salvo que avises a tiempo de la pérdida o el uso no autorizado.',
      ],
    },
    {
      id: 'uso',
      titulo: '4. Uso aceptable',
      parrafos: ['Te comprometes a usar SILA solo para los fines del negocio de {{empresa}} y de forma lícita. En particular, no puedes:'],
      items: [
        'intentar entrar a cuentas, datos o partes del sistema a las que no tienes acceso, ni vulnerar sus medidas de seguridad;',
        'usar programas para automatizar accesos, extraer datos masivamente o saturar el servicio;',
        'subir virus, programas dañinos o contenido que pueda perjudicar el sistema;',
        'registrar datos falsos o de personas sin su autorización cuando esta sea necesaria;',
        'usar el sistema para actividades ilegales.',
      ],
      cierre: [
        'Acceder sin autorización a un sistema informático, o dañarlo, puede constituir delito según la Ley 1273 de 2009. El incumplimiento de esta cláusula puede llevar a la suspensión de tu cuenta o del servicio (ver el apartado 8).',
      ],
    },
    {
      id: 'contenido',
      titulo: '5. Lo que subes al sistema',
      parrafos: [
        'Las personas con rol de administrador pueden subir archivos (PDF, JPG o PNG). Quien sube un archivo declara que:',
      ],
      items: [
        'tiene derecho a usarlo y a subirlo (es suyo, de {{empresa}}, o cuenta con permiso de su titular), en línea con las normas de derechos de autor, como la Ley 23 de 1982 y la Decisión Andina 351 de 1993;',
        'su contenido es lícito y no contiene datos sensibles ni de menores de edad que no sean necesarios;',
        'si trae datos personales de terceros, la empresa cuenta con la autorización de esas personas o con otra base legal.',
      ],
      cierre: [
        'Los archivos se revisan con antivirus, se limpian y se guardan cifrados. Esa revisión no garantiza que el contenido sea lícito: la responsabilidad por lo que se sube es de quien lo sube y de {{empresa}}.',
      ],
    },
    {
      id: 'ia',
      titulo: '6. Asistente de inteligencia artificial',
      parrafos: [
        'Si tu empresa tiene el asistente, este responde preguntas y consulta cifras con el mismo rol que tienes tú. Sus respuestas pueden ser incorrectas o incompletas: verifica lo importante y no lo uses como único criterio para decisiones contables, tributarias, legales o laborales.',
        'No escribas datos sensibles ni de menores de edad. Lo que preguntes se procesa por un servicio de IA de OpenAI (modelo gpt-6-luna), que procesa los datos en Estados Unidos. Más detalle en el aviso de uso de IA.',
      ],
    },
    {
      id: 'disponibilidad',
      titulo: '7. Disponibilidad y soporte',
      parrafos: [
        'El proveedor procura mantener el servicio disponible, pero no garantiza que funcione sin interrupciones ni errores. No se ofrece un porcentaje de disponibilidad garantizado. Los mantenimientos se procurarán avisar con anticipación y hacer fuera del horario de trabajo.',
        'Soporte: de lunes a viernes de 8:00 a. m. a 6:00 p. m. (hora de Colombia), excepto festivos, por el correo SILA@gmail.com. Tiempos de primera respuesta: falla que impide operar, 4 horas hábiles; falla parcial, 1 día hábil; consultas y mejoras, 3 días hábiles.',
      ],
    },
    {
      id: 'suspension',
      titulo: '8. Suspensión y baja',
      parrafos: [
        'El proveedor puede suspender el servicio de {{empresa}} (una pausa reversible) y, mientras dure, nadie de la empresa podrá entrar: el sistema mostrará un aviso en lugar del formulario de ingreso. La suspensión no borra los datos.',
        'El proveedor puede suspender el servicio por: falta de pago según el contrato; uso contrario a estos términos o que ponga en riesgo la seguridad del sistema o de otras empresas; orden de una autoridad competente; o una necesidad urgente de seguridad o mantenimiento.',
        'Antes de suspender se avisará a {{empresa}} por correo con al menos 5 días hábiles de anticipación, salvo que haya un riesgo de seguridad o una orden de autoridad: en ese caso se avisa en cuanto sea posible.',
        'Si {{empresa}} se da de baja, el proveedor conserva sus datos y respaldos por 30 días para que pueda pedir su devolución en un formato de uso común (por ejemplo, exportaciones a Excel y los archivos). Pasado ese plazo los destruye, salvo lo que la ley obligue a conservar.',
      ],
    },
    {
      id: 'propiedad',
      titulo: '9. Propiedad intelectual del software',
      parrafos: [
        'El sistema SILA, su diseño y su código pertenecen a SILA (NIT 1069715364-1), como persona natural. Se te concede una licencia de uso limitada, no exclusiva e intransferible, mientras {{empresa}} tenga el servicio activo y solo para sus fines. No puedes copiar, vender, descompilar ni ofrecer el sistema a terceros.',
        'Los datos del negocio (clientes, ventas, inventario, archivos) son de {{empresa}}. El sistema usa componentes de terceros con sus propias licencias: están listados en la página de licencias.',
      ],
    },
    {
      id: 'responsabilidad',
      titulo: '10. Limitación de responsabilidad',
      parrafos: [
        'El proveedor responde por el servicio que presta conforme a la ley y al contrato con {{empresa}}. Nada de lo previsto aquí excluye ni limita la responsabilidad por dolo o culpa grave, ni lo que la ley no permita excluir o limitar.',
      ],
      items: [
        'El proveedor no responde por errores en los datos que tú o {{empresa}} registran, ni por las decisiones que se tomen con base en ellos.',
        'Si se pierden las claves de cifrado o las credenciales de acceso por causas ajenas al proveedor, es posible que los archivos cifrados no se puedan recuperar.',
        'El proveedor no responde por interrupciones causadas por fuerza mayor, fallas de internet o de energía, ni por fallas de servicios de terceros (como el alojamiento, Google o el servicio de IA).',
        'Las respuestas del asistente de IA son orientativas y pueden ser incorrectas: el proveedor no responde por decisiones basadas en ellas.',
        'Salvo dolo o culpa grave, la responsabilidad total del proveedor frente a {{empresa}}, por cualquier causa, se limita al valor que {{empresa}} haya pagado por el servicio en los 12 meses anteriores al hecho.',
      ],
    },
    {
      id: 'cambios',
      titulo: '11. Cambios en estos términos',
      parrafos: [
        'Estos términos pueden cambiar. Cada versión tiene un número y una fecha. Cuando haya una versión nueva, el sistema te pedirá aceptarla otra vez antes de seguir. Tus aceptaciones anteriores se conservan como constancia.',
      ],
    },
    {
      id: 'ley',
      titulo: '12. Ley aplicable y jurisdicción',
      parrafos: ['Estos términos se rigen por la ley colombiana. Las diferencias se buscarán resolver primero entre las partes; si no es posible, se intentará la conciliación en la Cámara de Comercio de Villavicencio como paso previo, y de no lograrse acuerdo, serán competentes los jueces de Villavicencio (Meta).'],
    },
    {
      id: 'contacto',
      titulo: '13. Contacto',
      parrafos: ['Para dudas sobre estos términos: SILA@gmail.com, teléfono 3202647726, o el administrador de {{empresa}}.'],
    },
  ],
};
