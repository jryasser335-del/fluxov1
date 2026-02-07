import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScrapedEvent {
  name: string;
  url: string;
  embedUrl: string;
  sport: string;
  source: string;
  isLive: boolean;
}

// Parse streamed.pk response - looks for watch URLs
function parseStreamedPk(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  
  // Match patterns like: /watch/brooklyn-nets-vs-washington-wizards-2358110
  const watchUrlRegex = /href="(\/watch\/[^"]+)"|href="(https:\/\/streamed\.pk\/watch\/[^"]+)"/g;
  const matches = [...html.matchAll(watchUrlRegex)];
  const seenUrls = new Set<string>();
  
  for (const match of matches) {
    const rawUrl = match[1] || match[2];
    const url = rawUrl.startsWith('/') ? `https://streamed.pk${rawUrl}` : rawUrl;
    
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    
    // Extract event name and ID from URL
    const slug = url.split('/watch/')[1] || '';
    const idMatch = slug.match(/-(\d+)$/);
    const eventId = idMatch ? idMatch[1] : '';
    
    // Convert slug to readable name
    const name = slug
      .replace(/-\d+$/, '') // Remove trailing ID
      .replace(/^ppv-/, '') // Remove PPV prefix
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/Vs/g, 'vs');
    
    // Skip if name is too short or generic
    if (name.length < 5) continue;
    
    // Detect sport from URL patterns
    let sport = 'Sports';
    const lowerSlug = slug.toLowerCase();
    if (lowerSlug.includes('basketball') || lowerSlug.includes('nba') || lowerSlug.includes('ncaab') || 
        lowerSlug.includes('lakers') || lowerSlug.includes('celtics') || lowerSlug.includes('warriors')) {
      sport = 'Basketball';
    } else if (lowerSlug.includes('football') || lowerSlug.includes('soccer') || lowerSlug.includes('premier') || 
               lowerSlug.includes('laliga') || lowerSlug.includes('serie-a') || lowerSlug.includes('bundesliga')) {
      sport = 'Soccer';
    } else if (lowerSlug.includes('nfl') || lowerSlug.includes('american-football') || 
               lowerSlug.includes('patriots') || lowerSlug.includes('chiefs')) {
      sport = 'Football';
    } else if (lowerSlug.includes('ufc') || lowerSlug.includes('boxing') || lowerSlug.includes('fight') || 
               lowerSlug.includes('glory') || lowerSlug.includes('pfl')) {
      sport = 'MMA/Boxing';
    } else if (lowerSlug.includes('hockey') || lowerSlug.includes('nhl')) {
      sport = 'Hockey';
    }
    
    // Generate embed URL for streamed.pk format
    const embedUrl = url;
    
    events.push({
      name,
      url,
      embedUrl,
      sport,
      source: 'streamed.pk',
      isLive: html.toLowerCase().includes('live') && html.includes(slug),
    });
  }
  
  return events;
}

// Parse sportsurge response
function parseSportsurge(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  
  // Match patterns like: /watch-55182-nebraska-cornhuskers-rutgers-scarlet-knights-3
  const watchUrlRegex = /href="(https:\/\/v2\.sportsurge\.net\/watch-[^"]+)"|href="(\/watch-[^"]+)"/g;
  const matches = [...html.matchAll(watchUrlRegex)];
  const seenUrls = new Set<string>();
  
  for (const match of matches) {
    const rawUrl = match[1] || match[2];
    const url = rawUrl.startsWith('/') ? `https://v2.sportsurge.net${rawUrl}` : rawUrl;
    
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    
    // Extract event name from URL
    const slug = url.split('/watch-')[1] || '';
    // Remove the ID prefix and trailing number
    const namePart = slug.replace(/^\d+-/, '').replace(/-\d+$/, '');
    const name = namePart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Skip if name is too short
    if (name.length < 5) continue;
    
    events.push({
      name,
      url,
      embedUrl: url,
      sport: 'Sports',
      source: 'sportsurge',
      isLive: true,
    });
  }
  
  return events;
}

// Normalize team names for matching
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/city|fc|united|sc|cf|athletic|club|sports/g, '');
}

