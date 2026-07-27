export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  name: string;
  apiKey: string;
  apiVerified: boolean;
  preferredMode: string;
  hobbies: string[];
  nature: string;
  favoriteWork: string;
  selectedTheme: string;
  homeLocation: string;
  latitude: number;
  longitude: number;
  locationAccuracy: number;
  locationGiven: boolean;
  locationLater: boolean;
  workingDirectory: string;
  tempDirectory: string;
  scanCompleted: boolean;
  scanProgress: ScanProgress;
  startedAt: number;
  completedAt: number;
}

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'complete' | 'error';
  currentPath: string;
  filesFound: number;
  foldersFound: number;
  percent: number;
  stage: string;
  error?: string;
}

export interface ScanResult {
  drives: DriveInfo[];
  topFolders: FolderInfo[];
  totalFiles: number;
  totalFolders: number;
  scannedAt: number;
}

export interface DriveInfo {
  letter: string;
  label: string;
  totalSize: string;
  freeSpace: string;
  folders: number;
  files: number;
}

export interface FolderInfo {
  path: string;
  name: string;
  files: number;
  folders: number;
  sizeHint: string;
}

export const DEFAULT_ONBOARDING: OnboardingState = {
  completed: false,
  currentStep: 0,
  name: '',
  apiKey: '',
  apiVerified: false,
  preferredMode: 'pro',
  hobbies: [],
  nature: '',
  favoriteWork: '',
  selectedTheme: 'zoya-pro',
  homeLocation: '',
  latitude: 0,
  longitude: 0,
  locationAccuracy: 0,
  locationGiven: false,
  locationLater: false,
  workingDirectory: '',
  tempDirectory: '',
  scanCompleted: false,
  scanProgress: { status: 'idle', currentPath: '', filesFound: 0, foldersFound: 0, percent: 0, stage: '' },
  startedAt: 0,
  completedAt: 0,
};

export const TOTAL_STEPS = 9;
export const STEP_LABELS = [
  'Welcome', 'API Key', 'Preferences', 'AI Provider', 'Theme',
  'Location', 'Directories', 'PC Scan', 'Ready'
];
export const STEP_ICONS = ['👋', '🔑', '🎯', '🧠', '🎨', '📍', '💾', '🔍', '🚀'];
