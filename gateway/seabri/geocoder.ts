export interface GeocodeResult {
  formattedAddress: string
  lat: number
  lng: number
  city: string
  state: string
  country: string
  postalCode: string
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const NOMINATIM_HEADERS = { 'User-Agent': 'OpenSeaBri/1.0 (contact@seabridgesustainability.com)' }

export async function geocodeCoordinates(lat: number, lng: number): Promise<GeocodeResult> {
  if (process.env.GOOGLE_MAPS_KEY) {
    return reverseGeocodeWithGoogle(lat, lng)
  }
  return reverseGeocodeWithNominatim(lat, lng)
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    if (process.env.GOOGLE_MAPS_KEY) {
      return await forwardGeocodeWithGoogle(address)
    }
    return await forwardGeocodeWithNominatim(address)
  } catch {
    return null
  }
}

// ── Google Maps ───────────────────────────────────────────────────────────────

interface GoogleReverseResponse {
  status: string
  results: Array<{
    formatted_address: string
    geometry: { location: { lat: number; lng: number } }
    address_components: Array<{ types: string[]; long_name: string; short_name: string }>
  }>
}

async function reverseGeocodeWithGoogle(lat: number, lng: number): Promise<GeocodeResult> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_KEY}`
  const resp = await fetch(url, { signal: AbortSignal.timeout(5_000) })
  const data = (await resp.json()) as GoogleReverseResponse
  if (data.status !== 'OK' || !data.results.length) throw new Error(`Google Geocoding: ${data.status}`)
  return parseGoogleResult(data.results[0])
}

async function forwardGeocodeWithGoogle(address: string): Promise<GeocodeResult | null> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_KEY}`
  const resp = await fetch(url, { signal: AbortSignal.timeout(5_000) })
  const data = (await resp.json()) as GoogleReverseResponse
  if (data.status !== 'OK' || !data.results.length) return null
  return parseGoogleResult(data.results[0])
}

function parseGoogleResult(result: GoogleReverseResponse['results'][0]): GeocodeResult {
  const get = (type: string): string =>
    result.address_components.find((c) => c.types.includes(type))?.long_name ?? ''
  return {
    formattedAddress: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    city: get('locality') || get('administrative_area_level_2'),
    state: get('administrative_area_level_1'),
    country: get('country'),
    postalCode: get('postal_code'),
  }
}

// ── Nominatim (free fallback) ─────────────────────────────────────────────────

interface NominatimReverseResponse {
  display_name: string
  lat: string
  lon: string
  address: {
    road?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
    postcode?: string
    county?: string
  }
}

interface NominatimSearchResponse extends NominatimReverseResponse {
  // search returns array; same shape per element
}

async function reverseGeocodeWithNominatim(lat: number, lng: number): Promise<GeocodeResult> {
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}`
  const resp = await fetch(url, { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(5_000) })
  const data = (await resp.json()) as NominatimReverseResponse
  return parseNominatimResult(data)
}

async function forwardGeocodeWithNominatim(address: string): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  const resp = await fetch(url, { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(5_000) })
  const data = (await resp.json()) as NominatimSearchResponse[]
  if (!data.length) return null
  return parseNominatimResult(data[0])
}

function parseNominatimResult(data: NominatimReverseResponse): GeocodeResult {
  const addr = data.address ?? {}
  return {
    formattedAddress: data.display_name,
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
    city: addr.city ?? addr.town ?? addr.village ?? addr.county ?? '',
    state: addr.state ?? '',
    country: addr.country ?? '',
    postalCode: addr.postcode ?? '',
  }
}
