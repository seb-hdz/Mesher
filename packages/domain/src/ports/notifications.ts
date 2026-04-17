export interface NotificationPort {
  showLocalMessagePreview(title: string, body: string): Promise<void>;
}
