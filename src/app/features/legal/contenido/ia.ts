import type { TextoLegal } from './tipos';

/**
 * BORRADOR pendiente de validación jurídica. Nota: la aceptación de este aviso es una barrera de la interfaz: el backend todavía
 * no la registra (docs/legal/PENDIENTES_BACKEND.md, punto 1).
 */
export const IA_1_0: TextoLegal = {
  documento: 'IA',
  version: '1.0',
  fecha: '2026-10-28',
  titulo: 'Aviso de uso de inteligencia artificial (asistente)',
  resumen: 'El asistente usa un servicio de inteligencia artificial: qué recibe, qué puede fallar y qué no debes escribirle.',
  secciones: [
    {
      id: 'que-hace',
      titulo: '1. Qué hace el asistente',
      parrafos: [
        'Responde preguntas sobre cómo usar SILA y consulta las cifras del negocio. Solo consulta: no cambia datos. Ve lo mismo que ves tú, con tu mismo rol.',
      ],
    },
    {
      id: 'procesamiento',
      titulo: '2. A dónde van tus preguntas',
      parrafos: [
        'Tu pregunta y los datos que el asistente lee para contestarla se procesan por un servicio de inteligencia artificial de OpenAI (modelo gpt-6-luna), que procesa en Estados Unidos [POR DEFINIR: si OpenAI guarda los datos o los usa para entrenar, y por cuánto tiempo].',
        'Los primeros 200 caracteres de tu pregunta quedan en la bitácora de accesos de {{empresa}}.',
      ],
    },
    {
      id: 'limites',
      titulo: '3. Sus límites',
      items: [
        'Puede equivocarse o inventar datos: verifica las cifras importantes antes de decidir.',
        'No reemplaza el criterio de un contador, abogado u otro profesional.',
        'No escribas datos sensibles (salud, origen, orientación política, claves, etc.) ni datos de menores de edad.',
      ],
    },
    {
      id: 'error',
      titulo: '4. Si algo sale mal',
      parrafos: ['Si la respuesta es incorrecta o ves datos que no deberías ver, avisa al administrador de {{empresa}}. Puedes empezar una conversación nueva en cualquier momento; la conversación se borra al cerrar la pestaña.'],
    },
  ],
};
