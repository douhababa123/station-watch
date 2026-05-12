import type { Station } from '@/types/station';

const LIVE_STATION_BASE_URL = 'http://localhost:4000';

interface LiveStationsResponse {
  data?: Station[];
  meta?: {
    stationCount?: number;
    boundStationCount?: number;
    initializedAt?: number | null;
    lastRefreshSummary?: {
      refreshedAt?: number;
      total?: number;
      success?: number;
      failed?: number;
    } | null;
  };
}

interface LiveStationRefreshResponse {
  ok?: boolean;
  meta?: LiveStationsResponse['meta'];
  results?: Array<{
    stationId: string;
    haId: string;
    ok: boolean;
    status: number;
    error?: string;
  }>;
}

interface StationUpdateEventPayload {
  station?: Station;
  reason?: string;
}

function buildLiveStationUrl(pathname: string) {
  return `${LIVE_STATION_BASE_URL}${pathname}`;
}

export async function fetchLiveStations() {
  const response = await fetch(buildLiveStationUrl('/api/live-stations'));
  if (!response.ok) {
    throw new Error(`Live stations request failed: ${response.status}`);
  }

  const payload = await response.json() as LiveStationsResponse;
  return {
    stations: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? null,
  };
}

export async function refreshLiveStations() {
  const response = await fetch(buildLiveStationUrl('/api/live-stations/refresh'), {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Live station refresh failed: ${response.status}`);
  }

  return response.json() as Promise<LiveStationRefreshResponse>;
}

export function subscribeToLiveStations(
  onStationUpdate: (station: Station, reason?: string) => void,
  onConnected?: () => void,
) {
  const eventSource = new EventSource(buildLiveStationUrl('/api/live-stations/events'));

  eventSource.addEventListener('CONNECTED', () => {
    onConnected?.();
  });

  eventSource.addEventListener('station-update', (event) => {
    try {
      const payload = JSON.parse(event.data) as StationUpdateEventPayload;
      if (payload.station) {
        onStationUpdate(payload.station, payload.reason);
      }
    } catch (error) {
      console.error('[liveStations] Failed to parse station update event', error);
    }
  });

  eventSource.addEventListener('refresh-complete', () => {
    onConnected?.();
  });

  eventSource.onerror = () => {
    console.warn('[liveStations] Aggregate live station stream interrupted');
  };

  return () => {
    eventSource.close();
  };
}