export interface TeeTime {
  id: number;
  club_id: string;
  cc_name: string;
  date: string;
  teeoff: string;
  course: string | null;
  price: number | null;
  event: string | null;
  scraped_at: string;
}

export interface TeeTimeFilter {
  date: string;
  clubs?: string[];
  timeFrom?: string;
  timeTo?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface ScraperResult {
  clubId: string;
  ccName: string;
  teeTimes: Omit<TeeTime, 'id' | 'scraped_at'>[];
  success: boolean;
  error?: string;
  durationMs: number;
}
