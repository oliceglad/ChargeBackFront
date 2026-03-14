export interface ExtractedData {
  gateTransactionNumber: string;
  deadline: string;
  type: string;
  urlProject: string;
  telegramId: string;
  clientIp: string;
  starCount: string;
  telegramName: string;
  dateMoscow: string;
  tonUrl: string;
  price: string;
  description: string;
  comment: string;
  merchantName: string;
  statusOverride?: string;
  categoryOverride?: string;
  screenshots: string[];
}

export type ParseMode = 'gemini' | 'script';

export interface ReportHistoryEntry {
  tg: string;
  ip: string;
  date: string;
}
