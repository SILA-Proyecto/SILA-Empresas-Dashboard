import type { TextoLegal } from './tipos';

/**
 * BORRADOR pendiente de validación jurídica. Nota: la aceptación de este aviso es una barrera de la interfaz: el backend todavía
 * no la registra (docs/legal/PENDIENTES_BACKEND.md, punto 1).
 */
export const DRIVE_1_0: TextoLegal = {
  documento: 'DRIVE',
  version: '1.0',
  fecha: '2026-10-28',
  titulo: 'Aviso de conexión con Google Drive',
  resumen: 'Qué sale de SILA hacia tu cuenta de Google cuando conectas la copia de seguridad y qué ve Google.',
  secciones: [
    {
      id: 'que-sale',
      titulo: '1. Qué se envía',
      parrafos: [
        'Al conectar Google Drive, SILA guarda una copia de los archivos de {{empresa}} en la cuenta de Google que elijas. Los archivos van cifrados y con nombres sin sentido: Google no ve nombres de clientes ni el contenido. El permiso que se pide es mínimo: solo los archivos que SILA crea.',
      ],
    },
    {
      id: 'que-ve',
      titulo: '2. Qué sí ve Google',
      parrafos: [
        'Google ve datos técnicos: el tamaño y las fechas de los archivos, la cuenta y la dirección IP. Google trata esos datos según sus propios términos y su política de privacidad. Los términos de Google están en policies.google.com/terms y su política de privacidad en policies.google.com/privacy. Ante Google, la aplicación la registra SILA (NIT 1069715364-1), cuyos términos y política de privacidad están en las páginas legales de este sistema.',
        'Esto puede implicar que los datos se almacenen o procesen fuera de Colombia. Esa transferencia se apoya en la autorización expresa que das al conectar tu cuenta (art. 26 de la Ley 1581 de 2012). [POR DEFINIR: el abogado confirma esta base legal.]',
      ],
    },
    {
      id: 'desconectar',
      titulo: '3. Cómo desconectar',
      parrafos: ['El administrador puede desconectar Drive cuando quiera desde Archivos → Drive. Lo que ya se subió queda en la cuenta de Google hasta que se borre desde allí.'],
    },
  ],
};
