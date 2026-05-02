import { useState, useEffect, useCallback } from 'react';
import { parseMessageWithGemini } from '../lib/gemini';
import { parseMessageWithScripts } from '../lib/scriptedExtractor';
import { generateDocx } from '../lib/docxGenerator';
import { appendToGoogleSheets } from '../lib/sheetsIntegration';
import { Bot, Loader2, Download, Send, Plus, Lock } from 'lucide-react';

// Types
import { ExtractedData, ParseMode } from '../types';

// Hooks
import { useFraudDetection } from '../hooks/useFraudDetection';

// Components
import SettingsModal from './SettingsModal/SettingsModal';
import RecordCard from './RecordCard/RecordCard';
import ReportHeader from './ReportHeader/ReportHeader';

const DEFAULT_SYSTEM_PROMPT = `You are an expert data extraction assistant for chargebacks and FinCert queries. The user will provide one or multiple customer support messages.
Separate the input into individual cases if multiple are provided.

For EACH case, extract the following fields into a JSON array of objects:
- gateTransactionNumber: Extract the exact transaction number/ID
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

export default function ReportForm() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<ExtractedData[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [parseMode, setParseMode] = useState<ParseMode>('gemini');
  
  // Settings & Auth
  const [showSettings, setShowSettings] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [googleWebhookUrl, setGoogleWebhookUrl] = useState(() => localStorage.getItem('google_webhook_url') || '');
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT);

  // Fraud Detection Hook
  const { history, addToHistory, getFraudCount, clearHistory } = useFraudDetection();

  // Slider State
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sync currentIndex when dataList changes
  useEffect(() => {
    if (dataList.length > 0 && currentIndex >= dataList.length) {
      setCurrentIndex(dataList.length - 1);
    }
  }, [dataList, currentIndex]);

  const handleUnlockSettings = useCallback(() => {
    const isGeminiKeyFormat = (key: string) => /^AIza[0-9A-Za-z_-]{35,}$/.test(key);

    if (!geminiApiKey) {
      if (isGeminiKeyFormat(passwordInput)) {
        setGeminiApiKey(passwordInput);
        localStorage.setItem('gemini_api_key', passwordInput);
        setIsUnlocked(true);
        setPasswordInput('');
      } else {
        alert('Введите корректный Gemini API Key (начинается с AIza...)');
      }
      return;
    }

    if (passwordInput === geminiApiKey) {
      setIsUnlocked(true);
      setPasswordInput('');
    } else {
      alert('Неверный пароль (используйте ваш Gemini API Key)');
    }
  }, [geminiApiKey, passwordInput]);

  const handleSaveSettings = () => {
    localStorage.setItem('system_prompt', systemPrompt);
    localStorage.setItem('gemini_api_key', geminiApiKey);
    localStorage.setItem('google_webhook_url', googleWebhookUrl);
    alert('Настройки сохранены');
    setShowSettings(false);
  };

  const handleAddNewItem = () => {
    const newItem: ExtractedData = {
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
      description: '',
      comment: '',
      merchantName: '',
      categoryOverride: 'Other',
      statusOverride: 'Информация у мерча',
      isSelected: true,
      screenshots: []
    };
    setDataList(prev => [...prev, newItem]);
    setCurrentIndex(dataList.length);
  };

  const handleRemoveItem = (index: number) => {
    setDataList(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleUpdateItem = (index: number, key: keyof ExtractedData, value: any) => {
    setDataList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleRemoveScreenshot = (recordIndex: number, imgIndex: number) => {
    setDataList(prev => {
      const next = [...prev];
      const screenshots = [...(next[recordIndex].screenshots || [])];
      screenshots.splice(imgIndex, 1);
      next[recordIndex] = { ...next[recordIndex], screenshots };
      return next;
    });
  };

  const handleCopyFromPrevious = (index: number) => {
    if (index === 0) return;
    setDataList(prev => {
      const next = [...prev];
      const prevItem = next[index - 1];
      next[index] = {
        ...next[index],
        merchantName: prevItem.merchantName || '',
        urlProject: prevItem.urlProject || '',
        type: prevItem.type || '',
        telegramId: prevItem.telegramId || '',
        telegramName: prevItem.telegramName || ''
      };
      return next;
    });
  };

  const handleParseItem = (index: number) => {
    const item = dataList[index];
    const sourceText = item.description || item.comment;
    if (!sourceText) return;
    
    const parsedResults = parseMessageWithScripts(sourceText);
    if (parsedResults.length > 0) {
      const parsed = parsedResults[0];
      
      // Duplicate check
      if (parsed.gateTransactionNumber) {
        const isDuplicate = dataList.some((d, i) => i !== index && d.gateTransactionNumber === parsed.gateTransactionNumber);
        if (isDuplicate && !confirm(`⚠️ Дубликат! Номер "${parsed.gateTransactionNumber}" уже существует. Оставить?`)) {
          return;
        }
      }

      setDataList(prev => {
          const next = [...prev];
          next[index] = { ...parsed, screenshots: item.screenshots, categoryOverride: item.categoryOverride, statusOverride: item.statusOverride };
          return next;
      });
    }
  };

  const handleParse = async () => {
    setLoading(true);
    setStatusMsg(parseMode === 'gemini' ? 'Анализ Gemini...' : 'Скриптовый анализ...');
    try {
      let results: ExtractedData[] = [];
      if (parseMode === 'gemini') {
        if (!geminiApiKey) {
          alert('Укажите Gemini API Key');
          setLoading(false);
          return;
        }
        results = await parseMessageWithGemini(message, geminiApiKey, systemPrompt);
      } else {
        results = parseMessageWithScripts(message);
      }
      setDataList(results.map(r => ({ 
        ...r, 
        categoryOverride: r.categoryOverride || 'Other',
        statusOverride: r.statusOverride || 'Информация у мерча',
        isSelected: true,
        screenshots: [] 
      })));
      setCurrentIndex(0);
      setStatusMsg('');
    } catch (err) {
      console.error(err);
      alert('Ошибка парсинга');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReports = async (docType: 'Chargeback' | 'FinCert') => {
    const filtered = dataList.filter(item => {
      if (item.isSelected === false) return false;
      const t = (item.type || '').toLowerCase();
      if (docType === 'Chargeback') return t === 'чб' || t.includes('chargeback') || t === 'жалоба';
      return t.includes('финцерт') || t.includes('банк') || t.includes('fincert');
    });

    if (filtered.length === 0) {
      alert(`Нет записей типа ${docType}`);
      return;
    }

    setStatusMsg(`Генерация ${filtered.length} файлов...`);
    for (const item of filtered) {
      const fraudCount = getFraudCount(item.telegramId || '', item.clientIp || '');
      const finalItem = fraudCount >= 2 
        ? { ...item, description: `${item.description}\n[ВНИМАНИЕ: ФРОД - ${fraudCount + 1}-я ЗАЯВКА]` }
        : item;
      
      await generateDocx(docType, finalItem);
      addToHistory(item.telegramId || '', item.clientIp || '');
      await new Promise(r => setTimeout(r, 300));
    }
    setStatusMsg(`Готово: ${filtered.length} файлов`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSendToSheets = async () => {
    if (!googleWebhookUrl) {
      alert('Укажите Webhook URL');
      return;
    }
    const selectedList = dataList.filter(d => d.isSelected !== false);
    if (selectedList.length === 0) {
      alert('Нет выбранных записей');
      return;
    }

    setLoading(true);
    setStatusMsg('Выгрузка в таблицу...');
    let count = 0;
    for (const item of selectedList) {
      try {
        const fraudCount = getFraudCount(item.telegramId || '', item.clientIp || '');
        const finalItem = fraudCount >= 2 
          ? { ...item, description: `${item.description}\n[ВНИМАНИЕ: ФРОД - ${fraudCount + 1}-я ЗАЯВКА]` }
          : item;
        
        await appendToGoogleSheets(googleWebhookUrl, finalItem);
        addToHistory(item.telegramId || '', item.clientIp || '');
        count++;
      } catch (err) { console.error(err); }
    }
    setLoading(false);
    setStatusMsg(`Выгружено: ${count} из ${selectedList.length}`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  return (
    <div className="space-y-8 relative">
      <ReportHeader 
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        hasWebhook={!!googleWebhookUrl}
        parseMode={parseMode}
        onSetParseMode={setParseMode}
        onAddNewItem={handleAddNewItem}
        dataCount={dataList.length}
        currentIndex={currentIndex}
        onNext={() => currentIndex < dataList.length - 1 && setCurrentIndex(currentIndex + 1)}
        onPrev={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
      />

      <SettingsModal 
        show={showSettings}
        onClose={() => setShowSettings(false)}
        googleWebhookUrl={googleWebhookUrl}
        setGoogleWebhookUrl={setGoogleWebhookUrl}
        isUnlocked={isUnlocked}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        onUnlock={handleUnlockSettings}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        onResetPrompt={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
        fraudHistoryCount={history.length}
        onClearHistory={clearHistory}
        onSave={handleSaveSettings}
      />

      {parseMode === 'gemini' ? (
        <div className="group flex flex-col gap-4">
          <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 p-2 rounded">
            <Lock className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-amber-500 font-bold uppercase">Security: Gemini API Key</span>
            <input 
              type="password"
              value={geminiApiKey}
              onChange={e => {
                setGeminiApiKey(e.target.value);
                localStorage.setItem('gemini_api_key', e.target.value);
              }}
              className="flex-1 bg-transparent border-none text-[10px] text-zinc-200 outline-none"
              placeholder="API Key..."
            />
          </div>
          <textarea
            rows={6}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-zinc-800 p-5 text-sm text-zinc-200 focus:border-[#D4FF00] outline-none transition-colors"
            placeholder="Вставьте текст сообщений для пакетного анализа..."
          />
          <button
            onClick={handleParse}
            disabled={loading || !message}
            className={`flex justify-center items-center gap-3 py-5 bg-[#D4FF00] hover:bg-[#bce600] disabled:opacity-50 text-black font-bold uppercase text-sm transition-all active:scale-[0.98] shadow-xl ${loading ? 'shimmer-wrapper' : ''}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
            <span>{loading ? 'Анализ...' : 'Запустить Пакетный Анализ ИИ'}</span>
          </button>
        </div>
      ) : (
        dataList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 bg-zinc-900/20 text-center">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-zinc-300 font-bold uppercase text-sm mb-2">Нет записей</h3>
          </div>
        )
      )}

      {dataList.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col gap-2 max-h-64">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Список транзакций для скачивания/выгрузки</h3>
              <button 
                onClick={() => {
                  const allSelected = dataList.every(d => d.isSelected ?? true);
                  setDataList(prev => prev.map(d => ({ ...d, isSelected: !allSelected })));
                }}
                className="text-[10px] text-[#D4FF00] hover:underline uppercase tracking-widest"
              >
                {dataList.every(d => d.isSelected ?? true) ? 'Снять все' : 'Выбрать все'}
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-2 pr-1 min-h-0">
              {dataList.map((data, index) => (
                <label key={index} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-zinc-800/50 rounded transition-colors border border-transparent hover:border-zinc-800 shrink-0 overflow-hidden">
                  <input 
                    type="checkbox"
                    checked={data.isSelected ?? true}
                    onChange={(e) => handleUpdateItem(index, 'isSelected', e.target.checked)}
                    className="w-4 h-4 accent-[#D4FF00] cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-zinc-300 font-mono flex-1 truncate">
                    <span className="text-zinc-500 mr-2">#{index + 1}</span>
                    {data.gateTransactionNumber || 'Нет номера'} 
                    {data.transactionId ? ` | ${data.transactionId.substring(0,8)}...` : ''} 
                    <span className="text-zinc-500 ml-2">({data.type})</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentIndex(index);
                    }}
                    className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:text-white shrink-0"
                  >
                    Перейти
                  </button>
                </label>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden">
            {dataList.map((data, index) => (
              <RecordCard 
                key={index}
                data={data}
                index={index}
                currentIndex={currentIndex}
                fraudCount={getFraudCount(data.telegramId || '', data.clientIp || '')}
                onRemove={handleRemoveItem}
                onUpdate={handleUpdateItem}
                onParse={handleParseItem}
                onRemoveScreenshot={handleRemoveScreenshot}
                onCopyFromPrevious={handleCopyFromPrevious}
                hasPrevious={index > 0}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-4">
            <button
              onClick={() => handleGenerateReports('Chargeback')}
              className="flex-1 flex justify-center items-center gap-2 py-4 bg-zinc-900/50 hover:bg-zinc-800 hover:border-[#D4FF00] text-zinc-400 hover:text-white font-bold text-[10px] uppercase tracking-widest border border-zinc-800 transition-all rounded-lg group"
            >
              <Download className="w-4 h-4 group-hover:animate-bounce" /> DOCX ЧБ ({dataList.filter(d => (d.isSelected ?? true) && ((d.type || '').toLowerCase() === 'чб' || (d.type || '').toLowerCase() === 'жалоба')).length})
            </button>
            <button
              onClick={() => handleGenerateReports('FinCert')}
              className="flex-1 flex justify-center items-center gap-2 py-4 bg-zinc-900/50 hover:bg-zinc-800 hover:border-[#D4FF00] text-zinc-400 hover:text-white font-bold text-[10px] uppercase tracking-widest border border-zinc-800 transition-all rounded-lg group"
            >
              <Download className="w-4 h-4 group-hover:animate-bounce" /> DOCX Финцерт ({dataList.filter(d => (d.isSelected ?? true) && (d.type || '').toLowerCase().includes('финцерт')).length})
            </button>
            <button
              onClick={handleSendToSheets}
              disabled={loading}
              className="flex-[2] flex min-h-[56px] items-center justify-center gap-3 py-4 bg-[#D4FF00] hover:bg-[#bce600] disabled:opacity-50 text-black font-bold uppercase text-xs tracking-widest transition-all active:scale-95 rounded-lg shadow-lg shadow-[#D4FF00]/10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Добавить в таблицу ({dataList.length})</span>
            </button>
          </div>

          {statusMsg && (
            <p className="mt-6 text-center text-[10px] font-bold text-[#D4FF00] uppercase tracking-[0.2em] animate-pulse">
              {statusMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
