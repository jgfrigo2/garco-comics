import { Volume, ComicPage, Bookmark, CloudConfig, LibraryData } from '../types.ts';

const JSON_URL = 'https://raw.githubusercontent.com/jgfrigo2/apps_data/refs/heads/main/spidey/spidey.json';

const parsePageNumber = (url: string): number => {
  const match = url.match(/[_\-](\d+)\.(jpg|jpeg|png|webp)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
};

export const loadConfig = (): CloudConfig => {
    let apiKey = '';
    try {
        apiKey = (window as any).process?.env?.API_KEY || '';
    } catch (e) {}
    
    return {
        cloudflareWorkerUrl: '', 
        webDavUrl: '',
        webDavUser: '',
        webDavPass: '',
        geminiApiKey: apiKey
    };
};

export const fetchOnlineLibrary = async (): Promise<{ volumes: Volume[], libraryData: LibraryData }> => {
    try {
        const response = await fetch(JSON_URL);
        if (!response.ok) throw new Error("Failed to fetch library data");
        const data = await response.json();

        const volumes: Volume[] = [];
        const categories: any[] = [];
        const volumeAssignments: Record<string, string> = {};

        const items = Array.isArray(data) ? data : [data];

        items.forEach((item: any) => {
            const volPages: ComicPage[] = (item.pages || []).map((pageUrl: string, index: number) => ({
                fileName: pageUrl.split('/').pop() || `page_${index}`,
                url: pageUrl,
                pageNumber: parsePageNumber(pageUrl) || (index + 1)
            })).sort((a: ComicPage, b: ComicPage) => a.pageNumber - b.pageNumber);

            const vol: Volume = {
                id: item.id || `vol_${Math.random().toString(36).substr(2, 9)}`,
                seriesTitle: item.series || item.title || "Unknown Series",
                volumeNumber: item.volume || "One Shot",
                coverUrl: item.coverUrl || (volPages.length > 0 ? volPages[0].url : ''),
                folderPath: 'online',
                pages: volPages
            };
            volumes.push(vol);
        });

        return {
            volumes,
            libraryData: { categories, volumeAssignments }
        };
    } catch (e) {
        console.error("Online sync failed:", e);
        return { volumes: [], libraryData: { categories: [], volumeAssignments: {} } };
    }
};

export const loadBookmarks = (): Record<string, Bookmark> => {
  try {
    const stored = localStorage.getItem('garco_bookmarks');
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    return {};
  }
};

export const saveBookmarkLocal = (volumeId: string, pageIndex: number) => {
  try {
    const bookmarks = loadBookmarks();
    bookmarks[volumeId] = { volumeId, pageIndex, timestamp: Date.now() };
    localStorage.setItem('garco_bookmarks', JSON.stringify(bookmarks));
  } catch (err) {}
};