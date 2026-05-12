import type { Station, StationStatus } from '@/types/station';
import type { DishwasherBinding } from '@/lib/dishwasherBindings';

const HOME_CONNECT_BASE_URL = 'http://localhost:4000';
const SSE_EVENT_TYPES = ['STATUS', 'NOTIFY', 'EVENT', 'CONNECTED', 'DISCONNECTED'] as const;
const SNAPSHOT_CACHE_TTL_MS = 5_000;

const snapshotCache = new Map<string, { snapshot: DishwasherLiveSnapshot; cachedAt: number }>();
const snapshotInFlight = new Map<string, Promise<DishwasherLiveSnapshot | null>>();
const sharedEventSources = new Map<string, SharedEventSourceEntry>();

interface HomeConnectFeature {
  key?: string;
  value?: boolean | number | string;
  unit?: string;
  name?: string;
  displayvalue?: string;
}

interface HomeConnectApplianceResponse {
  data?: {
    brand?: string;
    connected?: boolean;
    enumber?: string;
    haId?: string;
    name?: string;
    type?: string;
    vib?: string;
  };
}

interface HomeConnectStatusResponse {
  data?: {
    status?: HomeConnectFeature[];
  };
}

interface HomeConnectActiveProgramResponse {
  data?: {
    key?: string;
    name?: string;
    options?: HomeConnectFeature[];
  };
}

interface HomeConnectEventPayload {
  items?: HomeConnectFeature[];
}

export interface DishwasherLiveSnapshot {
  binding: DishwasherBinding;
  connected: boolean;
  deviceModel?: string;
  deviceSerial?: string;
  operationState?: string;
  programName?: string;
  remainingProgramSeconds?: number;
  programProgress?: number;
  updatedAt: string;
}

interface SharedEventSourceListener {
  binding: DishwasherBinding;
  onEvent: (eventType: string, binding: DishwasherBinding, data: string) => void;
}

interface SharedEventSourceEntry {
  eventSource: EventSource;
  listeners: Map<number, SharedEventSourceListener>;
  nextListenerId: number;
}

function buildApiUrl(pathname: string) {
  return `${HOME_CONNECT_BASE_URL}${pathname}`;
}

async function fetchJson<T>(pathname: string, allowFailure = false): Promise<T | null> {
  const response = await fetch(buildApiUrl(pathname));
  if (!response.ok) {
    if (allowFailure) {
      return null;
    }

    throw new Error(`Home Connect request failed: ${response.status} ${pathname}`);
  }

  return response.json() as Promise<T>;
}

function findFeature(features: HomeConnectFeature[] | undefined, token: string) {
  const normalizedToken = token.toLowerCase();
  return (features || []).find((feature) =>
    String(feature.key || '').toLowerCase().includes(normalizedToken),
  );
}

function getStringValue(feature?: HomeConnectFeature) {
  if (!feature) return undefined;
  if (typeof feature.displayvalue === 'string' && feature.displayvalue) return feature.displayvalue;
  if (typeof feature.value === 'string' && feature.value) return feature.value;
  return undefined;
}

function getRawStringValue(feature?: HomeConnectFeature) {
  return typeof feature?.value === 'string' ? feature.value : undefined;
}

function getNumberValue(feature?: HomeConnectFeature) {
  return typeof feature?.value === 'number' ? feature.value : undefined;
}

function getBooleanValue(feature?: HomeConnectFeature) {
  return typeof feature?.value === 'boolean' ? feature.value : undefined;
}

function getProgramNameFromKey(programKey?: string, fallbackName?: string) {
  const normalizedKey = String(programKey || '').trim();
  if (normalizedKey.includes('.')) {
    const segments = normalizedKey.split('.').filter(Boolean);
    return segments[segments.length - 1] || fallbackName;
  }

  return fallbackName;
}

function deriveStationStatus(connected: boolean, operationState?: string): StationStatus {
  const normalizedState = operationState?.toLowerCase() || '';

  if (!connected) return 'Disconnected';
  if (!normalizedState) return 'Idle';
  if (normalizedState.includes('operationstate.error') || normalizedState.includes('错误') || normalizedState.includes('故障')) return 'Fault';
  if (normalizedState.includes('operationstate.run') || normalizedState.includes('运行')) return 'Running';
  if (normalizedState.includes('operationstate.finished') || normalizedState.includes('完成') || normalizedState.includes('结束')) return 'Completed';
  return 'Idle';
}

function getNormalizedTimeRemaining(status: StationStatus, remainingProgramSeconds?: number) {
  if (typeof remainingProgramSeconds === 'number') {
    return Math.max(0, Math.ceil(remainingProgramSeconds / 60));
  }

  if (status === 'Running') {
    return undefined;
  }

  return 0;
}

function getNormalizedProgramName(status: StationStatus, programName?: string, fallbackProgramName?: string) {
  if (programName) return programName;
  if (status === 'Running') return fallbackProgramName;
  return undefined;
}

