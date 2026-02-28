export interface SearchParams {
    keyword: string
    country?: string
    adType?: 'ALL' | 'POLITICAL_AND_ISSUE_ADS'
    limit?: number
  }
  
  export interface RawAd {
    id: string
    page_name: string
    page_id: string
    ad_creative_body?: string
    ad_creative_link_title?: string
    ad_creative_link_description?: string
    ad_creative_link_caption?: string
    ad_snapshot_url?: string
    currency?: string
    funding_entity?: string
    spend?: { lower_bound: string; upper_bound: string }
    impressions?: { lower_bound: string; upper_bound: string }
    delivery_start_time?: string
    delivery_stop_time?: string
    publisher_platforms?: string[]
  }
  
  export interface HookPattern {
    hook: string
    frequency: number
    examples: string[]
  }
  
  export interface EmotionalTrigger {
    trigger: string
    intensity: 'low' | 'medium' | 'high'
    count: number
  }
  
  export interface OfferType {
    type: string
    percentage: number
  }
  
  export interface AnalysisResult {
    top_hooks: HookPattern[]
    hook_formulas: { formula: string; count: number }[]
    emotional_triggers: EmotionalTrigger[]
    dominant_emotion: string
    offer_types: OfferType[]
    price_anchoring_tactics: string[]
    guarantee_types: string[]
    cta_patterns: { cta: string; count: number }[]
    market_saturation: 'low' | 'medium' | 'high'
    competition_level: string
    trending_angles: string[]
    avoid_angles: string[]
    ai_verdict: string
    opportunity_score: number
    recommended_angle: string
    ads_analyzed: number
  }
  
  export interface Search {
    id: string
    user_id: string
    keyword: string
    country: string
    ad_type: string
    total_ads_found: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    created_at: string
    completed_at?: string
    analysis_results?: AnalysisResult
  }