import React, { useState, useEffect } from 'react';
import { HakeemVerse } from '../types';
import { IconVerified, IconQuote, IconTafsir, IconChevronDown, IconChevronUp, IconLoading, IconAnalysis } from './Icons';
import { AudioPlayer } from './AudioPlayer';
import { fetchTafsir, DEFAULT_TAFSIR_ID } from '../services/quranService';

interface VerseCardProps {
  verse: HakeemVerse;
  onJournal: (verse: HakeemVerse) => void;
  isSaved?: boolean;
  tafsirId?: number;
}

export const VerseCard: React.FC<VerseCardProps> = ({ 
  verse, 
  onJournal, 
  isSaved,
  tafsirId = DEFAULT_TAFSIR_ID 
}) => {
  const [showTafsir, setShowTafsir] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [tafsirContent, setTafsirContent] = useState<string | null>(null);
  const [loadingTafsir, setLoadingTafsir] = useState(false);
  const [tafsirError, setTafsirError] = useState(false);
  
  // Bismillah Logic
  const shouldShowBismillah = verse.ayahNumber === 1 && verse.surahNumber !== 9 && verse.surahNumber !== 1;

  useEffect(() => {
    if (showTafsir) {
        setTafsirContent(null);
        setTafsirError(false);
        loadTafsir();
    }
  }, [tafsirId]);

  const loadTafsir = async () => {
    setLoadingTafsir(true);
    setTafsirError(false);
    
    // Ensure we use the passed ID or fall back to default if 0/null passed
    const idToUse = (!tafsirId || tafsirId === 0) ? DEFAULT_TAFSIR_ID : tafsirId;
    
    const text = await fetchTafsir(`${verse.surahNumber}:${verse.ayahNumber}`, idToUse);
    if (text) {
        setTafsirContent(text);
    } else {
        setTafsirError(true);
    }
    setLoadingTafsir(false);
  };

  const handleToggleTafsir = async () => {
    if (showAnalysis) setShowAnalysis(false); 
    if (showTafsir) {
      setShowTafsir(false);
      return;
    }

    setShowTafsir(true);
    if (!tafsirContent) {
      await loadTafsir();
    }
  };

  const handleToggleAnalysis = () => {
    if (showTafsir) setShowTafsir(false);
    setShowAnalysis(!showAnalysis);
  }

  const isArabicTafsir = tafsirContent && /[\u0600-\u06FF]/.test(tafsirContent.substring(0, 50));

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-stone-100 p-6 mb-6 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] group">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-hakeem-gold/10 to-transparent rounded-bl-full -mr-10 -mt-10 z-0 pointer-events-none opacity-50" />

      {/* Header */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="font-serif text-lg text-hakeem-emerald font-bold flex items-center gap-2">
            {verse.surahNameEnglish}
          </h3>
          <p className="text-xs text-stone-500 font-medium tracking-wide">
            {verse.surahNumber}:{verse.ayahNumber} • {verse.surahNameArabic}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-hakeem-emerald/5 px-2.5 py-1 rounded-full border border-hakeem-emerald/10">
          <IconVerified className="w-3.5 h-3.5 text-hakeem-emerald" />
          <span className="text-[10px] font-bold text-hakeem-emerald uppercase tracking-wider">Verified</span>
        </div>
      </div>

      {/* Bismillah Header */}
      {shouldShowBismillah && (
        <div className="text-center mb-10 opacity-80">
            <span className="font-arabic text-2xl text-stone-600">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</span>
        </div>
      )}

      {/* Arabic Text */}
      <div className="mb-8 text-right px-1" dir="rtl">
        <p className="font-arabic text-4xl leading-[2.4] text-stone-800 antialiased drop-shadow-sm">
          {verse.arabicText}
        </p>
      </div>

      {/* Translation */}
      <div className="mb-8">
        <p className="font-serif text-stone-700 italic leading-relaxed text-[19px]">
          "{verse.translation}"
        </p>
      </div>

      {/* AI Context */}
      {verse.aiExplanation && (
        <div className="bg-gradient-to-r from-hakeem-sand/50 to-transparent p-5 rounded-xl border-l-4 border-hakeem-gold mb-6">
          <h4 className="text-[10px] font-bold text-stone-500 uppercase mb-2 flex items-center gap-2 tracking-widest">
            <IconQuote className="w-3 h-3" /> Context
          </h4>
          <p className="text-sm text-stone-600 leading-relaxed font-medium">
            {verse.aiExplanation}
          </p>
        </div>
      )}

      {/* Actions Row */}
      <div className="flex flex-wrap gap-4 items-center justify-between pt-6 border-t border-stone-100/50">
        <AudioPlayer src={verse.audioUrl} />
        
        <div className="flex gap-2">
          {/* Word Analysis Button */}
          <button
            onClick={handleToggleAnalysis}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              showAnalysis 
                ? 'bg-stone-800 text-white shadow-md' 
                : 'bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-700'
            }`}
          >
            <IconAnalysis className="w-4 h-4" />
            <span className="hidden sm:inline">Analyze</span>
          </button>

          <button
            onClick={handleToggleTafsir}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              showTafsir 
                ? 'bg-stone-800 text-white shadow-md' 
                : 'bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-700'
            }`}
          >
            <IconTafsir className="w-4 h-4" />
            <span className="hidden sm:inline">Tafsir</span>
            {showTafsir ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={() => onJournal(verse)}
            disabled={isSaved}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
              isSaved 
                ? 'bg-stone-100 text-stone-400 cursor-default shadow-none' 
                : 'bg-hakeem-emerald text-white hover:bg-hakeem-emerald/90 hover:shadow-md'
            }`}
          >
            {isSaved ? 'Saved' : 'Reflect'}
          </button>
        </div>
      </div>

      {/* Word-by-Word Analysis Section */}
      {showAnalysis && (
        <div className="mt-6 pt-6 border-t border-stone-100 animate-in slide-in-from-top-4 duration-500">
             <h4 className="text-xs font-bold text-stone-400 uppercase mb-4 flex items-center gap-2 tracking-widest">
                <IconAnalysis className="w-3 h-3" /> Word-by-Word
            </h4>
            <div className="flex flex-wrap flex-row-reverse gap-3 justify-center bg-stone-50/50 p-4 rounded-xl">
                {verse.words.map((word, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all min-w-[60px]">
                        <span className="font-arabic text-xl mb-1 text-stone-800">{word.text_uthmani}</span>
                        <span className="text-[10px] text-hakeem-emerald uppercase font-bold">{word.translation?.text}</span>
                        <span className="text-[9px] text-stone-400 italic">{word.transliteration?.text}</span>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Expanded Tafsir Section */}
      {showTafsir && (
        <div className="mt-6 pt-6 border-t border-stone-100 animate-in slide-in-from-top-4 duration-500">
          <h4 className="text-xs font-bold text-stone-400 uppercase mb-4 flex items-center gap-2 tracking-widest">
             <IconTafsir className="w-3 h-3" /> Commentary
          </h4>
          {loadingTafsir ? (
            <div className="flex flex-col items-center justify-center py-8 text-stone-400 gap-2">
              <IconLoading className="w-6 h-6" /> 
              <span className="text-xs">Fetching insights...</span>
            </div>
          ) : tafsirContent ? (
            <div 
              className={`text-sm text-stone-700 leading-relaxed font-serif prose prose-stone max-w-none prose-p:mb-3 prose-a:text-hakeem-emerald bg-stone-50/50 p-6 rounded-xl border border-stone-100/50 ${isArabicTafsir ? 'font-arabic text-right text-lg' : ''}`}
              dir={isArabicTafsir ? 'rtl' : 'ltr'}
              dangerouslySetInnerHTML={{ __html: tafsirContent }} 
            />
          ) : (
            <div className="bg-stone-50 p-6 rounded-xl text-center">
                <p className="text-sm text-stone-500 italic mb-2">No detailed commentary available for this verse in the selected Tafsir.</p>
                <div className="flex flex-col gap-2 items-center">
                    <p className="text-xs text-stone-400">Try selecting a different Tafsir in Settings.</p>
                    <button 
                        onClick={loadTafsir} 
                        className="text-xs font-bold text-hakeem-emerald hover:underline mt-1"
                    >
                        Retry Fetching
                    </button>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};