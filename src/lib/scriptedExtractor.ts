import { ExtractedData } from './gemini';

/**
 * Scripted extractor — line-by-line approach for maximum reliability.
 * Processes each line of text separately to find key-value pairs.
 */
export function parseMessageWithScripts(message: string): ExtractedData[] {
  const text = message.trim();
  if (!text) return [];

  const data: ExtractedData = {
    gateTransactionNumber: '',
    deadline: '',
    type: 'чб',
    urlProject: '',
    telegramId: '',
    clientIp: '',
    starCount: '',
    telegramName: '',
    dateMoscow: '',
    tonUrl: '',
    price: '',
    comment: text,
    description: '',
    merchantName: ''
  };

  const lower = text.toLowerCase();
  const lines = text.split('\n').map(l => l.trim());

  // ──────────── TYPE ────────────
  if (lower.includes('чарджбек') || lower.includes('chargeback')) {
    data.type = 'чб';
  } else if (lower.includes('финцерт') || lower.includes('fincert') || lower.includes('запрос от финцерт')) {
    data.type = 'финцерт/банк';
  } else if (lower.includes('жалоба')) {
    data.type = 'Жалоба';
  } else {
    data.type = 'чб';
  }

  // ──────────── LINE-BY-LINE SCAN ────────────
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    // --- DEADLINE patterns ---
    // "просьба ответить на него до 12.03.2026 12:00"
    // "Просьба предоставить ответ до 16.03.2026 18:00"
    if (!data.deadline && (lineLower.includes('до ') || lineLower.includes('позднее') || lineLower.includes('срок ответа'))) {
      // Try: "до DD.MM.YYYY HH:MM"
      let m = line.match(/до\s+(\d{2}\.\d{2}\.\d{4})\s*(\d{2}:\d{2})?/i);
      if (m) {
        data.deadline = m[2] ? `${m[1]} ${m[2]}` : m[1];
      }
      // Try: "до HH:MM DD.MM.YYYY"
      if (!data.deadline) {
        m = line.match(/до\s+(\d{2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})/i);
        if (m) data.deadline = `${m[2]} ${m[1]}`;
      }
      // Try: "не позднее HH:MM DD.MM.YYYY"
      if (!data.deadline) {
        m = line.match(/позднее\s+(\d{2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})/i);
        if (m) data.deadline = `${m[2]} ${m[1]}`;
      }
      // Try: "срок ответа DD.MM.YYYY"
      if (!data.deadline) {
        m = line.match(/срок\s+ответа\s+(\d{2}\.\d{2}\.\d{4})\s*(\d{2}:\d{2})?/i);
        if (m) data.deadline = m[2] ? `${m[1]} ${m[2]}` : m[1];
      }
    }

    // --- ID заказа: UUID ---
    if (!data.gateTransactionNumber && lineLower.includes('id заказа')) {
      const m = line.match(/ID\s+заказа:?\s*([A-Za-z0-9\-]{8,})/i);
      if (m) data.gateTransactionNumber = m[1];
    }

    // --- ID в платежной системе: UUID ---
    if (lineLower.includes('id в платежной')) {
      const m = line.match(/ID\s+в\s+платежной\s+системе:?\s*([A-Za-z0-9\-]{8,})/i);
      if (m && !data.gateTransactionNumber) data.gateTransactionNumber = m[1];
    }

    // --- арн - 29400475333000048232372 (secondary fallback for transaction number) ---
    if (!data.gateTransactionNumber && lineLower.includes('арн')) {
      const m = line.match(/арн\s*[-:]\s*(\d{6,})/i);
      if (m) data.gateTransactionNumber = m[1];
    }

    // --- Мерч ID - UUID → this IS the transaction number ---
    if (lineLower.includes('мерч id') || lineLower.includes('мерч_id')) {
      const m = line.match(/Мерч\s*ID\s*[-:]\s*([A-Za-z0-9\-]{6,})/i);
      if (m) data.gateTransactionNumber = m[1]; // Overwrites ARN if present
    }

    // --- Standalone number after ФинЦЕРТ / чарджбек по ---
    if (!data.gateTransactionNumber && i > 0) {
      const prevLower = lines[i - 1].toLowerCase();
      if ((prevLower.includes('финцерт') || prevLower.includes('чарджбек')) && /^\d{6,}$/.test(line)) {
        data.gateTransactionNumber = line;
      }
    }

    // --- "чарджбек по 120073157" on same line ---
    if (!data.gateTransactionNumber && lineLower.includes('чарджбек по')) {
      const m = line.match(/чарджбек\s+по\s*\n?\s*(\d{6,})/i);
      if (m) data.gateTransactionNumber = m[1];
    }

    // --- Дата и время: 04.03.2026 19:28 ---
    if (!data.dateMoscow && (lineLower.includes('дата') || lineLower.startsWith('payment date'))) {
      const m = line.match(/(\d{2}\.\d{2}\.\d{4})\s*(\d{2}:\d{2})?/);
      if (m) data.dateMoscow = m[2] ? `${m[1]} ${m[2]}` : m[1];
    }

    // --- Сумма: 299,00 ₽ / сумма - 119.00 RUB ---
    if (!data.price && (lineLower.includes('сумма') || lineLower.includes('amount'))) {
      const m = line.match(/(?:Сумма|Amount):?\s*[-:]?\s*([\d\s.,]+\s*(?:₽|RUB|USD|USDT|EUR|TON|stars)?)/i);
      if (m) data.price = m[1].trim();
    }

    // --- ТСП: https://t.me/yula_vpn_bot ---
    // Only match when "ТСП" is a LABEL (starts line or has colon), not inside running text like "с ТСП через"
    if (lineLower.match(/^тсп\s*:/) || lineLower.match(/^тсп\s+http/)) {
      const m = line.match(/ТСП:?\s*(.+)/i);
      if (m) {
        const val = m[1].trim();
        data.merchantName = val;
        if (/^https?:\/\//.test(val)) data.urlProject = val;
      }
    }

    // --- на точку обслуживания - buystars ---
    if (!data.merchantName && lineLower.includes('точку обслуживания')) {
      const m = line.match(/точку\s+обслуживания\s*[-:]\s*(.+)/i);
      if (m) data.merchantName = m[1].trim();
    }

    // --- Торговое наименование ---
    if (!data.merchantName && lineLower.includes('торговое наименование')) {
      const m = line.match(/торговое\s+наименование:?\s*(.+)/i);
      if (m) data.merchantName = m[1].trim();
    }

    // --- URL anywhere ---
    if (!data.urlProject) {
      const m = line.match(/(https?:\/\/[^\s]+)/);
      if (m) data.urlProject = m[1];
    }

    // --- IP address ---
    if (!data.clientIp && (lineLower.includes('ip') || /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(line))) {
      const m = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      // Exclude dates that look like IPs
      if (m && !m[1].match(/^\d{2}\.\d{2}\.\d{4}/)) data.clientIp = m[1];
    }

    // --- Telegram Stars ---
    if (!data.starCount) {
      const m = line.match(/(\d+)\s*(?:Telegram\s*Stars|stars)/i);
      if (m) data.starCount = m[1];
    }

    // --- Table row: "13.03.2026 11:11  890005969  UUID  2320.00  RUB" ---
    if (!data.gateTransactionNumber) {
      const m = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s+(\d{6,})\s+([A-Za-z0-9\-]{8,})\s+([\d.]+)\s+(RUB|USD|EUR)/i);
      if (m) {
        data.gateTransactionNumber = m[3];
        if (!data.dateMoscow) data.dateMoscow = `${m[1]} ${m[2]}`;
        if (!data.price) data.price = `${m[5]} ${m[6]}`;
      }
    }
  }

  // ──────────── POST-SCAN: EMAIL / LOGIN ────────────
  // "логин dianabaranova5433" or "логин: user123"
  const loginMatch = text.match(/(?:логин|username|user|ник|аккаунт[аеу]?)\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z][a-zA-Z0-9._]{3,})/i);
  if (loginMatch) {
    // Strip trailing punctuation (period, comma, etc.)
    data.telegramName = loginMatch[1].trim().replace(/[.,;:!?]+$/, '');
  }

  // Standalone email anywhere (fallback)
  if (!data.telegramName) {
    const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailMatch) data.telegramName = emailMatch[1];
  }

  // Heuristic: "кабинете dianabaranova5433"
  if (!data.telegramName) {
    const m = text.match(/кабинет[аеу]?\s+([a-zA-Z][a-zA-Z0-9._]{3,}\d+)/i);
    if (m) data.telegramName = m[1];
  }

  // ──────────── DESCRIPTION (Summary) — full context ────────────
  const commentIdx = text.search(/Плательщик|Держатель\s+карты/i);
  if (commentIdx !== -1) {
    data.description = text.substring(commentIdx, commentIdx + 300).replace(/\n/g, ' ').trim();
  } else {
    // Fallback: take first 2 meaningful lines
    const meaningful = lines.filter(l => l.length > 15);
    data.description = meaningful.slice(0, 2).join(' ').substring(0, 200);
  }

  // ──────────── FALLBACK: number on 2nd line after keyword ────────────
  if (!data.gateTransactionNumber) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\d{6,}$/.test(lines[i])) {
        data.gateTransactionNumber = lines[i];
        break;
      }
    }
  }

  // ──────────── DEFAULT DATE ────────────
  if (!data.dateMoscow) {
    const now = new Date();
    data.dateMoscow = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return [data];
}
