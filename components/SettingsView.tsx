import React, { useEffect, useState } from 'react';
import { QuranResource, TafsirResource } from '../types';
import { fetchAvailableReciters, fetchAvailableTafsirs, fetchAvailableTranslations } from '../services/quranService';
import { IconLoading, IconSettings } from './Icons';

interface SettingsViewProps {
  currentTranslationId: number;
  currentReciterId: number;
  currentTafsirId: number;
  onSave: (translationId: number, reciterId: number, tafsirId: number) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  currentTranslationId, 
  currentReciterId, 
  currentTafsirId,
  onSave 
}) => {
  const [translations, setTranslations] = useState<QuranResource[]>([]);
  const [reciters, setReciters] = useState<QuranResource[]>([]);
  const [tafsirs, setTafsirs] = useState<TafsirResource[]>([]);
  const [loading, setLoading] = useState(true);

  // Local state for form
  const [selectedTrans, setSelectedTrans] = useState(currentTranslationId);
  const [selectedReciter, setSelectedReciter] = useState(currentReciterId);
  const [selectedTafsir, setSelectedTafsir] = useState(currentTafsirId);

  useEffect(() => {
    const loadResources = async () => {
      setLoading(true);
      try {
        const [t, r, taf] = await Promise.all([
            fetchAvailableTranslations(),
            fetchAvailableReciters(),
            fetchAvailableTafsirs()
        ]);
        setTranslations(t);
        setReciters(r);
        setTafsirs(taf.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
          console.error("Failed to load settings resources", e);
      } finally {
          setLoading(false);
      }
    };
    loadResources();
  }, []);

  const handleSave = () => {
    onSave(selectedTrans, selectedReciter, selectedTafsir);
  };

  // Helper to group Tafsirs by Language
  const getGroupedTafsirs = () => {
    const groups: Record<string, TafsirResource[]> = {};
    tafsirs.forEach(t => {
      const lang = t.language_name || 'Other';
      if (!groups[lang]) groups[lang] = [];
      groups[lang].push(t);
    });
    
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        // Priority Languages
        if (a === 'English') return -1;
        if (b === 'English') return 1;
        if (a === 'Arabic') return -1;
        if (b === 'Arabic') return 1;
        return a.localeCompare(b);
    });
    return { groups, sortedKeys };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-hakeem-emerald">
        <IconLoading className="w-10 h-10 mb-4" />
        <p className="font-medium animate-pulse">Retrieving resources...</p>
      </div>
    );
  }

  const { groups: tafsirGroups, sortedKeys: tafsirLangs } = getGroupedTafsirs();

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-hakeem-emerald/10 rounded-full">
            <IconSettings className="w-6 h-6 text-hakeem-emerald" />
        </div>
        <h2 className="text-3xl font-serif text-hakeem-emerald font-bold">Preferences</h2>
      </div>
      
      <div className="space-y-6">
        {/* Card 1: Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-6 pb-2 border-b border-stone-50">Content</h3>
            
            {/* Translation Selector */}
            <div className="mb-6">
            <label className="block text-sm font-bold text-stone-700 mb-2">Translation</label>
            <div className="relative">
                <select 
                    value={selectedTrans}
                    onChange={(e) => setSelectedTrans(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50/50 focus:border-hakeem-emerald focus:ring-2 focus:ring-hakeem-emerald/10 outline-none appearance-none font-medium text-stone-700"
                >
                    {translations.map(t => (
                    <option key={t.id} value={t.id}>
                        {t.language_name} - {t.name}
                    </option>
                    ))}
                </select>
                <div className="absolute right-4 top-4 pointer-events-none text-stone-400">▼</div>
            </div>
            </div>

            {/* Tafsir Selector */}
            <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Tafsir (Commentary)</label>
            <div className="relative">
                <select 
                    value={selectedTafsir}
                    onChange={(e) => setSelectedTafsir(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50/50 focus:border-hakeem-emerald focus:ring-2 focus:ring-hakeem-emerald/10 outline-none appearance-none font-medium text-stone-700"
                >
                    {tafsirLangs.map(lang => (
                        <optgroup key={lang} label={lang}>
                            {tafsirGroups[lang].map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} {t.author_name ? `(${t.author_name})` : ''}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <div className="absolute right-4 top-4 pointer-events-none text-stone-400">▼</div>
            </div>
            <p className="text-xs text-stone-400 mt-2 px-1">
                Commentary displayed when you click "Tafsir" on a verse.
            </p>
            </div>
        </div>

        {/* Card 2: Audio */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
             <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-6 pb-2 border-b border-stone-50">Audio</h3>
             {/* Reciter Selector */}
            <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Reciter</label>
            <div className="relative">
                <select 
                    value={selectedReciter}
                    onChange={(e) => setSelectedReciter(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50/50 focus:border-hakeem-emerald focus:ring-2 focus:ring-hakeem-emerald/10 outline-none appearance-none font-medium text-stone-700"
                >
                    {reciters.map(r => (
                    <option key={r.id} value={r.id}>
                        {r.name} {r.style ? `(${r.style})` : ''}
                    </option>
                    ))}
                </select>
                <div className="absolute right-4 top-4 pointer-events-none text-stone-400">▼</div>
            </div>
            </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 bg-hakeem-emerald text-white font-bold rounded-xl hover:bg-hakeem-emerald/90 transition-all shadow-md active:scale-[0.99] text-lg"
        >
          Save Preferences
        </button>
      </div>

      <div className="text-center text-stone-400 text-xs mt-12 mb-4 opacity-50">
        <p>Hakeem AI v1.2.2</p>
        <p className="mt-1">Powered by Gemini & Quran.com</p>
      </div>
    </div>
  );
};