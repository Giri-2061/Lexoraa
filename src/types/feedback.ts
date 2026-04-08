export interface FeedbackSubmission {
  rating: number;
  message?: string | null;
  platform?: 'web' | 'mobile';
  appVersion?: string;
}

export interface FeedbackRecord {
  id: string;
  user_id: string;
  name: string;
  rating: number;
  message: string | null;
  user_agent: string | null;
  platform: string;
  app_version: string | null;
  created_at: string;
}

export interface FeedbackEligibility {
  eligible: boolean;
  reason?: string;
}

export interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}
