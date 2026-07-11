export type LocalMessagePreview = {
  title: string;
  body: string;
  /** Paired peer id when known; null if sender is not in local contacts. */
  peerId: string | null;
};

export interface NotificationPort {
  showLocalMessagePreview(preview: LocalMessagePreview): Promise<void>;
}
