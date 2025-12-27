import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Library, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Maximize, 
  Lock,
  RefreshCw,
  X,
  Globe,
  LogOut,
  ZoomIn,
  ZoomOut,
  Menu,
  Minimize2,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { AppState, Volume } from './types.ts';
import { 
    loadBookmarks, 
    saveBookmarkLocal, 
    loadConfig, 
    fetchOnlineLibrary
} from './services/dataService.ts';
import SpideyChat from './components/SpideyChat.tsx';

const APP_TITLE = "Garco Comics";
const PASSWORD = "peter"; 

const App: React.FC = () => {
  const [state, setState] = useState<AppState & { selectedSeries: string | null }>({
    isAuthenticated: false,
    currentView: 'auth',
    activeVolumeId: null,
    volumes: [],
    bookmarks: {},
    fileHandle: null,
    libraryData: { categories: [], volumeAssignments: {} },
    selectedCategoryId: null,
    searchQuery: '',
    config: { cloudflareWorkerUrl: '', webDavUrl: '', webDavUser: '', webDavPass: '', geminiApiKey: '' },
    selectedSeries: null
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedAlpha, setExpandedAlpha] = useState<Record<string, boolean>>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitMode, setFitMode] = useState<'contain' | 'width' | 'height'>('contain');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config = loadConfig();
    const books = loadBookmarks();
    setState(prev => ({ ...prev, bookmarks: books, config: config }));

    const handleFsChange = () => {
      const doc = document as any;
      setIsFullScreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    if (state.isAuthenticated && state.volumes.length === 0) {
      handleSyncOnline();
    }
  }, [state.isAuthenticated]);

  const toggleFullScreen = () => {
    const doc = document as any;
    const element = document.documentElement as any;

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {});
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  const toggleAlpha = (letter: string) => {
    setExpandedAlpha(prev => ({ ...prev, [letter]: !prev[letter] }));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.toLowerCase() === PASSWORD) {
      setState(prev => ({ ...prev, isAuthenticated: true, currentView: 'library' }));
    } else {
      setErrorMsg('Contrasenya incorrecta.');
    }
  };

  const handleSyncOnline = async () => {
    setIsLoadingLibrary(true);
    const result = await fetchOnlineLibrary();
    setState(prev => ({
        ...prev,
        volumes: result.volumes,
        libraryData: result.libraryData
    }));
    setIsLoadingLibrary(false);
  };

  const openVolume = (volumeId: string) => {
    const bookmark = state.bookmarks[volumeId];
    setCurrentPageIndex(bookmark ? bookmark.pageIndex : 0);
    setZoomLevel(1);
    setFitMode('contain');
    setState(prev => ({ ...prev, currentView: 'reader', activeVolumeId: volumeId }));
  };

  const closeReader = () => {
    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    }
    setState(prev => ({ ...prev, currentView: 'library', activeVolumeId: null }));
  };

  const handlePageChange = useCallback((direction: 'next' | 'prev') => {
    setState(prev => {
      const activeVol = prev.volumes.find(v => v.id === prev.activeVolumeId);
      if (!activeVol) return prev;
      let newIndex = currentPageIndex;
      if (direction === 'next' && currentPageIndex < activeVol.pages.length - 1) newIndex++;
      else if (direction === 'prev' && currentPageIndex > 0) newIndex--;

      if (newIndex !== currentPageIndex) {
        setCurrentPageIndex(newIndex);
        if (prev.activeVolumeId) {
          saveBookmarkLocal(prev.activeVolumeId, newIndex);
          return {
            ...prev,
            bookmarks: { ...prev.bookmarks, [prev.activeVolumeId]: { volumeId: prev.activeVolumeId, pageIndex: newIndex, timestamp: Date.now() } }
          };
        }
      }
      return prev;
    });
  }, [currentPageIndex]);

  useEffect(() => {
    if (state.currentView !== 'reader') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd') handlePageChange('next');
      if (e.key === 'ArrowLeft' || e.key === 'a') handlePageChange('prev');
      if (e.key === 'Escape') closeReader();
      if (e.key === 'f') toggleFullScreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.currentView, handlePageChange]);

  const hierarchyByAlpha = useMemo(() => {
    const hierarchy: Record<string, Record<string, Volume[]>> = {};
    const filtered = state.volumes.filter(v => 
      v.seriesTitle.toLowerCase().includes(state.searchQuery.toLowerCase())
    ).sort((a,b) => a.seriesTitle.localeCompare(b.seriesTitle));

    filtered.forEach(vol => {
      const firstChar = vol.seriesTitle.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!hierarchy[letter]) hierarchy[letter] = {};
      if (!hierarchy[letter][vol.seriesTitle]) hierarchy[letter][vol.seriesTitle] = [];
      hierarchy[letter][vol.seriesTitle].push(vol);
    });

    Object.keys(hierarchy).forEach(letter => {
      Object.keys(hierarchy[letter]).forEach(series => {
        hierarchy[letter][series].sort((a, b) => a.volumeNumber.localeCompare(b.volumeNumber));
      });
    });

    return hierarchy;
  }, [state.volumes, state.searchQuery]);

  const sortedLetters = useMemo(() => Object.keys(hierarchyByAlpha).sort((a,b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  }), [hierarchyByAlpha]);

  const currentVolume = useMemo(() => state.volumes.find(v => v.id === state.activeVolumeId), [state.volumes, state.activeVolumeId]);

  const volumesOfSelectedSeries = useMemo(() => {
    if (!state.selectedSeries) return [];
    const allVolumes: Volume[] = [];
    Object.values(hierarchyByAlpha).forEach(letterGroup => {
        if (letterGroup[state.selectedSeries!]) {
            allVolumes.push(...letterGroup[state.selectedSeries!]);
        }
    });
    return allVolumes;
  }, [state.selectedSeries, hierarchyByAlpha]);

  const getImageStyle = () => {
    const styles: React.CSSProperties = {
      transform: `scale(${zoomLevel})`,
      transformOrigin: 'center center',
      transition: 'transform 0.1s linear',
      display: 'block',
      margin: '0 auto',
    };

    if (fitMode === 'contain') {
      styles.maxHeight = '100%';
      styles.maxWidth = '100%';
      styles.objectFit = 'contain';
    } else if (fitMode === 'width') {
      styles.width = '100%';
      styles.height = 'auto';
    } else if (fitMode === 'height') {
      styles.height = '100dvh';
      styles.width = 'auto';
      styles.maxWidth = 'none';
    }

    return styles;
  };

  if (!state.isAuthenticated) {
    return (
      <div className="flex-1 bg-spidey-black flex items-center justify-center p-4 relative overflow-hidden bg-spider-web safe-top safe-bottom">
        <div className="bg-white rounded-tr-3xl rounded-bl-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full border-4 border-black relative z-10 transform -rotate-1">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-spidey-red rounded-full flex items-center justify-center mb-4 shadow-lg border-4 border-black text-white">
              <Lock size={32} />
            </div>
            <h1 className="text-4xl font-comic text-spidey-blue mb-2 text-center tracking-wider uppercase">{APP_TITLE}</h1>
            <p className="text-gray-500 text-center font-sans font-bold uppercase tracking-tighter">Accés Restringit</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 border-4 border-gray-200 focus:border-spidey-red focus:outline-none transition-colors font-bold text-lg"
              placeholder="Contrasenya..."
              autoComplete="current-password"
            />
            {errorMsg && <p className="text-spidey-red text-sm font-bold bg-red-50 p-2 border-2 border-red-100">{errorMsg}</p>}
            <button type="submit" className="w-full bg-spidey-blue hover:bg-spidey-darkBlue text-white font-comic text-xl py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">ACCEDIR</button>
          </form>
        </div>
      </div>
    );
  }

  if (state.currentView === 'reader' && currentVolume) {
    const totalPages = currentVolume.pages.length;
    return (
      <div className="h-full w-screen bg-black flex flex-col overflow-hidden fixed inset-0 z-[100]">
        <div className="h-14 bg-spidey-black/95 border-b border-gray-800 flex items-center justify-between px-4 text-white shrink-0 z-20 shadow-lg backdrop-blur safe-top">
            <button onClick={closeReader} className="flex items-center gap-1 hover:text-spidey-red transition-colors font-bold uppercase text-xs tracking-tight">
                <ChevronLeft size={24} /> <span>Tanca</span>
            </button>
            <div className="text-[10px] md:text-sm font-bold text-gray-300 truncate max-w-[40%] text-center px-2">
                <div className="truncate uppercase">{currentVolume.seriesTitle}</div>
                <div className="text-[9px] text-gray-500">{currentVolume.volumeNumber}</div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
                <span className="bg-spidey-red/20 px-2 py-1 rounded border border-spidey-red/50">{currentPageIndex + 1}/{totalPages}</span>
                <button onClick={toggleFullScreen} className="p-2 hover:bg-white/10 rounded-full">
                  {isFullScreen ? <Minimize2 size={20} /> : <Maximize size={20} />}
                </button>
            </div>
        </div>
        <div ref={readerContainerRef} className={`flex-1 relative overflow-auto scrollbar-hide flex flex-col items-center bg-zinc-900 ${fitMode === 'height' ? 'justify-start' : 'justify-center'}`}>
            <div className="absolute inset-0 z-10 flex">
                <div className="w-1/2 h-full cursor-w-resize" onClick={() => handlePageChange('prev')}></div>
                <div className="w-1/2 h-full cursor-e-resize" onClick={() => handlePageChange('next')}></div>
            </div>
            <img src={currentVolume.pages[currentPageIndex]?.url} style={getImageStyle()} className="pointer-events-none transition-all" alt={`Page ${currentPageIndex + 1}`} />
        </div>
        <div className="bg-spidey-black/95 border-t border-gray-800 p-3 z-20 flex flex-col gap-3 shadow-2xl safe-bottom">
            <div className="px-4">
               <input type="range" min="0" max={totalPages - 1} value={currentPageIndex} onChange={(e) => setCurrentPageIndex(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-spidey-red" />
            </div>
            <div className="flex justify-between items-center px-2">
              <div className="flex gap-2">
                <button onClick={() => setFitMode('contain')} className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${fitMode === 'contain' ? 'bg-spidey-blue border-white text-white' : 'border-gray-700 text-gray-500'}`}>CONTAIN</button>
                <button onClick={() => setFitMode('width')} className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${fitMode === 'width' ? 'bg-spidey-blue border-white text-white' : 'border-gray-700 text-gray-500'}`}>WIDTH</button>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setZoomLevel(z => Math.max(z - 0.2, 0.5))} className="p-2 text-gray-400"><ZoomOut size={20} /></button>
                <button onClick={() => setZoomLevel(z => Math.min(z + 0.2, 3))} className="p-2 text-gray-400"><ZoomIn size={20} /></button>
              </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-screen font-sans flex flex-col md:flex-row bg-spidey-black overflow-hidden border-0 md:border-4 md:border-black">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed md:sticky top-0 left-0 h-full w-72 bg-spidey-red text-white z-50 transition-transform duration-300 transform border-r-0 md:border-r-4 md:border-black shadow-2xl flex flex-col shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="absolute inset-0 opacity-10 bg-spider-web pointer-events-none"></div>
        <div className="p-6 border-b-4 border-black bg-spidey-red relative z-10 flex justify-between items-center shrink-0 safe-top">
          <h1 className="text-3xl font-comic tracking-wider text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] -rotate-1">
            {APP_TITLE}
          </h1>
          <button className="md:hidden p-2 bg-black/20 rounded" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
        </div>
        
        <nav className="p-4 space-y-4 relative z-10 flex-1 overflow-y-auto scrollbar-hide bg-spidey-red">
            <button onClick={() => { setState(s => ({...s, selectedSeries: null, searchQuery: ''})); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-black font-bold uppercase text-sm transition-all ${!state.selectedSeries ? 'bg-spidey-blue shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-white/20 hover:bg-black/10'}`}>
                <Library size={18} /> <span>Biblioteca</span>
            </button>
            <button onClick={() => { handleSyncOnline(); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-white/20 bg-transparent font-bold uppercase text-sm hover:bg-black/10 transition-all">
                <Globe size={18} /> <span>Sincronitzar</span>
            </button>

            <div className="pt-4 border-t-2 border-black/20">
                <span className="text-xs font-black uppercase tracking-[0.2em] mb-4 block px-2 opacity-60">Sèries A-Z</span>
                <div className="space-y-1">
                    {sortedLetters.map(letter => (
                        <div key={letter}>
                            <button 
                                onClick={() => toggleAlpha(letter)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold rounded transition-colors ${expandedAlpha[letter] ? 'bg-black/20 text-spidey-yellow' : 'hover:bg-black/10'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="w-6 h-6 flex items-center justify-center bg-black/30 rounded text-xs">{letter}</span>
                                    <span>{letter}</span>
                                </span>
                                {expandedAlpha[letter] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                            </button>
                            {expandedAlpha[letter] && (
                                <div className="ml-4 mt-1 border-l-2 border-white/10 pl-2 space-y-1">
                                    {Object.keys(hierarchyByAlpha[letter]).map(seriesName => (
                                        <button 
                                            key={seriesName}
                                            onClick={() => { setState(s => ({...s, selectedSeries: seriesName})); setIsSidebarOpen(false); }}
                                            className={`w-full text-left px-2 py-1.5 text-[11px] font-bold uppercase tracking-tight flex items-center gap-2 transition-all ${state.selectedSeries === seriesName ? 'text-spidey-yellow' : 'text-white/80 hover:text-white'}`}
                                        >
                                            <span className="truncate">{seriesName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </nav>

        <div className="p-4 border-t-4 border-black bg-black/10 shrink-0 safe-bottom">
             <button onClick={() => setState(prev => ({...prev, isAuthenticated: false}))} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors w-full px-2 font-bold uppercase text-xs">
                <LogOut size={14} /> Tancar Sessió
             </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-comic-dots relative">
        <header className="md:hidden bg-spidey-red text-white p-4 flex justify-between items-center border-b-4 border-black shadow-md shrink-0 z-30 safe-top">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-black/20 rounded-lg"><Menu size={28}/></button>
            <span className="font-comic text-2xl tracking-wider uppercase">{APP_TITLE}</span>
            <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-16 relative scroll-smooth bg-comic-dots safe-bottom">
            {!state.selectedSeries ? (
                <div className="max-w-6xl mx-auto pb-20">
                    <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-4">
                        <div className="w-full">
                            <h3 className="text-4xl lg:text-5xl font-comic text-black uppercase tracking-tight">Col·lecció</h3>
                            <p className="text-gray-500 font-bold text-sm uppercase">Tria una sèrie per explorar</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Cerca..." 
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-black focus:border-spidey-blue outline-none font-bold text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                                value={state.searchQuery} 
                                onChange={(e) => setState(s => ({...s, searchQuery: e.target.value}))} 
                            />
                        </div>
                    </div>

                    {isLoadingLibrary && (
                        <div className="bg-spidey-blue text-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-4 animate-pulse mb-10">
                            <RefreshCw className="animate-spin" size={40}/>
                            <span className="font-comic text-3xl uppercase tracking-widest">Carregant...</span>
                        </div>
                    )}

                    <div className="space-y-12">
                        {sortedLetters.length > 0 ? sortedLetters.map(letter => (
                            <div key={letter} className="relative">
                                <div className="flex items-center gap-6 mb-6">
                                    <span className="w-14 h-14 flex items-center justify-center bg-spidey-red text-white border-4 border-black text-3xl font-comic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl shrink-0">
                                        {letter}
                                    </span>
                                    <div className="h-1 flex-1 bg-black/10 rounded-full"></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {Object.keys(hierarchyByAlpha[letter]).map(seriesName => (
                                        <button 
                                            key={seriesName} 
                                            onClick={() => setState(s => ({...s, selectedSeries: seriesName}))}
                                            className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-2xl hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all flex justify-between items-center group text-left"
                                        >
                                            <div className="flex-1 overflow-hidden pr-2">
                                                <h4 className="font-comic text-2xl text-spidey-blue group-hover:text-spidey-red transition-colors uppercase truncate">{seriesName}</h4>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{hierarchyByAlpha[letter][seriesName].length} Volumes</p>
                                            </div>
                                            <ChevronRight className="text-spidey-red group-hover:translate-x-2 transition-transform" size={24} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-24 bg-white/50 border-4 border-dashed border-black/10 rounded-3xl">
                                <Search size={80} className="mx-auto text-black/10 mb-6" />
                                <p className="font-comic text-3xl text-black/20 uppercase tracking-widest">Biblioteca buida</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto pb-20 animate-in fade-in slide-in-from-right-8 duration-500">
                    <button 
                        onClick={() => setState(s => ({...s, selectedSeries: null}))}
                        className="mb-8 flex items-center gap-3 text-spidey-red font-comic text-3xl uppercase hover:-translate-x-2 transition-transform"
                    >
                        <ArrowLeft size={32} /> Tornar enrere
                    </button>

                    <div className="bg-white border-4 border-black rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 -mr-16 -mt-16 bg-spidey-blue rotate-45"></div>
                        <div className="w-24 h-24 lg:w-32 lg:h-32 bg-spidey-blue rounded-3xl flex items-center justify-center border-4 border-black text-white shrink-0 shadow-lg relative z-10">
                            <Layers size={48} />
                        </div>
                        <div className="text-center md:text-left overflow-hidden relative z-10">
                            <h2 className="text-5xl lg:text-7xl font-comic text-black uppercase tracking-tight leading-none mb-3 truncate">{state.selectedSeries}</h2>
                            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-sm italic">{volumesOfSelectedSeries.length} Edicions disponibles</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                        {volumesOfSelectedSeries.map(vol => (
                            <div 
                                key={vol.id} 
                                onClick={() => openVolume(vol.id)}
                                className="group relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-3 transition-all hover:shadow-[12px_12px_0px_0px_rgba(226,54,54,1)]"
                            >
                                <div className="aspect-[2/3] overflow-hidden bg-gray-200 relative">
                                    <img 
                                        src={vol.coverUrl} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        alt={vol.volumeNumber} 
                                        loading="lazy"
                                    />
                                    {state.bookmarks[vol.id] && (
                                        <div className="absolute top-3 right-3 bg-spidey-yellow text-black border-2 border-black px-3 py-1 font-comic text-sm rotate-3 shadow-md z-10 animate-in bounce-in">
                                            PÀG {state.bookmarks[vol.id].pageIndex + 1}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-white border-t-4 border-black">
                                    <span className="font-comic text-xl text-black uppercase block truncate mb-1">{vol.volumeNumber}</span>
                                    <span className="text-[11px] font-black text-gray-400 uppercase block tracking-tighter">{vol.pages.length} PÀGINES</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {state.volumes.length > 0 && <SpideyChat library={state.volumes} />}
      </main>
    </div>
  );
};

export default App;
