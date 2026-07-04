export const es = {
  COMMON: {
    BACK: "Atrás",
  },
  HOME: {
    TITLE: "Mesher",
    NEARBY_CAPTION: "Cercanos",
    TAGLINE: "Comunicación en malla cifrada",
    INITIALIZING: "Inicializando…",
    PAIR_QR: "Emparejar (QR)",
    SEND: "Enviar",
    MESH_A11Y:
      "Red decorativa de la malla. Los nodos verdes coinciden con el número del contador de cercanos.",
  },
  MAIN_TABS: {
    NEARBY: "Cercanos",
    MESSAGES: "Mensajes",
    CONTACTS: "Contactos",
    SETTINGS: "Ajustes",
  },
  INBOX: {
    TITLE: "Bandeja de entrada",
    EMPTY: "Aún no hay mensajes.",
    ROW_EMPTY_BODY: "(Vacío)",
    A11Y_COLLAPSE: "Contraer bandeja de entrada",
    A11Y_EXPAND: "Expandir bandeja de entrada",
  },
  OUTBOX: {
    TITLE: "Mensajes",
    EMPTY: "Aún no hay mensajes enviados.",
    TIME_YESTERDAY: "Ayer",
    A11Y_COLLAPSE: "Contraer mensajes enviados",
    A11Y_EXPAND: "Expandir mensajes enviados",
    STATUS: {
      PENDING: "Pendiente",
      SENT: "Enviado",
      DELIVERED: "Entregado",
      EXPIRED: "Expirado",
    },
  },
  CONTACTS: {
    TITLE: "MIS CONTACTOS",
    SEARCH_PLACEHOLDER: "Buscar contacto...",
    FAB_PAIR_A11Y: "Emparejar con código QR",
    EMPTY: "Aún no hay contactos — escanea un QR.",
    NO_SEARCH_RESULTS: "Ningún contacto coincide con la búsqueda.",
    UNKNOWN_PEER: "Desconocido",
    A11Y_CONNECTED_BADGE: "Conectado",
    SECTION_OTHER: "Otros",
  },
  USER_CONFIG: {
    TITLE: "Información personal",
    NAME_PLACEHOLDER: "Nombre",
    NAME_HINT: "Los mensajes que envíes llevarán este nombre",
    SAVE: "Guardar",
    NAME_SAVED: "Nombre guardado",
  },
  WELCOME_NAME: {
    TITLE: "Bienvenido a Mesher",
    SUBTITLE: "¿Cómo te llamas? Este nombre aparecerá en los mensajes que envíes.",
    SAVE: "Guardar",
  },
  PAIR: {
    ADDED_AS_NAME: 'Se te agregará con el nombre de "{name}".',
  },
} as const;
