import React from 'react';
import { Settings, X, Lock, Bot } from 'lucide-react';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  googleWebhookUrl: string;
  setGoogleWebhookUrl: (val: string) => void;
  isUnlocked: boolean;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  onUnlock: () => void;
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
  systemPrompt: string;
  setSystemPrompt: (val: string) => void;
  onResetPrompt: () => void;
  fraudHistoryCount: number;
  onClearHistory: () => void;
  onSave: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose,
  googleWebhookUrl,
  setGoogleWebhookUrl,
  isUnlocked,
  passwordInput,
  setPasswordInput,
  onUnlock,
  geminiApiKey,
  setGeminiApiKey,
  systemPrompt,
  setSystemPrompt,
  onResetPrompt,
  fraudHistoryCount,
  onClearHistory,
  onSave
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl glass border border-zinc-800 p-6 sm:p-8 animate-in zoom-in-95 duration-300 shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D4FF00] animate-spin-slow" /> Настройки приложения
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              Google Webhook URL 
              {!googleWebhookUrl && <span className="text-amber-500 text-[8px]">(Обязательно для таблиц)</span>}
            </label>
            <input 
              type="text"
              value={googleWebhookUrl}
              onChange={e => {
                  const val = e.target.value;
                  setGoogleWebhookUrl(val);
                  localStorage.setItem('wata_google_webhook_url', val);
              }}
              placeholder="https://script.google.com/macros/s/..."
              className={`w-full bg-zinc-900 border ${!googleWebhookUrl ? 'border-amber-500/50' : 'border-zinc-800'} p-3 text-xs text-white focus:outline-none focus:border-[#D4FF00]`}
            />
          </div>

          <div className="border-t border-zinc-900 pt-6">
            {!isUnlocked ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Настройки ИИ заблокированы</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="password" 
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onUnlock()}
                    placeholder="Введите Gemini API Key для доступа..." 
                    className="flex-1 bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
                  />
                  <button 
                    onClick={onUnlock}
                    className="px-6 py-3 bg-zinc-800 text-white font-bold text-xs uppercase hover:bg-zinc-700 transition-colors"
                  >
                    Открыть
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#D4FF00] uppercase tracking-widest flex items-center gap-2">
                      <Bot className="w-3 h-3" /> Gemini API Key
                    </label>
                    <input 
                      type="text"
                      value={geminiApiKey}
                      onChange={e => {
                          const val = e.target.value;
                          setGeminiApiKey(val);
                          localStorage.setItem('wata_gemini_api_key', val);
                      }}
                      placeholder="AIza..."
                      className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs text-white focus:outline-none focus:border-[#D4FF00]"
                    />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Системный Промпт</label>
                   <textarea
                     value={systemPrompt}
                     onChange={e => setSystemPrompt(e.target.value)}
                     rows={6}
                     className="w-full bg-zinc-900 border border-zinc-800 p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:border-[#D4FF00] resize-y"
                   />
                   <div className="flex justify-end">
                      <button onClick={onResetPrompt} className="text-[9px] text-zinc-600 hover:text-amber-500 font-bold uppercase tracking-widest transition-colors">
                        ↷ Сбросить промпт
                      </button>
                   </div>
                 </div>
               </div>
             )}
          </div>

          <div className="border-t border-zinc-900 pt-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">База данных фрода</label>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{fraudHistoryCount} записей</span>
            </div>
            <button 
              onClick={onClearHistory}
              className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500/30 font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              Очистить историю
            </button>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={onSave} className="w-full py-4 bg-[#D4FF00] text-black font-bold text-xs uppercase tracking-widest transition-colors">Сохранить настройки</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
