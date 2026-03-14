import React from 'react';
import { Settings, Plus, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ParseMode } from '../../types';

interface ReportHeaderProps {
  showSettings: boolean;
  onToggleSettings: () => void;
  hasWebhook: boolean;
  parseMode: ParseMode;
  onSetParseMode: (mode: ParseMode) => void;
  onAddNewItem: () => void;
  dataCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({
  onToggleSettings,
  hasWebhook,
  parseMode,
  onSetParseMode,
  onAddNewItem,
  dataCount,
  currentIndex,
  onNext,
  onPrev
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={onToggleSettings}
          className="flex items-center gap-2 text-zinc-500 hover:text-[#D4FF00] transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <Settings className={`w-4 h-4 ${!hasWebhook ? 'text-amber-500 animate-pulse' : ''}`} />
          Настройки {!hasWebhook && '(Нужен Вебхук)'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
        <div className="flex w-full sm:w-auto bg-zinc-900/50 p-1 border border-zinc-800 rounded-lg">
          <button 
            onClick={() => onSetParseMode('gemini')}
            className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded ${parseMode === 'gemini' ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/10' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Gemini AI
          </button>
          <button 
            onClick={() => onSetParseMode('script')}
            className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded ${parseMode === 'script' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Скрипт
          </button>
        </div>
        
        {parseMode === 'script' && (
          <button
            onClick={onAddNewItem}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#D4FF00] hover:bg-[#bce600] text-black font-bold uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-[#D4FF00]/10"
          >
            <Plus className="w-4 h-4" /> Добавить запись
          </button>
        )}
      </div>

      {dataCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-zinc-900 pb-4 gap-4">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-3 uppercase tracking-widest">
            <CheckCircle2 className="w-5 h-5 text-[#D4FF00]" />
            Записи: {currentIndex + 1} / {dataCount}
          </h2>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onPrev} 
              disabled={currentIndex === 0}
              className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-all active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={onNext} 
              disabled={currentIndex === dataCount - 1}
              className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-all active:scale-95"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportHeader;
