export interface LinkItem {
  _id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl?: string;
  qrUrl?: string;
  qrCode?: string;
  clicks: number;
  expiresAt: string | null;
  isExpired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type BackendStatus = 'online' | 'offline' | 'checking';

export interface ShortenPayload {
  originalUrl: string;
  customCode?: string;
  expiresAt?: string | null;
}
