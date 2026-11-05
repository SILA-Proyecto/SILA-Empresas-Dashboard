import type { TextoLegal } from './tipos';

/**
 * BORRADOR pendiente de validación jurídica. Los hechos salen del código del dashboard (2026-10-28): una sola cookie propia y
 * preferencias locales; sin analítica, publicidad ni recursos de terceros. Si se agrega cualquiera de ellos hay que revisar esta
 * página y, probablemente, pedir consentimiento (banner).
 */
export const COOKIES_1_0: TextoLegal = {
  documento: 'COOKIES',
  version: '1.0',
  fecha: '2026-10-28',
  titulo: 'Cookies y almacenamiento local',
  resumen: 'SILA usa una sola cookie, necesaria para mantener tu sesión, y guarda algunas preferencias en tu navegador. No usa analítica ni publicidad.',
  secciones: [
    {
      id: 'cookie',
      titulo: '1. La cookie',
      parrafos: [
        'SILA usa una sola cookie propia, llamada «sila_refresh». Mantiene tu sesión abierta mientras trabajas. Es estrictamente necesaria para que el sistema funcione: sin ella tendrías que escribir tu clave cada vez que recargas la página.',
      ],
      items: [
        'Quién la crea: el servidor de {{empresa}}, al iniciar sesión.',
        'Protecciones: no la puede leer ningún programa de la página (httpOnly), solo viaja por conexión segura (Secure) y solo se envía desde este mismo sitio (SameSite estricto).',
        'Duración: 12 horas.',
      ],
    },
    {
      id: 'local',
      titulo: '2. Lo que se guarda en tu navegador',
      parrafos: ['Estas preferencias se quedan solo en tu navegador y no se envían al servidor:'],
      items: [
        'Tu tema de colores, tamaño de letra y estilo de íconos.',
        'Si el menú lateral está plegado.',
        'El ancho del papel del ticket de venta.',
        'Qué notificaciones ya viste (una lista por usuario).',
        'La conversación con el asistente y el visto del aviso de IA, solo mientras la pestaña esté abierta (se borran al cerrarla).',
      ],
      cierre: ['Puedes borrarlas desde los ajustes de tu navegador. Si lo haces, el sistema vuelve a sus valores de siempre.'],
    },
    {
      id: 'terceros',
      titulo: '3. Lo que SILA no usa',
      items: [
        'No usa analítica ni herramientas de medición de visitas.',
        'No usa publicidad ni seguimiento entre sitios.',
        'No carga fuentes, scripts, imágenes ni otros recursos de otros sitios: todo se sirve desde el mismo sitio.',
      ],
    },
    {
      id: 'consentimiento',
      titulo: '4. Consentimiento',
      parrafos: [
        'Como solo se usa lo estrictamente necesario y preferencias que tú configuras, SILA no muestra un aviso para aceptar cookies. Esta página y el enlace del pie de cada pantalla cumplen la función de informarte.',
        'Si algún día se agregan herramientas de terceros, esta página cambiará y se pedirá tu consentimiento antes.',
      ],
    },
  ],
};
