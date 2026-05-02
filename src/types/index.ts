export interface ExtractedData {
  gateTransactionNumber: string;
  transactionId?: string;
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
  comment: string; // kept for legacy compat if needed, but UI uses description
  merchantName: string;
  statusOverride?: string;
  categoryOverride?: string;
  screenshots: string[];
  isSelected?: boolean;
}

export type ParseMode = 'gemini' | 'script';

export interface ReportHistoryEntry {
  tg: string;
  ip: string;
  date: string;
}
