import { NASA_FIRMS_KEY, AIRNOW_KEY } from '../config.js'
import type { AnthropicTool } from './tools.js'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface GeoPoint {
  latitude: number
  longitude: number
  matchedAddress?: string
}

interface ElevationResult {
  elevation_m: number
  elevation_ft: number
}

interface NOAAWeatherResult {
  temperature_f: number | null
  relative_humidity: number | null
  wind_speed_mph: number | null
  description: string | null
}

interface NASAPowerResult {
  // daily arrays keyed by parameter name
  [param: string]: number[]
}

// ---------------------------------------------------------------------------
// Ray-casting point-in-polygon (shapely replacement)
// Works on GeoJSON coordinate rings [[lon, lat], ...]
// ---------------------------------------------------------------------------

function pointInPolygon(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInMultiPolygon(
  lon: number,
  lat: number,
  coordinates: number[][][][]
): boolean {
  for (const polygon of coordinates) {
    if (pointInPolygon(lon, lat, polygon[0])) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// US Census geocoder (reused from tools.ts logic, returns GeoPoint)
// ---------------------------------------------------------------------------

async function geocode(address: string): Promise<GeoPoint> {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
  url.searchParams.set('address', address)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Geocoding failed (HTTP ${res.status})`)
  const data = (await res.json()) as {
    result?: { addressMatches?: Array<{ coordinates: { x: number; y: number }; matchedAddress: string }> }
  }
  const matches = data.result?.addressMatches ?? []
  if (matches.length === 0) throw new Error(`No geocode match for: ${address}`)
  const m = matches[0]
  return { latitude: m.coordinates.y, longitude: m.coordinates.x, matchedAddress: m.matchedAddress }
}

// ---------------------------------------------------------------------------
// Open Elevation API
// ---------------------------------------------------------------------------

async function fetchElevation(lat: number, lon: number): Promise<ElevationResult> {
  try {
    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { results?: Array<{ elevation: number }> }
    const elev_m = data.results?.[0]?.elevation ?? 0
    return { elevation_m: elev_m, elevation_ft: elev_m * 3.28084 }
  } catch {
    return { elevation_m: 0, elevation_ft: 0 }
  }
}

// ---------------------------------------------------------------------------
// NOAA Weather API (points → stations → latest observation)
// ---------------------------------------------------------------------------

async function fetchNOAAWeather(lat: number, lon: number): Promise<NOAAWeatherResult> {
  const empty: NOAAWeatherResult = { temperature_f: null, relative_humidity: null, wind_speed_mph: null, description: null }
  try {
    const pointRes = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      { headers: { 'User-Agent': 'openseabri/1.0 (contact@openseabri.org)' }, signal: AbortSignal.timeout(8000) }
    )
    if (!pointRes.ok) return empty
    const pointData = (await pointRes.json()) as { properties?: { observationStations?: string } }
    const stationsUrl = pointData.properties?.observationStations
    if (!stationsUrl) return empty

    const stationsRes = await fetch(stationsUrl, {
      headers: { 'User-Agent': 'openseabri/1.0' }, signal: AbortSignal.timeout(8000)
    })
    if (!stationsRes.ok) return empty
    const stationsData = (await stationsRes.json()) as { features?: Array<{ id: string }> }
    const stationId = stationsData.features?.[0]?.id
    if (!stationId) return empty

    const obsRes = await fetch(`${stationId}/observations/latest`, {
      headers: { 'User-Agent': 'openseabri/1.0' }, signal: AbortSignal.timeout(8000)
    })
    if (!obsRes.ok) return empty
    const obsData = (await obsRes.json()) as {
      properties?: {
        temperature?: { value: number | null; unitCode?: string }
        relativeHumidity?: { value: number | null }
        windSpeed?: { value: number | null }
        textDescription?: string
      }
    }
    const props = obsData.properties
    if (!props) return empty

    let temp_f: number | null = null
    if (props.temperature?.value != null) {
      const v = props.temperature.value
      temp_f = props.temperature.unitCode?.includes('degC') || props.temperature.unitCode?.includes('unit:degC')
        ? v * 9 / 5 + 32
        : v
    }
    const wind_ms = props.windSpeed?.value ?? null
    return {
      temperature_f: temp_f,
      relative_humidity: props.relativeHumidity?.value ?? null,
      wind_speed_mph: wind_ms != null ? wind_ms * 2.23694 : null,
      description: props.textDescription ?? null,
    }
  } catch {
    return empty
  }
}

// ---------------------------------------------------------------------------
// NASA POWER API (daily temporal data, up to 366 days per request)
// Returns arrays of daily values per requested parameter, with -999 stripped
// ---------------------------------------------------------------------------

async function fetchNASAPower(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
  params: string[]
): Promise<Record<string, number[]>> {
  try {
    const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point')
    url.searchParams.set('parameters', params.join(','))
    url.searchParams.set('community', 'RE')
    url.searchParams.set('longitude', lon.toString())
    url.searchParams.set('latitude', lat.toString())
    url.searchParams.set('start', startDate)
    url.searchParams.set('end', endDate)
    url.searchParams.set('format', 'JSON')
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { properties?: { parameter?: Record<string, Record<string, number>> } }
    const raw = data.properties?.parameter ?? {}
    const result: Record<string, number[]> = {}
    for (const p of params) {
      const daily = raw[p] ?? {}
      result[p] = Object.values(daily).filter((v) => v !== -999)
    }
    return result
  } catch {
    return Object.fromEntries(params.map((p) => [p, []]))
  }
}

// Build YYYYMMDD string from a Date
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

// Date N years ago
function yearsAgo(n: number): Date {
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d
}

// ---------------------------------------------------------------------------
// US Drought Monitor GeoJSON
// ---------------------------------------------------------------------------

interface DroughtFeature {
  type: string
  geometry: {
    type: string
    coordinates: number[][][][] | number[][][]
  }
  properties: { DM: number }
}

async function fetchDroughtLevel(lat: number, lon: number): Promise<number> {
  // -1 = no drought; 0-4 = D0-D4
  try {
    const res = await fetch(
      'https://droughtmonitor.unl.edu/data/json/usdm_current.json',
      { signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { features?: DroughtFeature[] }
    const features = data.features ?? []
    // Sort descending by DM so we find the worst category first
    features.sort((a, b) => (b.properties.DM ?? -1) - (a.properties.DM ?? -1))
    for (const feat of features) {
      const geom = feat.geometry
      let hit = false
      if (geom.type === 'MultiPolygon') {
        hit = pointInMultiPolygon(lon, lat, geom.coordinates as number[][][][])
      } else if (geom.type === 'Polygon') {
        hit = pointInPolygon(lon, lat, (geom.coordinates as number[][][])[0])
      }
      if (hit) return feat.properties.DM ?? -1
    }
    return -1
  } catch {
    return -1
  }
}

// ---------------------------------------------------------------------------
// NOAA Heat Index (Rothfusz regression, °F / %RH)
// ---------------------------------------------------------------------------

function heatIndex(t: number, r: number): number {
  if (t < 80) return t
  const hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * r -
    0.22475541 * t * r -
    6.83783e-3 * t * t -
    5.481717e-2 * r * r +
    1.22874e-3 * t * t * r +
    8.5282e-4 * t * r * r -
    1.99e-6 * t * t * r * r
  return hi
}

// ---------------------------------------------------------------------------
// Hurricane zone lookup (replaces tropycal HURDAT2)
// Stats are 50-year totals from historical record
// ---------------------------------------------------------------------------

interface HurricaneZoneStats {
  zone: string
  avg_per_year: number
  avg_major_per_year: number
  max_category: number
}

function getHurricaneZone(lat: number, lon: number): HurricaneZoneStats {
  if (lon >= -98 && lon <= -80 && lat >= 24 && lat <= 31) {
    return { zone: 'Gulf Coast', avg_per_year: 2.5, avg_major_per_year: 0.9, max_category: 5 }
  }
  if (lon >= -82 && lon <= -75 && lat >= 24 && lat <= 35) {
    return { zone: 'Atlantic South', avg_per_year: 1.8, avg_major_per_year: 0.64, max_category: 5 }
  }
  if (lon >= -77 && lon <= -65 && lat >= 35 && lat <= 46) {
    return { zone: 'Atlantic Mid', avg_per_year: 0.8, avg_major_per_year: 0.24, max_category: 4 }
  }
  if (lon <= -117 && lat >= 18 && lat <= 30) {
    return { zone: 'Pacific', avg_per_year: 0.3, avg_major_per_year: 0.06, max_category: 3 }
  }
  if (lon >= -161 && lon <= -154 && lat >= 18 && lat <= 23) {
    return { zone: 'Hawaii', avg_per_year: 0.5, avg_major_per_year: 0.16, max_category: 4 }
  }
  return { zone: 'Inland', avg_per_year: 0.2, avg_major_per_year: 0.0, max_category: 1 }
}

// ---------------------------------------------------------------------------
// Coast classification
// ---------------------------------------------------------------------------

type CoastType = 'Gulf' | 'Atlantic' | 'Pacific' | 'GreatLakes' | 'Inland'

function getCoastType(lat: number, lon: number): CoastType {
  if (lon >= -100 && lon <= -80 && lat >= 24 && lat <= 31) return 'Gulf'
  if (lon >= -85 && lon <= -60 && lat >= 24 && lat <= 46) return 'Atlantic'
  if (lon <= -115 && lat >= 32 && lat <= 49) return 'Pacific'
  const glLon = lon >= -93 && lon <= -76
  const glLat = lat >= 41 && lat <= 48
  if (glLon && glLat) return 'GreatLakes'
  return 'Inland'
}

const STORM_SURGE_FT: Record<CoastType, number> = {
  Gulf: 20, Atlantic: 18, Pacific: 12, GreatLakes: 8, Inland: 0,
}

// ---------------------------------------------------------------------------
// NOAA CO-OPS (tide stations and sea level trends)
// ---------------------------------------------------------------------------

async function fetchNearestTideStation(lat: number, lon: number): Promise<string | null> {
  try {
    const url = new URL('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json')
    url.searchParams.set('type', 'tidepredictions')
    url.searchParams.set('units', 'english')
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = (await res.json()) as { stations?: Array<{ id: string; lat: number; lng: number }> }
    const stations = data.stations ?? []
    let nearest: string | null = null
    let minDist = Infinity
    for (const s of stations) {
      const d = Math.hypot(s.lat - lat, s.lng - lon)
      if (d < minDist) { minDist = d; nearest = s.id }
    }
    return nearest
  } catch {
    return null
  }
}

async function fetchSeaLevelTrend(stationId: string): Promise<number | null> {
  // mm/year
  try {
    const res = await fetch(
      `https://api.tidesandcurrents.noaa.gov/dpapi/prod/webapi/product.json?name=Sea+Level+Trends&station_id=${stationId}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { SeaLevelTrends?: Array<{ msl_mm_yr?: number }> }
    return data.SeaLevelTrends?.[0]?.msl_mm_yr ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// USGS stream gauges (inland flood)
// ---------------------------------------------------------------------------

async function fetchStreamGauges(lat: number, lon: number): Promise<number> {
  try {
    const url = new URL('https://waterservices.usgs.gov/nwis/site/')
    url.searchParams.set('format', 'json')
    url.searchParams.set('bBox', `${(lon - 0.5).toFixed(4)},${(lat - 0.5).toFixed(4)},${(lon + 0.5).toFixed(4)},${(lat + 0.5).toFixed(4)}`)
    url.searchParams.set('siteType', 'ST')
    url.searchParams.set('siteStatus', 'active')
    url.searchParams.set('hasDataTypeCd', 'iv')
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return 0
    const data = (await res.json()) as { value?: { queryInfo?: { note?: Array<{ value?: string; title?: string }> }; timeSeries?: unknown[] } }
    return data.value?.timeSeries
      ? (data.value.timeSeries as unknown[]).length
      : 0
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// NASA FIRMS wildfire detection (requires NASA_FIRMS_KEY)
// Returns count of fire detections within 50km in the past 10 days
// ---------------------------------------------------------------------------

async function fetchFIRSFireCount(lat: number, lon: number): Promise<number | null> {
  if (!NASA_FIRMS_KEY) return null
  try {
    const today = new Date()
    const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 3600 * 1000)
    const start = tenDaysAgo.toISOString().slice(0, 10)
    const end = today.toISOString().slice(0, 10)
    // Area: ±0.5° bounding box (~55km)
    const area = `${(lon - 0.5).toFixed(2)},${(lat - 0.5).toFixed(2)},${(lon + 0.5).toFixed(2)},${(lat + 0.5).toFixed(2)}`
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_FIRMS_KEY}/VIIRS_NOAA21_NRT/${area}/10/${start}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n')
    // First line is header
    return Math.max(0, lines.length - 1)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// AirNow AQI (requires AIRNOW_KEY)
// ---------------------------------------------------------------------------

async function fetchAQI(lat: number, lon: number): Promise<{ aqi: number; category: string } | null> {
  if (!AIRNOW_KEY) return null
  try {
    const today = new Date().toISOString().slice(0, 10)
    const url = new URL('https://www.airnowapi.org/aq/observation/latLong/current/')
    url.searchParams.set('format', 'application/json')
    url.searchParams.set('latitude', lat.toString())
    url.searchParams.set('longitude', lon.toString())
    url.searchParams.set('distance', '25')
    url.searchParams.set('API_KEY', AIRNOW_KEY)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ AQI: number; Category: { Name: string } }>
    if (data.length === 0) return null
    const best = data.reduce((a, b) => a.AQI > b.AQI ? a : b)
    return { aqi: best.AQI, category: best.Category.Name }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Soil drainage heuristic (drought_stress and inland_flood)
// ---------------------------------------------------------------------------

function soilDrainage(lat: number, lon: number): 'poor' | 'moderate' | 'good' {
  // Southwest / Great Plains — poor (clay soils, low permeability)
  if ((lon < -100 && lat < 42) || (lon >= -105 && lon <= -95 && lat >= 30 && lat <= 48)) return 'poor'
  // SE coastal plain — good (sandy soils)
  if (lon >= -85 && lon <= -75 && lat >= 25 && lat <= 36) return 'good'
  return 'moderate'
}

// Soil type for drought
function soilType(lat: number, lon: number): 'clay' | 'loam' | 'sandy' {
  if (lon < -115 && lat < 42) return 'clay'   // CA / SW
  if (lon >= -105 && lon <= -95 && lat >= 30 && lat <= 48) return 'clay'  // Great Plains
  if (lon >= -85 && lon <= -75 && lat >= 25 && lat <= 36) return 'sandy'   // SE coastal
  return 'loam'
}

// ---------------------------------------------------------------------------
// Urban Heat Island heuristic
// ---------------------------------------------------------------------------

const UHI_CITIES = [
  { name: 'Los Angeles', lat: 34.05, lon: -118.25, uhi_f: 10 },
  { name: 'Phoenix', lat: 33.45, lon: -112.07, uhi_f: 12 },
  { name: 'Las Vegas', lat: 36.17, lon: -115.14, uhi_f: 11 },
  { name: 'San Francisco', lat: 37.77, lon: -122.42, uhi_f: 8 },
  { name: 'New York City', lat: 40.71, lon: -74.01, uhi_f: 9 },
]

function uhiAdjustment(lat: number, lon: number): number {
  let best = 2.0  // default small UHI for any urban area
  for (const city of UHI_CITIES) {
    const d = Math.hypot(city.lat - lat, city.lon - lon)
    if (d < 0.1) { best = Math.max(best, city.uhi_f); break }
    if (d < 0.5) best = Math.max(best, city.uhi_f * 0.6)
    else if (d < 1.0) best = Math.max(best, city.uhi_f * 0.3)
  }
  return best
}

// ---------------------------------------------------------------------------
// Clamp helper
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ---------------------------------------------------------------------------
// TOOL IMPLEMENTATIONS
// ---------------------------------------------------------------------------

// ── 1. Coastal Flood Assessment ─────────────────────────────────────────────

async function coastalFloodAssessment(address: string): Promise<string> {
  const geo = await geocode(address)
  const { latitude: lat, longitude: lon } = geo

  const [elev, weather, stationId] = await Promise.all([
    fetchElevation(lat, lon),
    fetchNOAAWeather(lat, lon),
    fetchNearestTideStation(lat, lon),
  ])

  let seaLevelTrend: number | null = null
  if (stationId) seaLevelTrend = await fetchSeaLevelTrend(stationId)

  const coast = getCoastType(lat, lon)
  const maxSurgeFt = STORM_SURGE_FT[coast]

  // Elevation vulnerability: < 10ft = very high, < 20ft = high, < 40ft = moderate
  const elev_ft = elev.elevation_ft
  const elevScore = elev_ft < 10 ? 90 : elev_ft < 20 ? 70 : elev_ft < 40 ? 45 : elev_ft < 80 ? 20 : 5

  // Storm surge: proportion of elevation below surge height
  const surgeScore = coast === 'Inland' ? 0 : clamp((maxSurgeFt / Math.max(elev_ft, 1)) * 60, 0, 100)

  // Sea level rise: mm/yr trend → score
  const slrScore = seaLevelTrend != null
    ? clamp((seaLevelTrend / 10) * 50, 0, 100)
    : (coast !== 'Inland' ? 35 : 0)

  // Tide exposure: coastal proximity
  const tideScore = coast === 'Inland' ? 0 : coast === 'GreatLakes' ? 15 : 50

  // Hurricane surge: zone-based
  const zone = getHurricaneZone(lat, lon)
  const hurricaneScore = clamp(zone.avg_per_year * 25, 0, 80)

  // Infrastructure vulnerability: wind speed
  const windMph = weather.wind_speed_mph ?? 0
  const infraScore = clamp((windMph / 100) * 50 + (elev_ft < 15 ? 20 : 0), 0, 100)

  // Coastal erosion proxy: Pacific/Gulf coasts have higher erosion
  const erosionScore = coast === 'Pacific' ? 55 : coast === 'Gulf' ? 60 : coast === 'Atlantic' ? 45 : coast === 'GreatLakes' ? 30 : 5

  const weights = { elev: 0.25, surge: 0.20, slr: 0.15, tide: 0.10, hurricane: 0.15, infra: 0.10, erosion: 0.05 }
  const composite = (
    elevScore * weights.elev +
    surgeScore * weights.surge +
    slrScore * weights.slr +
    tideScore * weights.tide +
    hurricaneScore * weights.hurricane +
    infraScore * weights.infra +
    erosionScore * weights.erosion
  )

  return JSON.stringify({
    address: geo.matchedAddress,
    latitude: lat,
    longitude: lon,
    coast_type: coast,
    elevation_ft: Math.round(elev_ft),
    tide_station: stationId,
    sea_level_trend_mm_yr: seaLevelTrend,
    current_conditions: weather,
    coastal_flood_risk_percent: Math.round(clamp(composite, 0, 100)),
    factor_scores: {
      elevation_vulnerability_score: Math.round(elevScore),
      storm_surge_score: Math.round(surgeScore),
      sea_level_rise_score: Math.round(slrScore),
      tide_exposure_score: Math.round(tideScore),
      hurricane_surge_score: Math.round(hurricaneScore),
      infrastructure_vulnerability_score: Math.round(infraScore),
      coastal_erosion_score: Math.round(erosionScore),
    },
  })
}

// ── 2. Inland Flood Assessment ──────────────────────────────────────────────

async function inlandFloodAssessment(address: string): Promise<string> {
  const geo = await geocode(address)
  const { latitude: lat, longitude: lon } = geo

  const end = new Date()
  const start = yearsAgo(1)

  const [elev, weather, gaugeCount, powerData] = await Promise.all([
    fetchElevation(lat, lon),
    fetchNOAAWeather(lat, lon),
    fetchStreamGauges(lat, lon),
    fetchNASAPower(lat, lon, ymd(start), ymd(end), ['PRECTOTCORR']),
  ])

  // FEMA flood zone via existing URL (Layer 28)
  let femaZone = 'Unknown'
  try {
    const femaUrl = new URL('https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query')
    femaUrl.searchParams.set('geometry', `${lon},${lat}`)
    femaUrl.searchParams.set('geometryType', 'esriGeometryPoint')
    femaUrl.searchParams.set('inSR', '4326')
    femaUrl.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
    femaUrl.searchParams.set('outFields', 'FLD_ZONE')
    femaUrl.searchParams.set('returnGeometry', 'false')
    femaUrl.searchParams.set('f', 'json')
    const femaRes = await fetch(femaUrl.toString(), { signal: AbortSignal.timeout(12000) })
    if (femaRes.ok) {
      const femaData = (await femaRes.json()) as { features?: Array<{ attributes: { FLD_ZONE?: string } }> }
      femaZone = femaData.features?.[0]?.attributes?.FLD_ZONE ?? 'Unknown'
    }
  } catch { /* non-fatal */ }

  const precip = powerData['PRECTOTCORR'] ?? []
  const avgPrecip = precip.length > 0 ? precip.reduce((a, b) => a + b, 0) / precip.length : 0
  const heavyRainDays = precip.filter((v) => v > 25).length

  const drainage = soilDrainage(lat, lon)
  const drainageScore = drainage === 'poor' ? 80 : drainage === 'moderate' ? 45 : 20

  // FEMA zone score
  const femaScore = ['AE', 'VE', 'A'].includes(femaZone) ? 90
    : ['AO', 'AH'].includes(femaZone) ? 75
    : femaZone === 'X' ? 20
    : 40

  // Elevation score (low = flood-prone)
  const elevFt = elev.elevation_ft
  const elevScore = elevFt < 10 ? 85 : elevFt < 25 ? 65 : elevFt < 50 ? 40 : elevFt < 100 ? 20 : 8

  // Precipitation score
  const precipScore = clamp(heavyRainDays * 4 + avgPrecip * 2, 0, 100)

  // Stream gauge density
  const gaugeScore = clamp(gaugeCount * 15, 0, 70)

  // Flash flood potential from weather
  const windMph = weather.wind_speed_mph ?? 0
  const flashScore = clamp((avgPrecip * 3) + (windMph > 30 ? 20 : 0), 0, 80)

  // Runoff potential
  const runoffScore = drainageScore * 0.5 + elevScore * 0.3 + precipScore * 0.2

  const weights = { fema: 0.30, elev: 0.20, precip: 0.15, drain: 0.15, gauge: 0.10, flash: 0.05, runoff: 0.05 }
  const composite = (
    femaScore * weights.fema +
    elevScore * weights.elev +
    precipScore * weights.precip +
    drainageScore * weights.drain +
    gaugeScore * weights.gauge +
    flashScore * weights.flash +
    runoffScore * weights.runoff
  )

  return JSON.stringify({
    address: geo.matchedAddress,
    latitude: lat,
    longitude: lon,
    elevation_ft: Math.round(elevFt),
    fema_flood_zone: femaZone,
    stream_gauges_nearby: gaugeCount,
    avg_daily_precip_mm: Math.round(avgPrecip * 100) / 100,
    heavy_rain_days_past_year: heavyRainDays,
    soil_drainage: drainage,
    current_conditions: weather,
    inland_flood_risk_percent: Math.round(clamp(composite, 0, 100)),
    factor_scores: {
      fema_zone_score: Math.round(femaScore),
      elevation_score: Math.round(elevScore),
      precipitation_score: Math.round(precipScore),
      soil_drainage_score: Math.round(drainageScore),
      stream_gauge_score: Math.round(gaugeScore),
      flash_flood_score: Math.round(flashScore),
      runoff_score: Math.round(runoffScore),
    },
  })
}

// ── 3. Wildfire Assessment ───────────────────────────────────────────────────

async function wildfireAssessment(address: string): Promise<string> {
  const geo = await geocode(address)
  const { latitude: lat, longitude: lon } = geo

  const [elev, weather, droughtLevel, firmsCount, aqiData] = await Promise.all([
    fetchElevation(lat, lon),
    fetchNOAAWeather(lat, lon),
    fetchDroughtLevel(lat, lon),
    fetchFIRSFireCount(lat, lon),
    fetchAQI(lat, lon),
  ])

  // Elevation: 1000-7000 ft is peak wildfire elevation band
  const elevFt = elev.elevation_ft
  const elevScore = elevFt >= 1000 && elevFt <= 7000 ? 70
    : elevFt > 7000 ? 40
    : elevFt < 500 ? 20
    : 50

  // Weather risk: low humidity + high wind + warm
  const rh = weather.relative_humidity ?? 50
  const wind = weather.wind_speed_mph ?? 10
  const temp = weather.temperature_f ?? 70
  const weatherScore = clamp(
    ((100 - rh) / 2) + (wind / 50 * 30) + ((temp - 70) / 60 * 20),
    0, 100
  )

  // Drought
  const droughtScore = droughtLevel < 0 ? 5
    : droughtLevel === 0 ? 25
    : droughtLevel === 1 ? 45
    : droughtLevel === 2 ? 65
    : droughtLevel === 3 ? 80
    : 95  // D4

  // Fire activity (FIRMS)
  const fireScore = firmsCount == null ? 20  // no key — use weather-based estimate
    : firmsCount === 0 ? 5
    : clamp(firmsCount * 10, 0, 100)

  // Air quality
  const aqiScore = aqiData == null ? 10
    : aqiData.aqi < 50 ? 5
    : aqiData.aqi < 100 ? 20
    : aqiData.aqi < 150 ? 45
    : aqiData.aqi < 200 ? 70
    : 90

  // Proximity / WUI (Wildland-Urban Interface) heuristic: western states = higher
  const wuiScore = lon < -100 ? (lat > 35 ? 65 : 50) : lon < -85 ? 35 : 20

  const weights = { weather: 0.25, drought: 0.25, fire: 0.20, elev: 0.10, aqi: 0.10, wui: 0.10 }
  const composite = (
    weatherScore * weights.weather +
    droughtScore * weights.drought +
    fireScore * weights.fire +
    elevScore * weights.elev +
    aqiScore * weights.aqi +
    wuiScore * weights.wui
  )

  return JSON.stringify({
    address: geo.matchedAddress,
    latitude: lat,
    longitude: lon,
    elevation_ft: Math.round(elevFt),
    drought_level: droughtLevel < 0 ? 'None' : `D${droughtLevel}`,
    fire_detections_10d: firmsCount,
    air_quality: aqiData,
    current_conditions: weather,
    wildfire_risk_percent: Math.round(clamp(composite, 0, 100)),
    factor_scores: {
      fire_activity_score: Math.round(fireScore),
      weather_risk_score: Math.round(weatherScore),
      drought_score: Math.round(droughtScore),
      elevation_risk_score: Math.round(elevScore),
      air_quality_score: Math.round(aqiScore),
      proximity_score: Math.round(wuiScore),
    },
    data_availability: {
      firms_active: firmsCount != null,
      airnow_active: aqiData != null,
    },
  })
}

// ── 4. Heat Stress Assessment ────────────────────────────────────────────────

async function heatStressAssessment(address: string): Promise<string> {
  const geo = await geocode(address)
  const { latitude: lat, longitude: lon } = geo

  const now = new Date()
  const fourYearsAgo = yearsAgo(4)

  const [elev, weather, powerData] = await Promise.all([
    fetchElevation(lat, lon),
    fetchNOAAWeather(lat, lon),
    fetchNASAPower(lat, lon, ymd(fourYearsAgo), ymd(now), ['T2M_MAX', 'T2M_MIN', 'RH2M']),
  ])

  const tMaxC = powerData['T2M_MAX'] ?? []
  const tMinC = powerData['T2M_MIN'] ?? []
  const rhArr = powerData['RH2M'] ?? []

  // Convert to Fahrenheit
  const tMaxF = tMaxC.map((v) => v * 9 / 5 + 32)
  const avgTMaxF = tMaxF.length > 0 ? tMaxF.reduce((a, b) => a + b, 0) / tMaxF.length : 85

  // Days above 90°F and 100°F
  const days90 = tMaxF.filter((v) => v >= 90).length
  const days100 = tMaxF.filter((v) => v >= 100).length

  // Heat waves (3+ consecutive days > 90°F)
  let heatWaves = 0
  let streak = 0
  for (const v of tMaxF) {
    if (v >= 90) { streak++; if (streak === 3) heatWaves++ }
    else streak = 0
  }

  // Average relative humidity
  const avgRH = rhArr.length > 0 ? rhArr.reduce((a, b) => a + b, 0) / rhArr.length : 50

  // Heat index using average conditions
  const avgHI = heatIndex(avgTMaxF, avgRH)

  // UHI adjustment
  const uhi = uhiAdjustment(lat, lon)

  // Temperature exposure score
  const tempScore = clamp(days90 / 10 + days100 * 2 + heatWaves * 5, 0, 100)

  // Humidity score
  const humidScore = clamp((avgRH - 30) * 1.5 + (avgHI > 103 ? 30 : 0), 0, 100)

  // UHI score
  const uhiScore = clamp(uhi * 5, 0, 60)

  // Building vulnerability: older housing stock in hot climates
  const buildScore = avgTMaxF > 100 ? 70 : avgTMaxF > 90 ? 50 : 30

  // Vegetation / cooling proxy: south/west less vegetation
  const vegScore = lon < -100 && lat < 40 ? 65 : lon < -85 ? 40 : 25

  // Climate projection: warming accelerates hot days
  const projScore = clamp(days90 / 8 + uhiScore * 0.3, 0, 80)

  const weights = { temp: 0.30, humid: 0.20, uhi: 0.15, build: 0.15, veg: 0.10, proj: 0.10 }
  const composite = (
    tempScore * weights.temp +
    humidScore * weights.humid +
    uhiScore * weights.uhi +
    buildScore * weights.build +
    vegScore * weights.veg +
    projScore * weights.proj
  )

  return JSON.stringify({
    address: geo.matchedAddress,
    latitude: lat,
    longitude: lon,
    elevation_ft: Math.round(elev.elevation_ft),
    current_conditions: weather,
    historical_4yr: {
      avg_daily_max_f: Math.round(avgTMaxF * 10) / 10,
      days_above_90f: days90,
      days_above_100f: days100,
      heat_waves: heatWaves,
      avg_relative_humidity_pct: Math.round(avgRH),
      avg_heat_index_f: Math.round(avgHI * 10) / 10,
    },
    uhi_adjustment_f: Math.round(uhi * 10) / 10,
    heat_risk_percent: Math.round(clamp(composite, 0, 100)),
    factor_scores: {
      temperature_exposure_score: Math.round(tempScore),
      humidity_score: Math.round(humidScore),
      urban_heat_island_score: Math.round(uhiScore),
      building_vulnerability_score: Math.round(buildScore),
      vegetation_score: Math.round(vegScore),
      climate_projection_score: Math.round(projScore),
    },
  })
}

// ── 5. Hurricane Wind Assessment ─────────────────────────────────────────────

async function hurricaneWindAssessment(address: string): Promise<string> {
  const geo = await geocode(address)
  const { latitude: lat, longitude: lon } = geo

  const [elev, weather] = await Promise.all([
    fetchElevation(lat, lon),
    fetchNOAAWeather(lat, lon),
  ])

  const zone = getHurricaneZone(lat, lon)

  // Historical frequency score
  const freqScore = clamp(zone.avg_per_year * 30, 0, 90)

  // Major hurricane risk
  const majorScore = clamp(zone.avg_major_per_year * 50, 0, 80)

  // Max category score
  const catScore = zone.max_category === 5 ? 90
    : zone.max_category === 4 ? 70
    : zone.max_category === 3 ? 50
    : zone.max_category === 2 ? 30
    : 10

  // Elevation modifier: lower = more surge exposure
  const elevFt = elev.elevation_ft
  const elevPenalty = elevFt < 20 ? 20 : elevFt < 50 ? 10 : 0

  // Current wind speed contribution
  const windMph = weather.wind_speed_mph ?? 0
  const windScore = clamp(windMph / 3, 0, 40)

  // Coastal distance (Atlantic/Gulf coast much higher risk)
  const coast = getCoastType(lat, lon)
  const coastScore = coast === 'Gulf' ? 75 : coast === 'Atlantic' ? 65 : coast === 'Pacific' ? 25 : coast === 'GreatLakes' ? 10 : 5

  // Infrastructure exposure
  const infraScore = clamp(catScore * 0.6 + elevPenalty + windScore * 0.3, 0, 100)

  const weights = { freq: 0.25, major: 0.20, cat: 0.20, coast: 0.20, wind: 0.10, infra: 0.05 }
  const composite = (
    freqScore * weights.freq +
    majorScore * weights.major +
    catScore * weights.cat +
    coastScore * weights.coast +
    windScore * weights.wind +
    infraScore * weights.infra
  )

  return JSON.stringify({
    address: geo.matchedAddress,
    latitude: lat,
    longitude: lon,
    elevation_ft: Math.round(elevFt),
    coast_type: coast,
    hurricane_zone: zone.zone,
    avg_hurricanes_per_year: zone.avg_per_year,
    avg_major_per_year: zone.avg_major_per_year,
    max_historical_category: zone.max_category,
    current_conditions: weather,
    hurricane_wind_risk_percent: Math.round(clamp(composite, 0, 100)),
    factor_scores: {
      historical_frequency_score: Math.round(freqScore),
      major_hurricane_score: Math.round(majorScore),
      category_intensity_score: Math.round(catScore),
      coastal_exposure_score: Math.round(coastScore),
      current_wind_score: Math.round(windScore),
      infrastructure_score: Math.round(infraScore),
    },
  })
}

// ── 6. Drought Stress Assessment ─────────────────────────────────────────────

async function droughtStressAssessment(address: string): Promise<string> {
  const geo = await geocode(address)
  const { latitude: lat, longitude: lon } = geo

  const now = new Date()
  const fourYearsAgo = yearsAgo(4)

  const [elev, weather, droughtLevel, powerData] = await Promise.all([
    fetchElevation(lat, lon),
    fetchNOAAWeather(lat, lon),
    fetchDroughtLevel(lat, lon),
    fetchNASAPower(lat, lon, ymd(fourYearsAgo), ymd(now), ['PRECTOTCORR']),
  ])

  const precip = powerData['PRECTOTCORR'] ?? []
  const avgPrecip = precip.length > 0 ? precip.reduce((a, b) => a + b, 0) / precip.length : 0

  // Dry days (< 0.1 mm/day)
  const dryDays = precip.filter((v) => v < 0.1).length
  const dryPct = precip.length > 0 ? (dryDays / precip.length) * 100 : 50

  // Precipitation deficit vs expected (2.5 mm/day baseline)
  const expected = 2.5
  const deficit = precip.length > 0
    ? Math.max(0, ((expected - avgPrecip) / expected) * 100)
    : 30

  // Drought monitor score
  const dmScore = droughtLevel < 0 ? 5
    : droughtLevel === 0 ? 25
    : droughtLevel === 1 ? 45
    : droughtLevel === 2 ? 65
    : droughtLevel === 3 ? 80
    : 95

  // Soil type modifier
  const soil = soilType(lat, lon)
  const soilScore = soil === 'clay' ? 70 : soil === 'sandy' ? 50 : 40

  // Precipitation variability score
  const precipScore = clamp(deficit + dryPct * 0.5, 0, 100)

  // Temperature amplification (hot + dry = worse drought)
  const temp = weather.temperature_f ?? 75
  const tempAmplify = clamp((temp - 70) / 30 * 25, 0, 25)

  // Elevation: high desert = high drought risk
  const elevFt = elev.elevation_ft
  const elevScore = (lon < -100 && elevFt > 3000) ? 60 : 25

  // Water stress: aridity of region
  const aridityScore = lon < -105 ? 75 : lon < -95 ? 50 : lon < -85 ? 35 : 20

  const weights = { dm: 0.30, precip: 0.20, soil: 0.15, aridity: 0.15, temp: 0.10, elev: 0.10 }
  const composite = (
    dmScore * weights.dm +
    precipScore * weights.precip +
    soilScore * weights.soil +
    aridityScore * weights.aridity +
    tempAmplify * weights.temp +
    elevScore * weights.elev
  )

  return JSON.stringify({
    address: geo.matchedAddress,
    latitude: lat,
    longitude: lon,
    elevation_ft: Math.round(elevFt),
    current_conditions: weather,
    drought_level: droughtLevel < 0 ? 'None' : `D${droughtLevel}`,
    historical_4yr: {
      avg_daily_precip_mm: Math.round(avgPrecip * 100) / 100,
      dry_days_pct: Math.round(dryPct),
      precipitation_deficit_pct: Math.round(deficit),
    },
    soil_type: soil,
    drought_risk_percent: Math.round(clamp(composite, 0, 100)),
    factor_scores: {
      drought_monitor_score: Math.round(dmScore),
      precipitation_score: Math.round(precipScore),
      soil_vulnerability_score: Math.round(soilScore),
      aridity_score: Math.round(aridityScore),
      temperature_amplification_score: Math.round(tempAmplify),
      elevation_risk_score: Math.round(elevScore),
    },
  })
}

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic function-call schema)
// ---------------------------------------------------------------------------

function addressSchema(): AnthropicTool['input_schema'] {
  return {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description: 'Full US address (e.g. "123 Main St, Miami, FL 33101")',
      },
    },
    required: ['address'],
  }
}

export const COASTAL_FLOOD_TOOL: AnthropicTool = {
  name: 'coastal_flood_assessment',
  description:
    'Assess coastal flood risk for a US address using NOAA tide stations, sea level trends, elevation, storm surge zones, and hurricane history. Returns a composite coastal flood risk score and factor breakdown.',
  input_schema: addressSchema(),
}

export const INLAND_FLOOD_TOOL: AnthropicTool = {
  name: 'inland_flood_assessment',
  description:
    'Assess inland flood risk using FEMA NFHL flood zone data, elevation, USGS stream gauge density, historical precipitation from NASA POWER, and soil drainage characteristics.',
  input_schema: addressSchema(),
}

export const WILDFIRE_TOOL: AnthropicTool = {
  name: 'wildfire_assessment',
  description:
    'Assess wildfire risk using NASA FIRMS fire detections (when available), US Drought Monitor drought level, AirNow air quality index, NOAA weather conditions, elevation, and WUI proximity.',
  input_schema: addressSchema(),
}

export const HEAT_STRESS_TOOL: AnthropicTool = {
  name: 'heat_stress_assessment',
  description:
    'Assess heat stress risk using 4 years of NASA POWER temperature and humidity data, heat wave frequency, NOAA Heat Index, Urban Heat Island adjustment, and current NOAA conditions.',
  input_schema: addressSchema(),
}

export const HURRICANE_WIND_TOOL: AnthropicTool = {
  name: 'hurricane_wind_assessment',
  description:
    'Assess hurricane wind risk using historical hurricane frequency and intensity by zone, coastal exposure, elevation, and current wind conditions.',
  input_schema: addressSchema(),
}

export const DROUGHT_STRESS_TOOL: AnthropicTool = {
  name: 'drought_stress_assessment',
  description:
    'Assess drought and water stress risk using US Drought Monitor current conditions, 4 years of NASA POWER precipitation, precipitation deficit calculation, soil type, and regional aridity.',
  input_schema: addressSchema(),
}

export const ALL_PERIL_TOOLS: AnthropicTool[] = [
  COASTAL_FLOOD_TOOL,
  INLAND_FLOOD_TOOL,
  WILDFIRE_TOOL,
  HEAT_STRESS_TOOL,
  HURRICANE_WIND_TOOL,
  DROUGHT_STRESS_TOOL,
]

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export async function executePerilTool(
  name: string,
  input: Record<string, unknown>
): Promise<string | null> {
  const address = typeof input.address === 'string' ? input.address.trim() : null
  if (!address) return 'Invalid input: address must be a non-empty string.'

  try {
    switch (name) {
      case 'coastal_flood_assessment': return await coastalFloodAssessment(address)
      case 'inland_flood_assessment': return await inlandFloodAssessment(address)
      case 'wildfire_assessment': return await wildfireAssessment(address)
      case 'heat_stress_assessment': return await heatStressAssessment(address)
      case 'hurricane_wind_assessment': return await hurricaneWindAssessment(address)
      case 'drought_stress_assessment': return await droughtStressAssessment(address)
      default: return null  // Not a peril tool — caller should try other dispatchers
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return `Tool ${name} error: ${message}`
  }
}
