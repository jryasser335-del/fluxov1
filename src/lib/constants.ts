export const TMDB_KEY = "92328c13578b65a268efe3419fc0ec92";
export const TMDB_IMG = "https://image.tmdb.org/t/p/w780";
export const MAX_PAGE = 20;

export const CHANNELS = [
  { key: "espn", name: "ESPN", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg", stream: "https://lcrj3.envivoslatam.org/espnpremium/tracks-v1a1/mono.m3u8?ip=108.29.21.29&token=9bd484fe9a08d4e894e065b722a88645e15e62e6-3f-1769964985-1769910985" },
  { key: "espn2", name: "ESPN 2", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg", stream: "" },
  { key: "foxsports", name: "Fox Sports", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Fox_Sports_logo.svg", stream: "https://deportes.ksdjugfsddeports.com:9092/MTA4LjI5LjIxLjI5/8_.m3u8?token=Iaorv6-BVReqDlHaTeNJAA&expires=1769952623" },
  { key: "tnt", name: "TNT Sports", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8b/TNT_Logo_2016.svg", stream: "https://lcrj3.envivoslatam.org/tntsports/tracks-v1a1/mono.m3u8?ip=108.29.21.29&token=78871955623f87352b03d2b0e3ddb3ec96b118b8-59-1769965044-1769911044" },
  { key: "dazn", name: "DAZN", logo: "https://upload.wikimedia.org/wikipedia/commons/6/6c/DAZN_Logo.svg", stream: "" },
  { key: "nbatv", name: "NBA TV", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3f/NBA_TV.svg", stream: "https://amg00556-amg00556c3-firetv-us-6060.playouts.now.amagi.tv/playlist720p.m3u8" },
  { key: "ufcpass", name: "UFC Fight Pass", logo: "https://upload.wikimedia.org/wikipedia/commons/0/0c/UFC_Fight_Pass_logo.svg", stream: "" },
  { key: "univision", name: "Univision", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Univision_2019_logo.svg", stream: "https://streaming-live-fcdn.api.prd.univisionnow.com/wltv/wltv.isml/hls/wltv-audio_eng=128000-video=4000000.m3u8" },
  { key: "telemundo", name: "Telemundo", logo: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Telemundo_logo_2018.svg", stream: "https://dvrfl03.bozztv.com/hondu-telexitos/tracks-v1a1/mono.ts.m3u8" },
];

export const LEAGUE_OPTIONS = [
  // US Sports
  { value: "nba", label: "🏀 NBA" },
  { value: "nfl", label: "🏈 NFL" },
  { value: "mlb", label: "⚾ MLB" },
  { value: "nhl", label: "🏒 NHL" },
  { value: "mls", label: "⚽ MLS" },
  { value: "wnba", label: "🏀 WNBA" },
  { value: "ncaab", label: "🏀 NCAA Basketball" },
  { value: "ncaaf", label: "🏈 NCAA Football" },
  
  // Hockey
  { value: "nhl", label: "🏒 NHL" },
  { value: "khl", label: "🏒 KHL (Rusia)" },
  { value: "shl", label: "🏒 SHL (Suecia)" },
  { value: "ahl", label: "🏒 AHL" },
  
  // European Soccer - Top Leagues
  { value: "eng.1", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League" },
  { value: "esp.1", label: "🇪🇸 LaLiga" },
  { value: "ger.1", label: "🇩🇪 Bundesliga" },
  { value: "ita.1", label: "🇮🇹 Serie A" },
  { value: "fra.1", label: "🇫🇷 Ligue 1" },
  { value: "ned.1", label: "🇳🇱 Eredivisie" },
  { value: "por.1", label: "🇵🇹 Liga Portugal" },
  { value: "sco.1", label: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish Premiership" },
  { value: "bel.1", label: "🇧🇪 Pro League" },
  { value: "tur.1", label: "🇹🇷 Süper Lig" },
  
  // UEFA Competitions
  { value: "uefa.champions", label: "🏆 Champions League" },
  { value: "uefa.europa", label: "🥈 Europa League" },
  { value: "uefa.conference", label: "🥉 Conference League" },
  { value: "uefa.nations", label: "🇪🇺 UEFA Nations League" },
  
  // English Cups
  { value: "eng.fa", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 FA Cup" },
  { value: "eng.league_cup", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Carabao Cup (EFL)" },
  { value: "eng.community_shield", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Community Shield" },
  
  // Spanish Cups
  { value: "esp.copa_del_rey", label: "🇪🇸 Copa del Rey" },
  { value: "esp.super_cup", label: "🇪🇸 Supercopa de España" },
  
  // German Cups
  { value: "ger.dfb_pokal", label: "🇩🇪 DFB-Pokal" },
  { value: "ger.super_cup", label: "🇩🇪 DFL-Supercup" },
  
  // Italian Cups
  { value: "ita.coppa_italia", label: "🇮🇹 Coppa Italia" },
  { value: "ita.super_cup", label: "🇮🇹 Supercoppa Italiana" },
  
  // French Cups
  { value: "fra.coupe_de_france", label: "🇫🇷 Coupe de France" },
  { value: "fra.coupe_de_la_ligue", label: "🇫🇷 Coupe de la Ligue" },
  
  // Americas
  { value: "mex.1", label: "🇲🇽 Liga MX" },
  { value: "mex.cup", label: "🇲🇽 Copa MX" },
  { value: "arg.1", label: "🇦🇷 Liga Argentina" },
  { value: "arg.cup", label: "🇦🇷 Copa Argentina" },
  { value: "bra.1", label: "🇧🇷 Brasileirão" },
  { value: "bra.cup", label: "🇧🇷 Copa do Brasil" },
  { value: "conmebol.libertadores", label: "🏆 Copa Libertadores" },
  { value: "conmebol.sudamericana", label: "🏆 Copa Sudamericana" },
  { value: "concacaf.champions", label: "🏆 Concacaf Champions Cup" },
  
  // International
  { value: "fifa.world", label: "🌍 FIFA World Cup" },
  { value: "fifa.wwc", label: "🌍 FIFA Women's World Cup" },
  { value: "fifa.club_world_cup", label: "🌍 FIFA Club World Cup" },
  { value: "uefa.euro", label: "🇪🇺 UEFA Euro" },
  { value: "conmebol.copa_america", label: "🌎 Copa América" },
  { value: "afc.asian_cup", label: "🌏 AFC Asian Cup" },
  { value: "caf.afcon", label: "🌍 Africa Cup of Nations" },
  
  // Boxing & MMA
  { value: "ufc", label: "🥊 UFC" },
  { value: "boxing", label: "🥊 Boxing" },
  { value: "bellator", label: "🥊 Bellator MMA" },
  { value: "pfl", label: "🥊 PFL" },
  
  // Tennis
  { value: "atp", label: "🎾 ATP Tour" },
  { value: "wta", label: "🎾 WTA Tour" },
  { value: "tennis.grand_slam", label: "🎾 Grand Slam" },
  
  // Motorsports
  { value: "f1", label: "🏎️ Formula 1" },
  { value: "motogp", label: "🏍️ MotoGP" },
  { value: "nascar", label: "🏁 NASCAR" },
  { value: "indycar", label: "🏁 IndyCar" },
  
  // Golf
  { value: "pga", label: "⛳ PGA Tour" },
  { value: "lpga", label: "⛳ LPGA Tour" },
  
  // Other Soccer Leagues
  { value: "eng.2", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship" },
  { value: "eng.3", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 League One" },
  { value: "esp.2", label: "🇪🇸 LaLiga 2" },
  { value: "ger.2", label: "🇩🇪 2. Bundesliga" },
  { value: "ita.2", label: "🇮🇹 Serie B" },
  { value: "fra.2", label: "🇫🇷 Ligue 2" },
  
  // Asian Leagues
  { value: "jpn.1", label: "🇯🇵 J1 League" },
  { value: "kor.1", label: "🇰🇷 K League 1" },
  { value: "chn.1", label: "🇨🇳 Chinese Super League" },
  { value: "sau.1", label: "🇸🇦 Saudi Pro League" },
];
