import { RawAd, SearchParams } from '@/types'

const FB_API_VERSION = 'v19.0'
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`

const AD_FIELDS = [
  'id',
  'page_name',
  'page_id',
  'ad_creative_bodies',
  'ad_creative_link_captions',
  'ad_creative_link_descriptions',
  'ad_creative_link_titles',
  'ad_snapshot_url',
  'currency',
  'funding_entity',
  'spend',
  'impressions',
  'delivery_start_time',
  'delivery_stop_time',
  'publisher_platforms',
].join(',')

export async function fetchAdsFromLibrary(
  params: SearchParams
): Promise<RawAd[]> {
  const { keyword, country = 'US', adType = 'ALL', limit = 100 } = params

  const searchParams = new URLSearchParams({
    search_terms: keyword,
    ad_reached_countries: `["${country}"]`,
    ad_type: adType,
    fields: AD_FIELDS,
    limit: String(Math.min(limit, 100)),
    access_token: process.env.FACEBOOK_ACCESS_TOKEN!,
  })

  const url = `${FB_BASE_URL}/ads_archive?${searchParams.toString()}`
  const response = await fetch(url, { next: { revalidate: 0 } })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Facebook API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  const ads: RawAd[] = []

  // Normalize the response
  for (const ad of data.data || []) {
    ads.push({
      id: ad.id,
      page_name: ad.page_name,
      page_id: ad.page_id,
      ad_creative_body: ad.ad_creative_bodies?.[0] || '',
      ad_creative_link_title: ad.ad_creative_link_titles?.[0] || '',
      ad_creative_link_description: ad.ad_creative_link_descriptions?.[0] || '',
      ad_creative_link_caption: ad.ad_creative_link_captions?.[0] || '',
      ad_snapshot_url: ad.ad_snapshot_url,
      currency: ad.currency,
      funding_entity: ad.funding_entity,
      spend: ad.spend,
      impressions: ad.impressions,
      delivery_start_time: ad.delivery_start_time,
      delivery_stop_time: ad.delivery_stop_time,
      publisher_platforms: ad.publisher_platforms,
    })
  }

  // If there are more pages, fetch them up to the limit
  if (data.paging?.next && ads.length < limit) {
    const nextPageAds = await fetchNextPage(data.paging.next, limit - ads.length)
    ads.push(...nextPageAds)
  }

  return ads
}

async function fetchNextPage(nextUrl: string, remaining: number): Promise<RawAd[]> {
  if (remaining <= 0) return []

  const response = await fetch(nextUrl)
  if (!response.ok) return []

  const data = await response.json()
  const ads: RawAd[] = (data.data || []).slice(0, remaining).map((ad: any) => ({
    id: ad.id,
    page_name: ad.page_name,
    page_id: ad.page_id,
    ad_creative_body: ad.ad_creative_bodies?.[0] || '',
    ad_creative_link_title: ad.ad_creative_link_titles?.[0] || '',
    ad_creative_link_description: ad.ad_creative_link_descriptions?.[0] || '',
    ad_creative_link_caption: ad.ad_creative_link_captions?.[0] || '',
    ad_snapshot_url: ad.ad_snapshot_url,
    currency: ad.currency,
    funding_entity: ad.funding_entity,
    spend: ad.spend,
    impressions: ad.impressions,
    delivery_start_time: ad.delivery_start_time,
    delivery_stop_time: ad.delivery_stop_time,
    publisher_platforms: ad.publisher_platforms,
  }))

  return ads
}