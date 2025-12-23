import React, { useState, useEffect } from 'react';
import { View, HakeemVerse, JournalEntry, DailyAyahState, AppSettings, SearchMode, GeminiVerseSuggestion } from './types';
import { getContextualVerses, getDailyAyahSuggestion } from './services/geminiService';
import { fetchMultipleVerses, fetchVerseDetails, searchQuranText, DEFAULT_TRANSLATION_ID, DEFAULT_RECITER_ID, DEFAULT_TAFSIR_ID } from './services/quranService';
import { VerseCard } from './components/VerseCard';
import { DailyAyahCard } from './components/DailyAyahCard';
import { MushafReader } from './components/MushafReader';
import { SettingsView } from './components/SettingsView';
import { AmbiencePlayer } from './components/AmbiencePlayer';
import { Toast } from './components/Toast';
import { IconHome, IconJournal, IconBook, IconSearch, IconLoading, IconCompass, IconSettings, IconAI } from './components/Icons';

export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  
  // App Settings State - Initialize with Defaults
  const [settings, setSettings] = useState<AppSettings>({
    translationId: DEFAULT_TRANSLATION_ID,
    reciterId: DEFAULT_RECITER_ID,
    tafsirId: DEFAULT_TAFSIR_ID,
    showTafsir: false
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.AI);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HakeemVerse[]>([]);
  
  // Cache Gemini suggestions to allow re-fetching with different settings without burning tokens
  const [lastGeminiSuggestions, setLastGeminiSuggestions] = useState<GeminiVerseSuggestion[]>([]);

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [dailyAyah, setDailyAyah] = useState<HakeemVerse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Initialize: Load Settings & Journal & Daily Ayah
  useEffect(() => {
    // Settings Loading Fix: Safely merge defaults to prevent undefined IDs
    const savedSettings = localStorage.getItem('hakeem_settings');
    let currentSettings = { 
        translationId: DEFAULT_TRANSLATION_ID, 
        reciterId: DEFAULT_RECITER_ID, 
        tafsirId: DEFAULT_TAFSIR_ID,
        showTafsir: false
    };

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge parsed settings with defaults. checks for truthiness or 0 to allow valid IDs.
        currentSettings = {
            translationId: parsed.translationId || DEFAULT_TRANSLATION_ID,
            reciterId: parsed.reciterId || DEFAULT_RECITER_ID,
            // Critical fix: Ensure tafsirId is never null/undefined
            tafsirId: parsed.tafsirId || DEFAULT_TAFSIR_ID,
            showTafsir: parsed.showTafsir ?? false
        };
        setSettings(currentSettings);
      } catch (e) {
        console.error("Settings corrupted, resetting to defaults", e);
      }
    }

    // Journal
    const savedJournal = localStorage.getItem('hakeem_journal');
    if (savedJournal) {
      setJournalEntries(JSON.parse(savedJournal));
    }

    // Daily Ayah Logic
    const loadDailyAyah = async () => {
      const today = new Date().toISOString().split('T')[0];
      const savedDaily = localStorage.getItem('hakeem_daily_ayah');
      
      if (savedDaily) {
        const parsed: DailyAyahState = JSON.parse(savedDaily);
        if (parsed.date === today && parsed.verse) {
          setDailyAyah(parsed.verse);
          return;
        }
      }

      // Fetch new daily ayah
      try {
        const suggestion = await getDailyAyahSuggestion();
        if (suggestion) {
          // Use current settings (or defaults) for daily ayah
          const verse = await fetchVerseDetails(suggestion, currentSettings.translationId, DEFAULT_RECITER_ID);
          if (verse) {
            setDailyAyah(verse);
            localStorage.setItem('hakeem_daily_ayah', JSON.stringify({
              date: today,
              verse: verse
            }));
          }
        }
      } catch (e) {
        console.error("Could not fetch daily ayah");
      }
    };

    loadDailyAyah();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  }

  // Update Settings handler - Refetches data if needed
  const handleSaveSettings = async (translationId: number, reciterId: number, tafsirId: number) => {
    // Ensure we don't save undefined values
    const newSettings = { 
        translationId: translationId || DEFAULT_TRANSLATION_ID, 
        reciterId: reciterId || DEFAULT_RECITER_ID, 
        tafsirId: tafsirId || DEFAULT_TAFSIR_ID,
        showTafsir: settings.showTafsir
    };
    
    setSettings(newSettings);
    localStorage.setItem('hakeem_settings', JSON.stringify(newSettings));
    setCurrentView(View.HOME);

    // Smart Refetch Logic
    if (searchResults.length > 0) {
       setIsSearching(true);
       try {
         if (searchMode === SearchMode.AI && lastGeminiSuggestions.length > 0) {
             const verses = await fetchMultipleVerses(lastGeminiSuggestions, newSettings.translationId, newSettings.reciterId);
             setSearchResults(verses);
         } else if (searchMode === SearchMode.TEXT && searchQuery) {
             // Re-run text search
             const verses = await searchQuranText(searchQuery, newSettings.translationId, newSettings.reciterId);
             setSearchResults(verses);
         }
       } catch (e) {
         console.error("Error refreshing results with new settings", e);
       } finally {
         setIsSearching(false);
       }
    }
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const query = overrideQuery || searchQuery;
    if (!query.trim()) return;
    
    // Update state if override was used (mood chips)
    if (overrideQuery) setSearchQuery(overrideQuery);

    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    setLastGeminiSuggestions([]);

    try {
      if (searchMode === SearchMode.AI) {
        // 1. Get suggestions from Gemini
        const suggestions = await getContextualVerses(query);
        setLastGeminiSuggestions(suggestions);
        
        if (suggestions.length === 0) {
          setError("I couldn't find a direct connection in the Quran for that specific query. Try rephrasing.");
          setIsSearching(false);
          return;
        }

        // 2. Fetch real data from Quran.com using CURRENT SETTINGS
        const verses = await fetchMultipleVerses(suggestions, settings.translationId, settings.reciterId);
        setSearchResults(verses);
      } else {
        // STANDARD TEXT SEARCH
        const verses = await searchQuranText(query, settings.translationId, settings.reciterId);
        if (verses.length === 0) {
           setError("No verses found matching your keyword.");
        }
        setSearchResults(verses);
      }
    } catch (err) {
      setError("Something went wrong while seeking guidance. Please check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const addToJournal = (verse: HakeemVerse) => {
    if (journalEntries.some(e => e.verse.surahNumber === verse.surahNumber && e.verse.ayahNumber === verse.ayahNumber)) {
      triggerToast("Already in your journal");
      return;
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      verse,
      note: "",
      mood: searchQuery || "Daily Reflection",
    };
    
    const updatedJournal = [newEntry, ...journalEntries];
    setJournalEntries(updatedJournal);
    localStorage.setItem('hakeem_journal', JSON.stringify(updatedJournal));
    triggerToast("Saved to Journal");
  };

  const updateJournalNote = (id: string, note: string) => {
    const updatedJournal = journalEntries.map(entry => 
      entry.id === id ? { ...entry, note } : entry
    );
    setJournalEntries(updatedJournal);
    localStorage.setItem('hakeem_journal', JSON.stringify(updatedJournal));
  };

  const deleteJournalEntry = (id: string) => {
    const updatedJournal = journalEntries.filter(entry => entry.id !== id);
    setJournalEntries(updatedJournal);
    localStorage.setItem('hakeem_journal', JSON.stringify(updatedJournal));
  };

  const getSavedKeys = () => {
    return new Set(journalEntries.map(e => `${e.verse.surahNumber}:${e.verse.ayahNumber}`));
  }

  const MoodChip = ({ emoji, label }: { emoji: string, label: string }) => (
    <button 
      onClick={() => handleSearch(undefined, label)}
      className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-stone-200 shadow-sm hover:border-hakeem-emerald hover:text-hakeem-emerald transition-all text-sm font-medium whitespace-nowrap"
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );

  const renderHome = () => (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-hakeem-emerald/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconCompass className="w-8 h-8 text-hakeem-emerald" />
        </div>
        <h1 className="text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-hakeem-emerald to-hakeem-emerald/70 font-bold mb-4">
          Hakeem AI
        </h1>
        <p className="text-stone-600 text-lg mb-8 max-w-md mx-auto">
          Your spiritual GPS. How are you feeling today?
        </p>

        {/* Search Toggle Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-stone-100 p-1 rounded-xl flex items-center">
             <button 
                onClick={() => setSearchMode(SearchMode.AI)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${searchMode === SearchMode.AI ? 'bg-white text-hakeem-emerald shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
             >
                <IconAI className="w-4 h-4" /> Ask AI
             </button>
             <button 
                onClick={() => setSearchMode(SearchMode.TEXT)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${searchMode === SearchMode.TEXT ? 'bg-white text-hakeem-emerald shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
             >
                <IconSearch className="w-4 h-4" /> Text Search
             </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative max-w-lg mx-auto mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchMode === SearchMode.AI ? "Describe your situation or feeling..." : "Search by keyword (e.g., Paradise, Musa)..."}
            className="w-full px-6 py-4 rounded-2xl border-2 border-stone-100 focus:border-hakeem-emerald focus:outline-none focus:ring-4 focus:ring-hakeem-emerald/5 shadow-sm text-stone-800 placeholder-stone-400 bg-white transition-all"
          />
          <button 
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-2 bg-hakeem-emerald text-white p-3 rounded-xl hover:bg-hakeem-emerald/90 transition-all disabled:opacity-50 active:scale-95"
          >
            {isSearching ? <IconLoading className="w-5 h-5" /> : <IconSearch className="w-5 h-5" />}
          </button>
        </form>

        {/* Mood Chips - Only show in AI mode and when not searching */}
        {searchMode === SearchMode.AI && !isSearching && searchResults.length === 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-8 animate-in slide-in-from-bottom-2 duration-500">
            <MoodChip emoji="😟" label="I feel anxious" />
            <MoodChip emoji="💔" label="I feel heartbroken" />
            <MoodChip emoji="✨" label="I need motivation" />
            <MoodChip emoji="🤲" label="I want to be grateful" />
            <MoodChip emoji="🌫️" label="I feel lost" />
          </div>
        )}
      </div>

      {dailyAyah && !isSearching && searchResults.length === 0 && (
        <div className="mb-10 animate-in fade-in duration-700">
          <DailyAyahCard verse={dailyAyah} onJournal={addToJournal} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 text-center border border-red-100 flex items-center justify-center gap-2">
           <span>⚠️</span> {error}
        </div>
      )}

      <div className="space-y-6">
        {searchResults.map((verse) => (
          <VerseCard 
            key={`${verse.surahNumber}:${verse.ayahNumber}`} 
            verse={verse} 
            onJournal={addToJournal}
            isSaved={journalEntries.some(e => e.verse.surahNumber === verse.surahNumber && e.verse.ayahNumber === verse.ayahNumber)}
            tafsirId={settings.tafsirId}
          />
        ))}
      </div>

      {/* Safety Disclaimer */}
      {!isSearching && searchResults.length === 0 && (
        <div className="mt-12 text-center border-t border-stone-200 pt-8 pb-4">
          <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
            <strong className="block text-stone-500 mb-1">Disclaimer</strong>
            This AI is a tool for reflection. For formal rulings, please consult a qualified scholar.
          </p>
        </div>
      )}
    </div>
  );

  const renderJournal = () => (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-hakeem-emerald/10 rounded-full">
            <IconJournal className="w-6 h-6 text-hakeem-emerald" />
        </div>
        <h2 className="text-3xl font-serif text-hakeem-emerald font-bold">Reflection Journal</h2>
      </div>
      
      {journalEntries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
          <IconJournal className="w-12 h-12 text-stone-200 mx-auto mb-4" />
          <p className="text-stone-400 font-medium">Your journal is waiting for your thoughts.</p>
          <button onClick={() => setCurrentView(View.HOME)} className="mt-4 text-hakeem-emerald font-bold text-sm hover:underline">
            Go discover verses
          </button>
        </div>
      ) : (
        journalEntries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 mb-6 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-4">
              <span className="text-xs font-bold text-hakeem-gold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-hakeem-gold"></span>
                {new Date(entry.timestamp).toLocaleDateString()}
              </span>
              <button 
                onClick={() => deleteJournalEntry(entry.id)}
                className="text-stone-400 hover:text-red-500 text-xs transition-colors px-2 py-1 hover:bg-red-50 rounded-md"
              >
                Remove
              </button>
            </div>
            
            <div className="mb-5 opacity-80 pl-4 border-l-2 border-hakeem-emerald/20">
              <p className="font-serif text-stone-700 italic text-sm line-clamp-2">
                "{entry.verse.translation}"
              </p>
              <p className="text-xs text-stone-500 mt-1 font-bold">
                — {entry.verse.surahNameEnglish} {entry.verse.surahNumber}:{entry.verse.ayahNumber}
              </p>
            </div>

            <textarea
              value={entry.note}
              onChange={(e) => updateJournalNote(entry.id, e.target.value)}
              placeholder="Write your reflections here..."
              className="w-full bg-stone-50 p-4 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-hakeem-emerald/20 min-h-[120px] resize-y font-sans border-none"
            />
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans selection:bg-hakeem-emerald/20 selection:text-hakeem-emerald">
      <div className="h-1.5 bg-gradient-to-r from-hakeem-emerald to-hakeem-gold w-full fixed top-0 z-50"></div>

      <main className="pt-6 min-h-[90vh]">
        {currentView === View.HOME && renderHome()}
        {currentView === View.JOURNAL && renderJournal()}
        {currentView === View.MUSHAF && (
          <MushafReader 
            onJournal={addToJournal} 
            savedVerseKeys={getSavedKeys()} 
            tafsirId={settings.tafsirId}
          />
        )}
        {currentView === View.SETTINGS && (
          <SettingsView 
            currentTranslationId={settings.translationId} 
            currentReciterId={settings.reciterId} 
            currentTafsirId={settings.tafsirId}
            onSave={handleSaveSettings} 
          />
        )}
      </main>
      
      {/* Floating Ambience Player */}
      <AmbiencePlayer />

      {/* Toast Notification */}
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-stone-200 pb-safe pt-2 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-40">
        <div className="flex justify-around items-center max-w-md mx-auto h-16">
          <button
            onClick={() => setCurrentView(View.HOME)}
            className={`flex flex-col items-center gap-1.5 w-16 transition-all ${
              currentView === View.HOME ? 'text-hakeem-emerald translate-y-[-2px]' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <IconHome className={`w-6 h-6 ${currentView === View.HOME ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-bold tracking-wide">Home</span>
          </button>
          
          <button
            onClick={() => setCurrentView(View.MUSHAF)}
            className={`flex flex-col items-center gap-1.5 w-16 transition-all ${
              currentView === View.MUSHAF ? 'text-hakeem-emerald translate-y-[-2px]' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <IconBook className={`w-6 h-6 ${currentView === View.MUSHAF ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-bold tracking-wide">Read</span>
          </button>

          <button
            onClick={() => setCurrentView(View.JOURNAL)}
            className={`flex flex-col items-center gap-1.5 w-16 transition-all ${
              currentView === View.JOURNAL ? 'text-hakeem-emerald translate-y-[-2px]' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <IconJournal className={`w-6 h-6 ${currentView === View.JOURNAL ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-bold tracking-wide">Reflect</span>
          </button>

          <button
            onClick={() => setCurrentView(View.SETTINGS)}
            className={`flex flex-col items-center gap-1.5 w-16 transition-all ${
              currentView === View.SETTINGS ? 'text-hakeem-emerald translate-y-[-2px]' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <IconSettings className={`w-6 h-6 ${currentView === View.SETTINGS ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-bold tracking-wide">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}