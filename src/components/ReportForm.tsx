import { useState, useEffect } from 'react';
import { parseMessageWithGemini, ExtractedData } from '../lib/gemini';
import { parseMessageWithScripts } from '../lib/scriptedExtractor';
import { generateDocx } from '../lib/docxGenerator';
import { appendToGoogleSheets } from '../lib/sheetsIntegration';
import { Bot, Loader2, Download, Table2, CheckCircle2, ChevronDown, Copy, ImagePlus, X, Settings, Lock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

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

const STATUS_OPTIONS = [
  "Информация передана в шлюз",
  "Оспорен",
  "Не оспорен",
  "Неоспариваемый",
  "Возврат",
  "Информация у мерча",
  "Мискод"
];

export default function ReportForm() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<ExtractedData[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [parseMode, setParseMode] = useState<'gemini' | 'script'>('gemini');
  const [aiAccessPassword, setAiAccessPassword] = useState('');
  
  // Slider State
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem('wata_system_prompt') || DEFAULT_SYSTEM_PROMPT;
  });

  // Sync currentIndex when dataList changes (e.g. after parse or add)
  useEffect(() => {
    if (dataList.length > 0 && currentIndex >= dataList.length) {
        setCurrentIndex(dataList.length - 1);
    }
  }, [dataList]);

  const handleUnlockSettings = () => {
    const correctPassword = import.meta.env.VITE_SETTINGS_PASSWORD || '1234wata';
    if (passwordInput === correctPassword) {
      setIsUnlocked(true);
      setPasswordInput('');
    } else {
      alert('Неверный пароль');
    }
  };

  const saveSystemPrompt = () => {
    localStorage.setItem('wata_system_prompt', systemPrompt);
    alert('Промпт успешно сохранен локально!');
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
      screenshots: []
    };
    const newList = [newItem, ...dataList];
    setDataList(newList);
    setCurrentIndex(0); // Show newest item
  };

  const handleRemoveItem = (index: number) => {
    const newList = [...dataList];
    newList.splice(index, 1);
    setDataList(newList);
    if (currentIndex >= newList.length && newList.length > 0) {
        setCurrentIndex(newList.length - 1);
    }
  };

  const handleParseItem = (index: number) => {
    const item = dataList[index];
    if (!item.description) return;
    
    const parsedResults = parseMessageWithScripts(item.description);
    
    if (parsedResults.length > 0) {
        const parsed = parsedResults[0];

        // Duplicate check
        if (parsed.gateTransactionNumber) {
            const duplicateIdx = dataList.findIndex(
                (d, i) => i !== index && d.gateTransactionNumber === parsed.gateTransactionNumber
            );
            if (duplicateIdx !== -1) {
                const keep = confirm(
                    `⚠️ Дубликат! Запись с номером "${parsed.gateTransactionNumber}" уже существует (карточка #${duplicateIdx + 1}).\n\nОставить дубликат?`
                );
                if (!keep) return;
            }
        }

        const newList = [...dataList];
        newList[index] = { 
            ...parsed, 
            screenshots: item.screenshots,
            categoryOverride: item.categoryOverride,
            statusOverride: item.statusOverride
        };
        setDataList(newList);
    }
  };

  const handleParse = async () => {
    setLoading(true);
    setStatusMsg(parseMode === 'gemini' ? 'Анализ текста (Gemini)...' : 'Скриптовый анализ...');
    try {
      let results: ExtractedData[] = [];
      
      if (parseMode === 'gemini') {
        const correctAiPassword = import.meta.env.VITE_AI_ACCESS_PASSWORD || 'wata2026';
        if (aiAccessPassword !== correctAiPassword) {
            alert('❌ Неверный пароль для доступа к ИИ. Введите пароль в поле под выбором режима.');
            setLoading(false);
            return;
        }

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          alert('Пожалуйста, укажите VITE_GEMINI_API_KEY в .env');
          setLoading(false);
          return;
        }
        results = await parseMessageWithGemini(message, apiKey, systemPrompt);
      } else {
        results = parseMessageWithScripts(message);
      }
      
      results = results.map(r => ({ ...r, screenshots: [] }));
      setDataList(results);
      setCurrentIndex(0);
      setStatusMsg('');
    } catch (err) {
      console.error(err);
      alert('Ошибка извлечения данных. Проверьте консоль.');
      setStatusMsg('');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = (index: number, key: keyof ExtractedData, value: string) => {
    const newList = [...dataList];
    newList[index] = { ...newList[index], [key]: value };
    setDataList(newList);
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const newList = [...dataList];
                const currentImages = newList[index].screenshots || [];
                newList[index] = {
                    ...newList[index],
                    screenshots: [...currentImages, event.target.result as string]
                };
                setDataList(newList);
            }
        };
        reader.readAsDataURL(file);
    });
  };

  const handleRemoveScreenshot = (index: number, imgIndex: number) => {
      const newList = [...dataList];
      const currentImages = [...(newList[index].screenshots || [])];
      currentImages.splice(imgIndex, 1);
      newList[index] = { ...newList[index], screenshots: currentImages };
      setDataList(newList);
  };

  const handleCopyFromPrevious = (index: number) => {
    if (index === 0) return;
    const newList = [...dataList];
    const prevItem = newList[index - 1];
    newList[index] = {
        ...newList[index],
        merchantName: prevItem.merchantName || '',
        urlProject: prevItem.urlProject || '',
        type: prevItem.type || '',
        telegramId: prevItem.telegramId || '',
        telegramName: prevItem.telegramName || ''
    };
    setDataList(newList);
  };

  const handleGenerateDocx = async (type: 'Chargeback' | 'FinCert') => {
    if (dataList.length === 0) return;
    setStatusMsg(`Генерация документов...`);
    
    for (let i = 0; i < dataList.length; i++) {
        try {
            await generateDocx(type, dataList[i]);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            console.error(err);
        }
    }
    setStatusMsg(`Документы (${type}) сгенерированы.`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSendToSheets = async () => {
    const webhookUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK;
    if (!webhookUrl) {
      alert('Пожалуйста, укажите VITE_GOOGLE_SHEETS_WEBHOOK в .env');
      return;
    }
    if (dataList.length === 0) return;
    
    setLoading(true);
    setStatusMsg(`Выгрузка данных...`);
    let successCount = 0;
    
    for (const item of dataList) {
        try {
          await appendToGoogleSheets(webhookUrl, item);
          successCount++;
        } catch (err) {
          console.error(err);
        }
    }
    
    setLoading(false);
    setStatusMsg(`Выгружено: ${successCount} из ${dataList.length}`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const nextCard = () => {
      if (currentIndex < dataList.length - 1) {
          setCurrentIndex(currentIndex + 1);
      }
  };

  const prevCard = () => {
      if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
      }
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-zinc-500 hover:text-[#D4FF00] transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <Settings className="w-4 h-4" />
          Настройки ИИ
        </button>
      </div>

      {showSettings && (
        <div className="bg-[#1A1A1A] border border-zinc-800 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#D4FF00]" /> Системный Промпт (Gemini)
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {!isUnlocked ? (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  autoFocus
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnlockSettings()}
                  placeholder="Введите пароль..." 
                  className="w-full bg-zinc-900 border border-zinc-700 pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
                />
              </div>
              <button 
                onClick={handleUnlockSettings}
                className="px-6 py-3 bg-zinc-900 text-white font-bold text-xs uppercase hover:bg-zinc-800 border border-zinc-700 transition-colors"
              >
                Войти
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <textarea
                 value={systemPrompt}
                 onChange={e => setSystemPrompt(e.target.value)}
                 rows={10}
                 className="w-full bg-zinc-900 border border-zinc-800 p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:border-[#D4FF00] resize-y"
               />
               <div className="flex gap-4">
                 <button onClick={saveSystemPrompt} className="px-6 py-3 bg-[#D4FF00] text-black font-bold text-xs uppercase tracking-widest transition-colors">Сохранить</button>
                 <button onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)} className="px-6 py-3 bg-zinc-900 text-zinc-400 font-bold text-xs uppercase border border-zinc-800 transition-colors">Сброс</button>
               </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
          <div className="flex bg-zinc-900/50 p-1 border border-zinc-800 rounded-lg">
              <button 
                  onClick={() => setParseMode('gemini')}
                  className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded ${parseMode === 'gemini' ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/10' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                  Gemini AI (Пакетный)
              </button>
              <button 
                  onClick={() => setParseMode('script')}
                  className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded ${parseMode === 'script' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                  Скрипт (По одному)
              </button>
          </div>
          
          {parseMode === 'script' && (
              <button
                  onClick={handleAddNewItem}
                  className="flex items-center gap-2 px-6 py-2 bg-[#D4FF00] hover:bg-[#bce600] text-black font-bold uppercase text-[10px] tracking-widest transition-all"
              >
                  <Plus className="w-4 h-4" />
                  Добавить запись
              </button>
          )}
      </div>

      {parseMode === 'gemini' ? (
          <div className="group flex flex-col gap-4">
              <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 p-2 rounded">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-bold uppercase">ИИ Пароль:</span>
                  <input 
                      type="password"
                      value={aiAccessPassword}
                      onChange={(e) => setAiAccessPassword(e.target.value)}
                      placeholder="Пароль для ИИ..."
                      className="flex-1 bg-transparent border-none text-[10px] text-zinc-200 outline-none"
                  />
              </div>
              <textarea
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-zinc-800 rounded-none p-5 text-sm text-zinc-200 focus:border-[#D4FF00] outline-none transition-colors placeholder:text-zinc-700"
                placeholder="Вставьте текст всех сообщений сюда для пакетного анализа ИИ..."
              />
              <button
                  onClick={handleParse}
                  disabled={loading || !message}
                  className="flex justify-center items-center gap-3 py-4 bg-[#D4FF00] hover:bg-[#bce600] disabled:opacity-50 text-black font-bold uppercase text-sm transition-colors"
              >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                  <span>Запустить Пакетный Анализ ИИ</span>
              </button>
          </div>
      ) : (
          dataList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 bg-zinc-900/20 text-center">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                      <Plus className="w-6 h-6 text-zinc-500" />
                  </div>
                  <h3 className="text-zinc-300 font-bold uppercase text-sm mb-2">Нет записей</h3>
                  <p className="text-zinc-500 text-xs max-w-xs">
                      В режиме Скрипта карточки добавляются по одной. Нажмите «Добавить запись» выше.
                  </p>
              </div>
          )
      )}

      {dataList.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-3 uppercase tracking-widest">
                <CheckCircle2 className="w-5 h-5 text-[#D4FF00]" />
                Записи: {currentIndex + 1} / {dataList.length}
            </h2>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={prevCard} 
                    disabled={currentIndex === 0}
                    className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                    onClick={nextCard} 
                    disabled={currentIndex === dataList.length - 1}
                    className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
          </div>

          <div className="relative overflow-hidden">
            {dataList.map((data, index) => (
                <div key={index} className={`${index === currentIndex ? 'block' : 'hidden'} animate-in fade-in slide-in-from-right-4 duration-300 p-8 bg-[#1A1A1A] border border-zinc-800 relative shadow-2xl`}>
                    <button 
                        onClick={() => handleRemoveItem(index)}
                        className="absolute top-4 right-4 p-1 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute top-0 left-0 px-4 py-2 bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-r border-zinc-800">
                        Тип: {data.type || '---'}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                        {/* Left Side: Extraction Logic */}
                        <div className="space-y-6">
                            <div className="flex flex-col group md:col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest group-focus-within:text-[#D4FF00]">
                                        Текст сообщения для парсинга
                                    </label>
                                    <button 
                                        onClick={() => handleParseItem(index)}
                                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold uppercase rounded transition-all"
                                    >
                                        Парсить Скриптом
                                    </button>
                                </div>
                                <textarea
                                    value={data.description || ''}
                                    onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                    rows={5}
                                    className="w-full bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 focus:border-[#D4FF00] outline-none transition-colors resize-y"
                                    placeholder="Вставьте сюда текст сообщения для этой конкретной записи..."
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-zinc-600 mb-2 uppercase tracking-widest">Категория</label>
                                <div className="relative">
                                    <select 
                                        value={data.categoryOverride || ''}
                                        onChange={(e) => handleUpdateItem(index, 'categoryOverride', e.target.value)}
                                        className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-200 p-3 text-sm focus:border-[#D4FF00] outline-none cursor-pointer"
                                    >
                                        <option value="">Выберите категорию...</option>
                                        <option value="Stars">Telegram Stars</option>
                                        <option value="Other">Другое (Таблица)</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-zinc-600 mb-2 uppercase tracking-widest">Статус шлюза</label>
                                <div className="relative">
                                    <select 
                                        value={data.statusOverride || STATUS_OPTIONS[0]}
                                        onChange={(e) => handleUpdateItem(index, 'statusOverride', e.target.value)}
                                        className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-200 p-3 text-sm focus:border-[#D4FF00] outline-none cursor-pointer"
                                    >
                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Data Fields */}
                        <div className="grid grid-cols-1 gap-4">
                            {Object.entries(data).filter(([k]) => {
                                if (['statusOverride', 'categoryOverride', 'screenshots', 'description', 'comment', 'type'].includes(k)) return false;
                                if (data.categoryOverride !== 'Stars') {
                                    if (['starCount', 'tonUrl'].includes(k)) return false;
                                }
                                return true;
                            }).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                    <label className="text-[10px] font-bold text-zinc-600 mb-1 uppercase tracking-widest">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>
                                    <input
                                        type="text"
                                        value={(value as string) || ''}
                                        onChange={(e) => handleUpdateItem(index, key as keyof ExtractedData, e.target.value)}
                                        className={`bg-transparent border-b ${!value ? 'border-amber-500/30' : 'border-zinc-800'} text-zinc-200 py-2 text-sm focus:border-[#D4FF00] outline-none transition-colors`}
                                        placeholder="---"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-zinc-800 space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Скриншоты: {(data.screenshots?.length || 0)}</label>
                            <label className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest text-[#D4FF00]">
                                <ImagePlus className="w-4 h-4" />
                                Загрузить
                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(index, e)} />
                            </label>
                        </div>

                        {data.screenshots && data.screenshots.length > 0 && (
                            <div className="flex flex-wrap gap-4">
                                {data.screenshots.map((src, imgIndex) => (
                                    <div key={imgIndex} className="relative group w-32 h-32 border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden">
                                        <img src={src} alt="Screenshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <button 
                                            onClick={() => handleRemoveScreenshot(index, imgIndex)}
                                            className="absolute top-2 right-2 bg-red-500 w-6 h-6 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 flex gap-4">
                        {index > 0 && (
                            <button onClick={() => handleCopyFromPrevious(index)} className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-[#D4FF00] text-[10px] font-bold uppercase tracking-widest border border-zinc-800 transition-all flex items-center gap-2">
                                <Copy className="w-3 h-3" /> Копировать из #{index}
                            </button>
                        )}
                    </div>
                </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-4">
            <button
              onClick={() => handleGenerateDocx('Chargeback')}
              className="flex-1 flex justify-center items-center gap-2 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase tracking-widest border border-zinc-800 transition-colors"
            >
              <Download className="w-4 h-4" /> DOCX ЧБ
            </button>
            <button
              onClick={() => handleGenerateDocx('FinCert')}
              className="flex-1 flex justify-center items-center gap-2 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase tracking-widest border border-zinc-800 transition-colors"
            >
              <Download className="w-4 h-4" /> DOCX Финцерт
            </button>
            <button
              onClick={handleSendToSheets}
              disabled={loading}
              className="flex-[2] flex items-center justify-center gap-3 py-4 bg-zinc-100 hover:bg-white disabled:opacity-50 text-black font-bold uppercase text-xs tracking-widest transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table2 className="w-4 h-4" />}
              <span>Экспорт в Таблицы ({dataList.length})</span>
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