// Find best match for an event - improved matching
function findMatchingScrapedEvent(
  dbEvent: { name: string; team_home: string | null; team_away: string | null },
  scrapedEvents: ScrapedEvent[]
): ScrapedEvent | null {
  const dbHome = normalizeTeamName(dbEvent.team_home || '');
  const dbAway = normalizeTeamName(dbEvent.team_away || '');
  const dbName = normalizeTeamName(dbEvent.name);
  
  // First pass: strict team matching (both teams must match)
  for (const scraped of scrapedEvents) {
    const scrapedName = normalizeTeamName(scraped.name);
    
    if (dbHome && dbAway && dbHome.length > 3 && dbAway.length > 3) {
      // Check if both team name fragments appear
      const homeMatches = scrapedName.includes(dbHome) || dbHome.includes(scrapedName.split('vs')[0]?.trim() || '');
      const awayMatches = scrapedName.includes(dbAway) || dbAway.includes(scrapedName.split('vs')[1]?.trim() || '');
      
      if (homeMatches && awayMatches) {
        return scraped;
      }
      
      // Also try partial matches for team names
      const homeWords = dbHome.split('').join('');
      const awayWords = dbAway.split('').join('');
      if (scrapedName.includes(homeWords.substring(0, 5)) && scrapedName.includes(awayWords.substring(0, 5))) {
        return scraped;
      }
    }
  }
  
  // Second pass: looser matching with significant overlap
  for (const scraped of scrapedEvents) {
    const scrapedName = normalizeTeamName(scraped.name);
    
    // Check for significant name overlap (at least 60% match)
    const overlap = [...dbName].filter(char => scrapedName.includes(char)).length;
    if (overlap > dbName.length * 0.6 && overlap > 5) {
      return scraped;
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting stream scraping...");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch from multiple sources in parallel
    const sources = [
      { url: "https://streamed.pk/", parser: parseStreamedPk },
      { url: "https://v2.sportsurge.net/", parser: parseSportsurge },
    ];
    
    const allScrapedEvents: ScrapedEvent[] = [];
    const sourceErrors: string[] = [];
    
    const fetchPromises = sources.map(async (source) => {
      try {
        console.log(`Fetching from ${source.url}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(source.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Cache-Control": "no-cache",
          },
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const html = await response.text();
          console.log(`Got ${html.length} bytes from ${source.url}`);
          const events = source.parser(html);
          console.log(`Parsed ${events.length} events from ${source.url}`);
          return events;
        } else {
          const errorMsg = `${source.url}: HTTP ${response.status}`;
          console.warn(errorMsg);
          sourceErrors.push(errorMsg);
          return [];
        }
      } catch (error) {
        const errorMsg = `${source.url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        sourceErrors.push(errorMsg);
        return [];
      }
    });
    
    const results = await Promise.all(fetchPromises);
    for (const events of results) {
      allScrapedEvents.push(...events);
    }
    
    console.log(`Total scraped events: ${allScrapedEvents.length}`);
    
    // Get all events from database that are active and upcoming/live
    const { data: dbEvents, error: dbError } = await supabase
      .from("events")
      .select("id, name, team_home, team_away, stream_url, stream_url_2, stream_url_3, is_live")
      .eq("is_active", true)
      .gte("event_date", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    console.log(`Found ${dbEvents?.length || 0} events in database to check`);
    
    // Match and update events
    const updates: { id: string; updates: Record<string, string> }[] = [];
    const matched: { dbEvent: string; scrapedUrl: string }[] = [];
    
    for (const dbEvent of dbEvents || []) {
      const matchedScraped = findMatchingScrapedEvent(dbEvent, allScrapedEvents);
      
      if (matchedScraped) {
        matched.push({ 
          dbEvent: dbEvent.name, 
          scrapedUrl: matchedScraped.embedUrl 
        });
        
        // Determine which URL slot to use
        const eventUpdates: Record<string, string> = {};
        
        // Only update empty slots or add to existing
        if (!dbEvent.stream_url) {
          eventUpdates.stream_url = matchedScraped.embedUrl;
        } else if (!dbEvent.stream_url_2 && 
                   dbEvent.stream_url !== matchedScraped.embedUrl) {
          eventUpdates.stream_url_2 = matchedScraped.embedUrl;
        } else if (!dbEvent.stream_url_3 && 
                   dbEvent.stream_url !== matchedScraped.embedUrl && 
                   dbEvent.stream_url_2 !== matchedScraped.embedUrl) {
          eventUpdates.stream_url_3 = matchedScraped.embedUrl;
        }
        
        if (Object.keys(eventUpdates).length > 0) {
          updates.push({ id: dbEvent.id, updates: eventUpdates });
        }
      }
    }
    
    console.log(`Matched ${matched.length} events, updating ${updates.length}`);
    
    // Apply updates
    let updatedCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("events")
        .update(update.updates)
        .eq("id", update.id);
      
      if (!updateError) {
        updatedCount++;
      } else {
        console.error(`Failed to update event ${update.id}:`, updateError);
      }
    }
    
    const result = {
      success: true,
      scrapedCount: allScrapedEvents.length,
      matchedCount: matched.length,
      updatedCount,
      matched,
      sourceErrors,
      scrapedEvents: allScrapedEvents.slice(0, 30), // Return first 30 for preview
    };
    
    console.log("Scraping completed:", JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
