// Endereço aproximado (rua, bairro, cidade) a partir do GPS, para o alerta do APOIO DROP.
// Usa o Nominatim (OpenStreetMap): grátis, sem chave, poucos pedidos por dia.
// Se demorar ou falhar o pedido segue só com as coordenadas.

export type Place = { address: string | null; bairro: string | null; city: string | null };

const TIMEOUT_MS = 3500;
const EMPTY: Place = { address: null, bairro: null, city: null };

type NominatimAddress = Record<string, string | undefined>;

const first = (a: NominatimAddress, keys: string[]) => keys.map((k) => a[k]).find((v) => !!v) ?? null;

export async function reverseGeocode(lat: number, lng: number): Promise<Place> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=pt-BR` +
    `&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OrdensOS-ApoioDrop/1.0 (alerta de apoio entre técnicos)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;
    const data: { address?: NominatimAddress } = await res.json();
    const a = data.address ?? {};
    const road = first(a, ["road", "pedestrian", "residential", "footway", "path"]);
    const address = road ? (a.house_number ? `${road}, ${a.house_number}` : road) : null;
    const bairro = first(a, ["suburb", "neighbourhood", "quarter", "city_district", "hamlet", "village"]);
    const city = first(a, ["city", "town", "municipality", "village"]);
    return { address, bairro, city: city === bairro ? null : city };
  } catch {
    return EMPTY;
  }
}
