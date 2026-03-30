export interface ArrQueueItem {
  id: number;
  title: string;
  status: string;
  size: number;
  sizeleft: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  trackedDownloadStatus?: string;
  trackedDownloadState?: string;
  downloadClient?: string;
}

export interface ArrQueueResponse {
  totalRecords: number;
  records: ArrQueueItem[];
}

export interface SonarrEpisode {
  id: number;
  seriesId: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  airDateUtc?: string;
  monitored: boolean;
  hasFile: boolean;
}

export interface SonarrSeries {
  id: number;
  title: string;
  monitored: boolean;
  statistics?: { episodeFileCount: number; episodeCount: number; percentOfEpisodes: number };
}

export interface RadarrMovie {
  id: number;
  title: string;
  year: number;
  monitored: boolean;
  hasFile: boolean;
  movieFile?: { quality: { quality: { name: string } } };
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
}

export interface MissingItem {
  id: number;
  appId: string;
  title: string;
  subtitle?: string;
  year?: number;
  monitored: boolean;
  airDate?: string;
}

export interface SeerrRequest {
  id: number;
  type: "movie" | "tv";
  status: number;
  media: { tmdbId: number; tvdbId?: number; status: number };
  requestedBy: { displayName: string };
  createdAt: string;
}

export interface HuntResult {
  app: string;
  runType: "missing" | "upgrade";
  itemsFound: number;
  itemsSearched: number;
  errors: number;
  duration: number;
}
