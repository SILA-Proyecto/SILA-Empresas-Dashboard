/** `POST /asistente/mensajes`. The role and the user are taken from the session by the server: nothing else travels. */
export interface MensajeEnviado {
  /** 1 to 1000 characters, trimmed. */
  mensaje: string;
  /** One UUID per conversation. */
  sesion_id: string;
}

export interface RespuestaAsistente {
  respuesta: string;
  sesion_id: string;
}

/** One bubble of the conversation. The text is shown as text, never as HTML. */
export interface MensajeChat {
  id: number;
  de: 'usuario' | 'asistente';
  texto: string;
}

/** What went wrong with the last question, in words for the person. `reintentable`: sending the same text again makes sense. */
export interface ErrorChat {
  mensaje: string;
  reintentable: boolean;
}
