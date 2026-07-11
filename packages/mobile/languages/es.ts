export const es = {
  COMMON: {
    BACK: "Atrás",
    CANCEL: "Cancelar",
    GOT_IT: "Entendido",
  },
  HOME: {
    TITLE: "Mesher",
    NEARBY_CAPTION: "Cercanos",
    TAGLINE: "Comunicación en malla cifrada",
    INITIALIZING: "Inicializando",
    PAIR_QR: "Emparejar (QR)",
    SEND: "Enviar",
    MESH_A11Y:
      "Red decorativa de la malla. Los nodos verdes coinciden con el número del contador de cercanos.",
  },
  NO_BLUETOOTH: {
    TITLE: "Bluetooth no disponible",
    SUBTITLE:
      "No se ha podido acceder al Bluetooth. Asegúrate de que esté activado.",
  },
  BLOCKING_ALERT: {
    DISMISS: "Entendido",
    A11Y_EXPAND: "Toca para ver más detalles",
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
    TITLE: "Mis contactos",
    SEARCH_PLACEHOLDER: "Buscar contacto...",
    PAIR_WITH_QR: "Emparejar con código QR",
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
    SUBTITLE: "¿Cómo deseas llamarte?",
    SAVE: "Guardar",
  },
  PAIR: {
    SUBTITLE:
      "Muestra tu código para que un contacto te agregue, o escanea el suyo.",
    YOUR_CODE: "Tu código",
    SHARE_QR: "Comparte este QR",
    LOADING_QR: "Cargando QR…",
    ALLOW_CAMERA: "Permitir cámara",
    SCAN_PEER_QR: "Escanear QR del contacto",
    ADDED_AS_NAME: 'Se te agregará con el nombre de "{name}".',
  },
  CONVERSATIONS: {
    TITLE: "Mensajes",
    EMPTY: "Aún no hay conversaciones.",
    LAST_MESSAGE_EMPTY: "(Sin texto)",
  },
  CHAT: {
    INPUT_PLACEHOLDER: "Mensaje…",
    EMPTY: "Aún no hay mensajes en esta conversación.",
    SEND_A11Y: "Enviar mensaje",
    UNKNOWN_BODY: "(Mensaje no disponible)",
  },
  INCOMING_MESSAGE: {
    TAP_OPEN_CHAT: "Toca para abrir el chat",
    TAP_OPEN_MESSAGES: "Toca para abrir mensajes",
    A11Y_PREFIX: "Nuevo mensaje",
  },
  APP_RESET: {
    TITLE: "Restablecer aplicación",
    DESCRIPTION:
      "Borra mensajes, contactos, identidad del dispositivo y preferencias locales. Esta acción no se puede deshacer.",
    BUTTON: "Restablecer todos los datos",
    RESETTING: "Restableciendo…",
    RESETTING_HINT: "La aplicación se reiniciará en un momento.",
    CONFIRM_TITLE: "¿Restablecer la aplicación?",
    CONFIRM_MESSAGE:
      "Se eliminarán todos los mensajes, contactos emparejados, tu nombre y las claves de este dispositivo. Tendrás que configurar la app de nuevo.",
    CONFIRM_BUTTON: "Restablecer",
    ERROR_TITLE: "No se pudo restablecer",
    ERROR_MESSAGE: "Ocurrió un error al borrar los datos. Inténtalo de nuevo.",
  },
} as const;
