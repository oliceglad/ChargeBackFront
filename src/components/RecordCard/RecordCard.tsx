import React from 'react';
import { X, Lock, ChevronDown, ImagePlus, Copy } from 'lucide-react';
import { ExtractedData } from '../../types';

interface RecordCardProps {
  data: ExtractedData;
  index: number;
  currentIndex: number;
  fraudCount: number;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ExtractedData, value: any) => void;
  onParse: (index: number) => void;
  onRemoveScreenshot: (recordIndex: number, imgIndex: number) => void;
  onCopyFromPrevious: (index: number) => void;
  hasPrevious: boolean;
}

const RecordCard: React.FC<RecordCardProps> = ({
  data,
  index,
  currentIndex,
  fraudCount,
  onRemove,
  onUpdate,
  onParse,
  onRemoveScreenshot,
  onCopyFromPrevious,
  hasPrevious
}) => {
  const isVisible = index === currentIndex;

  if (!isVisible) return null;

  return (
    <div className={`animate-minimalist p-4 sm:p-8 glass border ${fraudCount >= 2 ? 'border-red-500/50 shadow-red-500/10' : 'border-zinc-800'} relative shadow-2xl rounded-xl`}>
      {fraudCount >= 2 && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-pulse">
          <Lock className="w-5 h-5 text-red-500" />
          <div className="text-left">
            <p className="text-red-500 font-bold uppercase text-[10px] tracking-widest">⚠️ Подозрение на фрод</p>
            <p className="text-red-400/80 text-[9px] uppercase tracking-tighter mt-0.5">
              Этот клиент (ID: {data.telegramId || '?'}, IP: {data.clientIp || '?'}) уже создавал {fraudCount} заявок сегодня.
            </p>
          </div>
        </div>
      )}

      <button 
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 text-zinc-600 hover:text-red-500 transition-all hover:rotate-90 z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute top-0 left-0 px-4 py-2 bg-zinc-900/80 border-b border-r border-zinc-800 flex items-center gap-2 rounded-tl-xl rounded-br-xl backdrop-blur-sm">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Тип:</span>
        <select 
          value={data.type || 'чб'}
          onChange={(e) => onUpdate(index, 'type', e.target.value as any)}
          className="bg-transparent text-[10px] text-[#D4FF00] font-bold uppercase tracking-widest outline-none cursor-pointer hover:bg-zinc-800 rounded px-1 transition-colors"
        >
          <option value="чб" className="bg-zinc-900 text-white">ЧБ</option>
          <option value="финцерт/банк" className="bg-zinc-900 text-white">Финцерт</option>
          <option value="Жалоба" className="bg-zinc-900 text-white">Жалоба</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        <div className="space-y-6 animate-minimalist stagger-1">
          <div className="flex flex-col group">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest group-focus-within:text-[#D4FF00] transition-colors">
                Текст сообщения для парсинга
              </label>
              <button 
                onClick={() => onParse(index)}
                className="w-full sm:w-auto mt-2 sm:mt-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black text-[10px] font-bold uppercase rounded transition-all shadow-lg hover:shadow-amber-500/20"
              >
                Парсить Скриптом
              </button>
            </div>
            <textarea
              value={data.comment || data.description || ''}
              onChange={(e) => onUpdate(index, 'comment', e.target.value)}
              rows={4}
              className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-[11px] text-zinc-300 focus:border-[#D4FF00] outline-none transition-all resize-y font-mono"
              placeholder="Вставьте сюда текст сообщения для этой конкретной записи..."
            />
          </div>

          <div className="flex flex-col group animate-minimalist stagger-2">
            <label className="text-[10px] font-bold text-zinc-600 mb-2 uppercase tracking-widest group-focus-within:text-[#D4FF00] transition-colors">
              Описание ситуации (Пойдет в файл)
            </label>
            <textarea
              value={data.description || ''}
              onChange={(e) => onUpdate(index, 'description', e.target.value)}
              rows={3}
              className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-xs text-zinc-300 focus:border-[#D4FF00] outline-none transition-all resize-y"
              placeholder="Краткое описание проблемы пользователя..."
            />
          </div>

          <div className="flex flex-col animate-minimalist stagger-3">
            <label className="text-[10px] font-bold text-zinc-600 mb-2 uppercase tracking-widest">Категория</label>
            <div className="relative">
              <select 
                value={data.categoryOverride || ''}
                onChange={(e) => onUpdate(index, 'categoryOverride', e.target.value)}
                className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 text-zinc-200 p-3 text-sm focus:border-[#D4FF00] outline-none cursor-pointer transition-all"
              >
                <option value="">Выберите категорию...</option>
                <option value="Stars">Telegram Stars</option>
                <option value="Other">Другое (Таблица)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col animate-minimalist stagger-4">
            <label className="text-[10px] font-bold text-zinc-600 mb-2 uppercase tracking-widest">Статус шлюза</label>
            <div className="relative">
              <select 
                value={data.statusOverride || 'Информация передана в шлюз'}
                onChange={(e) => onUpdate(index, 'statusOverride', e.target.value)}
                className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 text-zinc-200 p-3 text-sm focus:border-[#D4FF00] outline-none cursor-pointer transition-all"
              >
                <option value="Информация передана в шлюз">Информация передана в шлюз</option>
                <option value="Оспорен">Оспорен</option>
                <option value="Не оспорен">Не оспорен</option>
                <option value="Неоспариваемый">Неоспариваемый</option>
                <option value="Возврат">Возврат</option>
                <option value="Информация у мерча">Информация у мерча</option>
                <option value="Мискод">Мискод</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 animate-minimalist stagger-5">
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
                onChange={(e) => onUpdate(index, key as keyof ExtractedData, e.target.value)}
                className={`bg-zinc-900/50 border-b ${!value ? 'border-amber-500/30' : 'border-zinc-800'} text-zinc-200 py-2 text-sm focus:border-[#D4FF00] outline-none transition-all`}
                placeholder="---"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 border-t border-zinc-900 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Скриншоты: {data.screenshots?.length || 0}</label>
          <label className="cursor-pointer px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <ImagePlus className="w-4 h-4" /> Добавить скрин
            <input 
              type="file" 
              className="hidden" 
              multiple 
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = reader.result as string;
                    onUpdate(index, 'screenshots', [...(data.screenshots || []), base64]);
                  };
                  reader.readAsDataURL(file);
                });
              }}
            />
          </label>
        </div>

        {data.screenshots && data.screenshots.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {data.screenshots.map((src, imgIndex) => (
              <div key={imgIndex} className="relative group w-24 h-24 sm:w-32 sm:h-32 border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden">
                <img src={src} alt="Screenshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button 
                  onClick={() => onRemoveScreenshot(index, imgIndex)}
                  className="absolute top-1 right-1 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-8 flex flex-wrap gap-3">
        {hasPrevious && (
          <button onClick={() => onCopyFromPrevious(index)} className="w-full sm:w-auto px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-[#D4FF00] text-[10px] font-bold uppercase tracking-widest border border-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2">
            <Copy className="w-3 h-3" /> Копировать из #{index}
          </button>
        )}
      </div>
    </div>
  );
};

export default RecordCard;
