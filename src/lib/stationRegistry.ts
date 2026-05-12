import type { Station } from '@/types/station';

const STATION_REGISTRY_BASE_URL = 'http://localhost:4000';

export interface StationRegistryEntry {
  stationId: string;
  group: string;
  slotCode: string;
  haId: string;
  vib: string;
  snr: string;
  cycles: number;
}

export interface StationRegistryPatch {
  group?: string;
  slotCode?: string;
  haId?: string;
  vib?: string;
  snr?: string;
  cycles?: number;
}

export interface LiveDishwasherBinding {
  haId: string;
  stationId: string;
  stationSlotCode: string;
  displaySlotCode: string;
}

function buildRegistryUrl(pathname: string) {
  return `${STATION_REGISTRY_BASE_URL}${pathname}`;
}

export async function fetchStationRegistry() {
  const response = await fetch(buildRegistryUrl('/api/station-registry'));
  if (!response.ok) {
    throw new Error(`Station registry request failed: ${response.status}`);
  }

  const payload = await response.json() as { data?: StationRegistryEntry[] };
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function updateStationRegistryEntry(stationId: string, patch: StationRegistryPatch) {
  const response = await fetch(buildRegistryUrl(`/api/station-registry/${encodeURIComponent(stationId)}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(`Station registry update failed: ${response.status}`);
  }

  const payload = await response.json() as { data?: StationRegistryEntry };
  if (!payload.data) {
    throw new Error('Station registry update returned no data');
  }

  return payload.data;
}

export function upsertStationRegistryEntry(entries: StationRegistryEntry[], nextEntry: StationRegistryEntry) {
  const hasExisting = entries.some((entry) => entry.stationId === nextEntry.stationId);
  const nextEntries = hasExisting
    ? entries.map((entry) => (entry.stationId === nextEntry.stationId ? nextEntry : entry))
    : [...entries, nextEntry];

  return nextEntries.sort((left, right) =>
    left.stationId.localeCompare(right.stationId, undefined, { numeric: true }),
  );
}

export function buildBindingsFromRegistryEntries(entries: StationRegistryEntry[]): LiveDishwasherBinding[] {
  return entries
    .filter((entry) => entry.haId)
    .map((entry) => ({
      haId: entry.haId,
      stationId: entry.stationId,
      stationSlotCode: entry.slotCode || entry.stationId,
      displaySlotCode: entry.slotCode || entry.stationId,
    }));
}

export function mergeStationRegistryIntoStations(stations: Station[], entries: StationRegistryEntry[]) {
  const registryMap = new Map(entries.map((entry) => [entry.stationId, entry]));

  return stations.map((station) => {
    const registryEntry = registryMap.get(station.id);
    if (!registryEntry) return station;

    const hasLiveBinding = !!registryEntry.haId;

    return {
      ...station,
      slot_code: registryEntry.slotCode || station.slot_code,
      device_model: registryEntry.vib || station.device_model,
      device_sn: registryEntry.snr || station.device_sn,
      cycles: Number.isFinite(registryEntry.cycles) ? registryEntry.cycles : station.cycles,
      binding_haId: registryEntry.haId || undefined,
      data_source: hasLiveBinding ? station.data_source : 'mock',
      homeconnect_remaining_seconds: hasLiveBinding ? station.homeconnect_remaining_seconds : undefined,
      homeconnect_program_progress: hasLiveBinding ? station.homeconnect_program_progress : undefined,
    };
  });
}
