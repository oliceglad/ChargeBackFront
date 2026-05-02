import { ExtractedData } from '../types';

export async function appendToGoogleSheets(
  webhookUrl: string,
  data: ExtractedData
) {
  const now = new Date();
  const currentDate = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

  // Columns for the target spreadsheet
  const row = {
    type: data.type,
    merchantName: data.merchantName || '',
    projectUrl: data.urlProject || '',
    transactionNumber: data.gateTransactionNumber || '',
    status: data.statusOverride || 'Информация передана в шлюз',
    date: `'${currentDate}`,
    comment: data.description || data.comment || '',
    deadline: data.deadline ? `'${data.deadline}` : ''
  };

  try {
    // Simple POST to a Google Apps Script Web App
    // using no-cors because Google Apps Script doesn't usually respond with proper CORS headers for JSON POST out-of-the-box
    await fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(row),
    });
    return true;
  } catch (err) {
    console.error("Error appending to sheets:", err);
    throw err;
  }
}