function deriveTotalTimeMinutes(station: Station, remainingProgramSeconds?: number, programProgress?: number) {
  if (
    typeof remainingProgramSeconds !== 'number' ||
    typeof programProgress !== 'number' ||
    programProgress <= 0 ||
    programProgress >= 100
  ) {
    return station.total_time;
  }

  const completionRatio = Math.max(0.01, 1 - (programProgress / 100));
  const estimatedTotalMinutes = Math.ceil((remainingProgramSeconds / completionRatio) / 60);
  return Math.max(station.total_time, estimatedTotalMinutes);
}

function deriveDeviceModel(appliance?: HomeConnectApplianceResponse['data']) {
  if (!appliance) return undefined;
  return appliance.vib || appliance.enumber || appliance.name || undefined;
}

function deriveDeviceSerial(appliance?: HomeConnectApplianceResponse['data']) {
  if (!appliance) return undefined;
  return appliance.enumber || appliance.haId || undefined;
}

function parseEventPayload(rawData: string) {
  try {
    const parsed = JSON.parse(rawData) as HomeConnectEventPayload;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export async function fetchDishwasherSnapshot(binding: DishwasherBinding): Promise<DishwasherLiveSnapshot | null> {
  const cacheKey = binding.haId;
  const cached = snapshotCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt <= SNAPSHOT_CACHE_TTL_MS) {
    return {
      ...cached.snapshot,
      binding,
    };
  }

  const inFlight = snapshotInFlight.get(cacheKey);
  if (inFlight) {
    const snapshot = await inFlight;
    return snapshot ? { ...snapshot, binding } : null;
  }

  const snapshotPromise = (async () => {
    const applianceResponse = await fetchJson<HomeConnectApplianceResponse>(
      `/proxy/homeappliances/${encodeURIComponent(binding.haId)}`,
    );
    const statusResponse = await fetchJson<HomeConnectStatusResponse>(
      `/proxy/homeappliances/${encodeURIComponent(binding.haId)}/status`,
    );
    const activeProgramResponse = await fetchJson<HomeConnectActiveProgramResponse>(
      `/proxy/homeappliances/${encodeURIComponent(binding.haId)}/programs/active`,
      true,
    );

    if (!applianceResponse?.data) {
      return null;
    }

    const statusFeatures = statusResponse?.data?.status || [];
    const activeProgramOptions = activeProgramResponse?.data?.options || [];
    const operationState =
      getRawStringValue(findFeature(statusFeatures, 'operationstate')) ||
      getStringValue(findFeature(statusFeatures, 'operationstate'));
    const remainingProgramSeconds =
      getNumberValue(findFeature(activeProgramOptions, 'remainingprogramtime')) ??
      getNumberValue(findFeature(statusFeatures, 'remainingprogramtime'));
    const programProgress = getNumberValue(findFeature(activeProgramOptions, 'programprogress'));

    const snapshot: DishwasherLiveSnapshot = {
      binding,
      connected: applianceResponse.data.connected !== false,
      deviceModel: deriveDeviceModel(applianceResponse.data),
      deviceSerial: deriveDeviceSerial(applianceResponse.data),
      operationState,
      programName: getProgramNameFromKey(activeProgramResponse?.data?.key, activeProgramResponse?.data?.name),
      remainingProgramSeconds,
      programProgress,
      updatedAt: new Date().toISOString(),
    };

    snapshotCache.set(cacheKey, {
      snapshot,
      cachedAt: Date.now(),
    });

    return snapshot;
  })().finally(() => {
    snapshotInFlight.delete(cacheKey);
  });

  snapshotInFlight.set(cacheKey, snapshotPromise);
  const snapshot = await snapshotPromise;
  return snapshot ? { ...snapshot, binding } : null;
}

export async function fetchDishwasherSnapshots(bindings: DishwasherBinding[]) {
  const snapshots = await Promise.all(
    bindings.map(async (binding) => {
      try {
        return await fetchDishwasherSnapshot(binding);
      } catch (error) {
        console.error(`[dishwasherData] Failed to fetch ${binding.haId}`, error);
        return null;
      }
    }),
  );

  return snapshots.filter((snapshot): snapshot is DishwasherLiveSnapshot => snapshot !== null);
}

export function applyDishwasherSnapshots(stations: Station[], snapshots: DishwasherLiveSnapshot[]) {
  const snapshotsByHaId = new Map(snapshots.map((snapshot) => [snapshot.binding.haId, snapshot]));

  return stations.map((station) => {
    const snapshot = Array.from(snapshotsByHaId.values()).find(
      (candidate) =>
        candidate.binding.stationId === station.id ||
        candidate.binding.stationSlotCode === station.slot_code ||
        station.binding_haId === candidate.binding.haId,
    );

    if (!snapshot) return station;

    const status = deriveStationStatus(snapshot.connected, snapshot.operationState);
    const remainingProgramSeconds = snapshot.remainingProgramSeconds;
    const programProgress = snapshot.programProgress;
    const normalizedTimeRemaining = getNormalizedTimeRemaining(status, remainingProgramSeconds);

    return {
      ...station,
      slot_code: snapshot.binding.displaySlotCode,
      device_model: snapshot.deviceModel ?? station.device_model,
      device_sn: snapshot.deviceSerial ?? station.device_sn,
      status,
      time_remaining: normalizedTimeRemaining ?? station.time_remaining,
      total_time: deriveTotalTimeMinutes(station, remainingProgramSeconds, programProgress),
      program_name: getNormalizedProgramName(status, snapshot.programName, station.program_name),
      temperature_c: undefined,
      inflow_l: undefined,
      updated_at: snapshot.updatedAt,
      data_source: 'home-connect',
      binding_haId: snapshot.binding.haId,
      homeconnect_remaining_seconds: remainingProgramSeconds,
      homeconnect_program_progress: programProgress,
    };
  });
}

export function applyDishwasherEvent(station: Station, eventType: string, rawData: string) {
  if (station.data_source !== 'home-connect' || !station.binding_haId) {
    return station;
  }

  const nextStation: Station = {
    ...station,
    updated_at: new Date().toISOString(),
  };

  if (eventType === 'CONNECTED') {
    nextStation.status = station.status === 'Disconnected' ? 'Idle' : station.status;
    return nextStation;
  }

  if (eventType === 'DISCONNECTED') {
    nextStation.status = 'Disconnected';
    return nextStation;
  }

  const items = parseEventPayload(rawData);
  if (!items.length) {
    return nextStation;
  }

  const operationState =
    getRawStringValue(findFeature(items, 'operationstate')) ||
    getStringValue(findFeature(items, 'operationstate'));
  if (operationState) {
    nextStation.status = deriveStationStatus(true, operationState);
  }

  const remainingProgramSeconds = getNumberValue(findFeature(items, 'remainingprogramtime'));
  if (typeof remainingProgramSeconds === 'number') {
    nextStation.homeconnect_remaining_seconds = remainingProgramSeconds;
    nextStation.time_remaining = Math.max(0, Math.ceil(remainingProgramSeconds / 60));
  }

  const programProgress = getNumberValue(findFeature(items, 'programprogress'));
  if (typeof programProgress === 'number') {
    nextStation.homeconnect_program_progress = programProgress;
  }

  nextStation.temperature_c = undefined;
  nextStation.inflow_l = undefined;

  if (eventType === 'EVENT') {
    const programFinished = items.some((item) =>
      String(item.key || '').toLowerCase().includes('programfinished'),
    );

    if (programFinished) {
      nextStation.status = 'Completed';
      nextStation.homeconnect_remaining_seconds = 0;
      nextStation.time_remaining = 0;
      nextStation.program_name = undefined;
      nextStation.cycles += 1;
    }
  }

  if (nextStation.status !== 'Running') {
    nextStation.time_remaining = 0;
    nextStation.homeconnect_remaining_seconds = 0;

    if (nextStation.status === 'Completed' || nextStation.status === 'Idle') {
      nextStation.program_name = undefined;
    }
  }

  nextStation.total_time = deriveTotalTimeMinutes(
    nextStation,
    nextStation.homeconnect_remaining_seconds,
    nextStation.homeconnect_program_progress,
  );

  return nextStation;
}

export function subscribeToDishwasherEvents(
  binding: DishwasherBinding,
  onEvent: (eventType: string, binding: DishwasherBinding, data: string) => void,
) {
  let sharedEntry = sharedEventSources.get(binding.haId);

  if (!sharedEntry) {
    const eventSource = new EventSource(buildApiUrl(`/events/${encodeURIComponent(binding.haId)}`));
    sharedEntry = {
      eventSource,
      listeners: new Map(),
      nextListenerId: 1,
    };

    SSE_EVENT_TYPES.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event) => {
        const currentEntry = sharedEventSources.get(binding.haId);
        if (!currentEntry) return;

        currentEntry.listeners.forEach((listener) => {
          listener.onEvent(eventType, listener.binding, event.data);
        });
      });
    });

    eventSource.onerror = () => {
      console.warn(`[dishwasherData] SSE stream interrupted for ${binding.haId}`);
    };

    sharedEventSources.set(binding.haId, sharedEntry);
  }

  const listenerId = sharedEntry.nextListenerId++;
  sharedEntry.listeners.set(listenerId, { binding, onEvent });

  return () => {
    const currentEntry = sharedEventSources.get(binding.haId);
    if (!currentEntry) return;

    currentEntry.listeners.delete(listenerId);
    if (currentEntry.listeners.size === 0) {
      currentEntry.eventSource.close();
      sharedEventSources.delete(binding.haId);
    }
  };
}