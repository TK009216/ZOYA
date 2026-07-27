export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
  fetchedAt: number;
}

export interface LinkHistoryEntry {
  url: string;
  title: string;
  visitedAt: number;
  pinned: boolean;
}

export interface BookmarkedLink {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  addedAt: number;
}
