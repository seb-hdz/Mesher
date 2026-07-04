export const en = {
  HOME: {
    TITLE: "Mesher",
    NEARBY_CAPTION: "Nearby",
    TAGLINE: "Encrypted mesh communication",
    INITIALIZING: "Initializing…",
    PAIR_QR: "Pair (QR)",
    SEND: "Send",
    MESH_A11Y:
      "Decorative mesh network. Green nodes match the nearby peers count.",
  },
  MAIN_TABS: {
    NEARBY: "Nearby",
    MESSAGES: "Messages",
    CONTACTS: "Contacts",
    SETTINGS: "Settings",
  },
  INBOX: {
    TITLE: "Inbox",
    EMPTY: "No messages yet.",
    ROW_EMPTY_BODY: "(Empty)",
  },
  OUTBOX: {
    TITLE: "Outbox",
    EMPTY: "No outbound messages yet.",
    TIME_YESTERDAY: "Yesterday",
    STATUS: {
      PENDING: "Pending",
      SENT: "Sent",
      DELIVERED: "Delivered",
      EXPIRED: "Expired",
    },
  },
  CONTACTS: {
    TITLE: "MY CONTACTS",
    SEARCH_PLACEHOLDER: "Search contacts...",
    FAB_PAIR_A11Y: "Pair with QR code",
    EMPTY: "No peers yet — scan a QR.",
    NO_SEARCH_RESULTS: "No contacts match your search.",
    UNKNOWN_PEER: "Unknown",
    A11Y_CONNECTED_BADGE: "Connected",
    SECTION_OTHER: "Other",
  },
  USER_CONFIG: {
    TITLE: "Personal information",
    NAME_PLACEHOLDER: "Name",
    NAME_HINT: "Messages you send will show this name",
  },
} as const;
