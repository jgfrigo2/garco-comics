export interface ComicPage {
  fileName: string;
  url: string;
  pageNumber: number;
}

export interface Volume {
  id: string; // This is usually the relative path or a hash
  seriesTitle: string;
  volumeNumber: string; // e.g., "Vol 1", "Annual"
  coverUrl: string;
  folderPath: string;
  pages: ComicPage[];
}

export interface Category {
  id: string;
  name: string;
  parentId?: string; // For subcategories
}

export interface Bookmark {
  volumeId: string;
  pageIndex: number;
  timestamp: number;
}

export interface CloudConfig {
    cloudflareWorkerUrl: string;
    webDavUrl: string;
    webDavUser: string;
    webDavPass: string;
    geminiApiKey: string;
}

export interface LibraryData {
    categories: Category[];
    volumeAssignments: Record<string, string>; // Maps Volume.id -> Category.id
}

export interface AppState {
  isAuthenticated: boolean;
  currentView: 'auth' | 'library' | 'reader' | 'settings';
  activeVolumeId: string | null;
  volumes: Volume[];
  bookmarks: Record<string, Bookmark>; 
  
  // Local Data Management
  fileHandle: any | null; // FileSystemDirectoryHandle
  libraryData: LibraryData;
  selectedCategoryId: string | null; // For filtering
  
  searchQuery: string;
  config: CloudConfig;
}

// Gemini Types
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}