import axios from 'axios';

import { ExtractedData } from '../types';

const SYSTEM_PROMPT = `You are an expert data extraction assistant for chargebacks and FinCert queries. The user will provide one or multiple customer support messages.
Separate the input into individual cases if multiple are provided.

For EACH case, extract the following fields into a JSON array of objects:
- gateTransactionNumber: Extract the exact transaction number/ID
- transactionId: Extract the UUID or other format specifically for transaction ID
- deadline: Extract the date and time requested for the response
- comment: Generate a brief, clear summary of the customer's issue based on the message
- type: Determine if it's 'чб' (chargeback), 'финцерт/банк', or 'Жалоба' (deduce from context)
- merchantName: The name of the merchant, shop, or project involved
- urlProject: Look for URL or project name/ID (e.g., merchant website)
- telegramId: If mentioned
- clientIp: If mentioned
- starCount: 'stars' if related to stars (stellar/rating or specific currency), otherwise just the amount of stars mentioned (e.g., '250')
- telegramName: user or operator name if relevant
- dateMoscow: any mentioned dates of payment or time (keep the time info)
- tonUrl: if Ton URL is mentioned
- price: amount/price if mentioned
- description: full extracted relevant description for FinCert

IMPORTANT: Respond ONLY with a valid JSON array of objects ([{...}, {...}]) matching these fields exactly. Use empty strings for missing data.`;

export async function parseMessageWithGemini(message: string, apiKey: string, customPrompt?: string): Promise<ExtractedData[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: customPrompt || SYSTEM_PROMPT }] },
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    let rawContent = response.data.candidates[0].content.parts[0].text;
    rawContent = rawContent.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '').trim();
    
    // Safety check: sometimes the AI returns a single object instead of an array when there's only one case.
    const result = JSON.parse(rawContent);
    return Array.isArray(result) ? result : [result] as ExtractedData[];
  } catch (err) {
    throw new Error("Failed to parse Gemini response: " + String(err));
  }
}
