import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAdsFromLibrary } from '@/lib/facebook/ad-library'
import { analyzeAdsWithClaude } from '@/lib/anthropic/analyze'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyword, country = 'US', adType = 'ALL', limit = 75 } = body

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
    }

    // 1. Create search record
    const { data: search, error: searchError } = await supabase
      .from('searches')
      .insert({
        user_id: user.id,
        keyword: keyword.trim(),
        country,
        ad_type: adType,
        status: 'processing',
      })
      .select()
      .single()

    if (searchError) throw searchError

    // 2. Fetch ads from Facebook
    let ads
    try {
      ads = await fetchAdsFromLibrary({ keyword, country, adType, limit })
    } catch (err: any) {
      await supabase
        .from('searches')
        .update({ status: 'failed' })
        .eq('id', search.id)
      return NextResponse.json({ error: `Facebook API error: ${err.message}` }, { status: 500 })
    }

    // 3. Save raw ads to DB
    if (ads.length > 0) {
      const adRows = ads.map(ad => ({
        search_id: search.id,
        facebook_ad_id: ad.id,
        page_name: ad.page_name,
        page_id: ad.page_id,
        ad_creative_body: ad.ad_creative_body,
        ad_creative_link_caption: ad.ad_creative_link_caption,
        ad_creative_link_description: ad.ad_creative_link_description,
        ad_creative_link_title: ad.ad_creative_link_title,
        ad_snapshot_url: ad.ad_snapshot_url,
        currency: ad.currency,
        funding_entity: ad.funding_entity,
        spend_lower: ad.spend?.lower_bound ? Number(ad.spend.lower_bound) : null,
        spend_upper: ad.spend?.upper_bound ? Number(ad.spend.upper_bound) : null,
        impressions_lower: ad.impressions?.lower_bound ? Number(ad.impressions.lower_bound) : null,
        impressions_upper: ad.impressions?.upper_bound ? Number(ad.impressions.upper_bound) : null,
        publisher_platforms: ad.publisher_platforms,
        raw_data: ad,
      }))

      await supabase.from('ads').insert(adRows)
    }

    // 4. Update search with ad count
    await supabase
      .from('searches')
      .update({ total_ads_found: ads.length })
      .eq('id', search.id)

    // 5. Run Claude analysis
    let analysis
    try {
      analysis = await analyzeAdsWithClaude(keyword, ads)
    } catch (err: any) {
      await supabase
        .from('searches')
        .update({ status: 'failed' })
        .eq('id', search.id)
      return NextResponse.json({ error: `Analysis error: ${err.message}` }, { status: 500 })
    }

    // 6. Save analysis results
    await supabase.from('analysis_results').insert({
      search_id: search.id,
      ...analysis,
    })

    // 7. Mark search complete
    await supabase
      .from('searches')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', search.id)

    return NextResponse.json({
      searchId: search.id,
      adsFound: ads.length,
      analysis,
    })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}