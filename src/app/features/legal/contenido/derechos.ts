import type { TextoLegal } from './tipos';

/** BORRADOR pendiente de validación jurídica. Derechos y plazos: Ley 1581 de 2012, arts. 8, 14, 15 y 16 (docs/legal/FUENTES.md). */
export const DERECHOS_1_0: TextoLegal = {
  documento: 'DERECHOS',
  version: '1.0',
  fecha: '2026-10-28',
  titulo: 'Tus derechos y cómo reclamar (PQR)',
  resumen: 'Qué puedes pedir sobre tus datos, a quién y por qué canal, en qué plazos te deben responder y cuándo acudir a la SIC.',
  secciones: [
    {
      id: 'derechos',
      titulo: '1. Qué puedes pedir',
      items: [
        'Conocer tus datos, actualizarlos y rectificarlos.',
        'Pedir prueba de la autorización que diste.',
        'Saber qué uso se ha dado a tus datos.',
        'Acceder gratis a los datos que se hayan tratado.',
        'Revocar la autorización o pedir que se supriman tus datos, cuando no se respeten tus derechos y la SIC lo haya determinado.',
        'Presentar una queja ante la Superintendencia de Industria y Comercio (SIC).',
      ],
      cierre: ['Esta es una explicación en lenguaje claro de los derechos del art. 8 de la Ley 1581 de 2012. Algunos datos, como los comprobantes y movimientos contables, deben conservarse por ley y no se pueden borrar a pedido.'],
    },
    {
      id: 'canal',
      titulo: '2. A quién y por qué canal',
      parrafos: [
        'Dirige tu solicitud a {{empresa}}, que es la responsable de tus datos, por el canal de atención de SILA (correo SILA@gmail.com, teléfono 3202647726, Villavicencio, Meta), de lunes a viernes de 8:00 a. m. a 6:00 p. m. (hora de Colombia), excepto festivos. SILA, que opera el sistema, tramita tu solicitud con {{empresa}}.',
        'SILA no tiene todavía un formulario para enviar estas solicitudes: se hacen por el canal anterior. Si eres usuario del sistema, también puedes hablar con el administrador de tu empresa.',
      ],
    },
    {
      id: 'que-incluir',
      titulo: '3. Qué debe llevar tu solicitud',
      items: [
        'Quién eres (nombre y número de documento) y cómo contactarte.',
        'Una descripción clara de los hechos o de lo que pides.',
        'La dirección donde quieres recibir la respuesta.',
        'Los documentos que quieras hacer valer.',
      ],
      cierre: ['Si la solicitud está incompleta, te lo dirán dentro de los 5 días siguientes para que la completes. Si pasan 2 meses sin que lo hagas, se entiende que desististe (Ley 1581 de 2012, art. 15).'],
    },
    {
      id: 'plazos',
      titulo: '4. En cuánto tiempo te responden',
      items: [
        'Consultas: máximo 10 días hábiles desde que se reciben. Si no es posible, te avisan el motivo y la nueva fecha, que no puede superar 5 días hábiles más (art. 14).',
        'Reclamos: máximo 15 días hábiles desde el día siguiente a que se reciben. Si no es posible, te avisan los motivos y la fecha, que no puede superar 8 días hábiles más (art. 15).',
      ],
      cierre: ['Mientras se resuelve un reclamo, el dato se marca como «reclamo en trámite».'],
    },
    {
      id: 'sic',
      titulo: '5. Superintendencia de Industria y Comercio',
      parrafos: [
        'Si no estás conforme con la respuesta, o no te la dan a tiempo, puedes presentar una queja ante la SIC (sic.gov.co). La ley exige haber agotado antes la consulta o el reclamo ante el responsable (art. 16).',
      ],
    },
  ],
};
