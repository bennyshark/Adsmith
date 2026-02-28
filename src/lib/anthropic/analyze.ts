import Anthropic from '@anthropic-ai/sdk'
import { RawAd, AnalysisResult } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

function buildAdSummary(ads: RawAd[]): string {
  return ads
    .filter(ad => ad.ad_creative_body || ad.ad_creative_link_title)
    .map((ad, i) => {
      const parts = []
      if (ad.ad_creative_link_title) parts.push(`HEADLINE: ${ad.ad_creative_link_title}`)
      if (ad.ad_creative_body) parts.push(`BODY: ${ad.ad_creative_body}`)
      if (ad.ad_creative_link_description) parts.push(`DESC: ${ad.ad_creative_link_description}`)
      if (ad.page_name) parts.push(`BRAND: ${ad.page_name}`)
      return `--- AD ${i + 1} ---\n${parts.join('\n')}`
    })
    .join('\n\n')
}

const ANALYSIS_PROMPT = (keyword: string, adText: string, totalAds: number) => `
You are an expert direct response copywriter and media buying analyst.

I'm going to give you ${totalAds} real, currently running Facebook ads for the keyword: "${keyword}".

Analyze ALL of them and return a JSON object with EXACTLY this structure (no markdown, no backticks, pure JSON):

{
  "top_hooks": [
    {
      "hook": "Hook description (e.g. 'Problem-agitation opener')",
      "frequency": 12,
      "examples": ["Actual example from ads", "Another example"]
    }
  ],
  "hook_formulas": [
    { "formula": "Are you [PROBLEM]? Try [SOLUTION]", "count": 8 }
  ],
  "emotional_triggers": [
    { "trigger": "Fear of missing out", "intensity": "high", "count": 23 },
    { "trigger": "Social proof", "intensity": "medium", "count": 15 }
  ],
  "dominant_emotion": "Fear",
  "offer_types": [
    { "type": "Free trial", "percentage": 42 },
    { "type": "Discount with urgency", "percentage": 31 }
  ],
  "price_anchoring_tactics": ["Cross-through original price", "Compare to daily coffee cost"],
  "guarantee_types": ["30-day money back", "Results guaranteed or free"],
  "cta_patterns": [
    { "cta": "Shop Now", "count": 34 },
    { "cta": "Learn More", "count": 21 }
  ],
  "market_saturation": "high",
  "competition_level": "Very competitive - 80+ active advertisers",
  "trending_angles": ["Before/after transformation", "Doctor-endorsed claims"],
  "avoid_angles": ["Generic benefit claims", "Price-only ads"],
  "ai_verdict": "This market is selling heavily on fear and transformation. The dominant pattern is problem-agitation-solution with aggressive social proof. The opportunity is in the premium positioning angle — almost no advertiser is targeting buyers who want quality over cheap. A 'boutique' or 'craft' positioning could own uncontested territory.",
  "opportunity_score": 7,
  "recommended_angle": "Premium positioning with quality story — avoid the price war entirely",
  "ads_analyzed": ${totalAds}
}

Here are the ads:

${adText}

Return ONLY the JSON. No explanation, no preamble, no backticks.
`

export async function analyzeAdsWithClaude(
  keyword: string,
  ads: RawAd[]
): Promise<AnalysisResult> {
  const adsWithContent = ads.filter(
    ad => ad.ad_creative_body || ad.ad_creative_link_title
  )

  if (adsWithContent.length === 0) {
    throw new Error('No ads with content found to analyze')
  }

  const adSummary = buildAdSummary(adsWithContent)

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: ANALYSIS_PROMPT(keyword, adSummary, adsWithContent.length),
      },
    ],
  })

  const responseText = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('')

  // Clean and parse JSON
  const cleaned = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  try {
    const result = JSON.parse(cleaned) as AnalysisResult
    return result
  } catch (e) {
    throw new Error(`Failed to parse Claude response: ${responseText.slice(0, 200)}`)
  }
}