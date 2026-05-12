/**
 * Home Connect Dishwasher Monitor - Local Development Server
 * 
 * This server handles OAuth2 Authorization Code Flow for Home Connect API
 * and proxies API calls to avoid browser CORS restrictions.
 * 
 * Usage: node server.js
 * Then open: http://localhost:3000
 */

import http from 'http';
import https from 'https';
import { execFile, spawn } from 'child_process';
import crypto from 'crypto';
import url from 'url';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readLocalConfig() {
  const configPath = path.join(__dirname, 'homeconnect.local.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

const LOCAL_CONFIG = readLocalConfig();

// ─────────────────────────────────────────────────────────
// Corporate proxy support via PowerShell Invoke-WebRequest
//
// Bosch corporate proxy (rb-proxy-de.bosch.com:8080) requires
// NTLM/NEGOTIATE authentication. Windows SSO handles this
// automatically via -ProxyUseDefaultCredentials in PowerShell.
//
// httpsRequest() spawns a PowerShell Invoke-WebRequest call so
// that Windows NTLM credentials are applied transparently.
// ─────────────────────────────────────────────────────────

function getProxy() {
  const raw = process.env.HTTPS_PROXY || process.env.https_proxy ||
              process.env.HTTP_PROXY  || process.env.http_proxy  || '';
  if (!raw) return null;
  try {
    const p = new URL(raw);
    return `${p.protocol}//${p.hostname}:${p.port || 8080}`;
  } catch { return null; }
}

const PROXY_URL = getProxy();
if (PROXY_URL) {
  console.log(`[Proxy] Using corporate proxy (NTLM SSO): ${PROXY_URL}`);
} else {
  console.log('[Proxy] No proxy detected — using direct connection');
}

/**
 * Escape a string for safe use inside a PowerShell single-quoted string.
 * Single quotes are escaped by doubling them.
 */
function psEscape(str) {
  return String(str).replace(/'/g, "''");
}

/**
 * Make an HTTPS request using PowerShell Invoke-WebRequest.
 * Handles corporate NTLM proxy authentication automatically via Windows SSO.
 * Returns { status, headers, body }.
 */
function httpsRequest(options, body = null) {
  const targetHost = options.hostname || options.host;
  const targetPath = options.path || '/';
  const method = (options.method || 'GET').toUpperCase();
  const reqHeaders = options.headers || {};

  const uri = `https://${targetHost}${targetPath}`;

  // Build PowerShell headers hashtable string.
  // Skip Content-Length and Content-Type — PowerShell sets these from -Body/-ContentType.
  const contentType = Object.entries(reqHeaders)
    .find(([k]) => k.toLowerCase() === 'content-type')?.[1];
  const contentTypeParam = contentType
    ? `-ContentType '${psEscape(contentType)}'`
    : '';

  const headerEntries = Object.entries(reqHeaders)
    .filter(([k]) => k.toLowerCase() !== 'content-length')
    .filter(([k]) => k.toLowerCase() !== 'content-type')
    .map(([k, v]) => `'${psEscape(k)}' = '${psEscape(v)}'`)
    .join('; ');
  const headersParam = headerEntries
    ? `-Headers @{${headerEntries}}`
    : '';

  // Build body param
  let bodyParam = '';
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    bodyParam = `-Body '${psEscape(body)}'`;
  }

  // Build proxy params
  const proxyParam = PROXY_URL
    ? `-Proxy '${psEscape(PROXY_URL)}' -ProxyUseDefaultCredentials`
    : '';

  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
try {
  $response = Invoke-WebRequest \`
    -Uri '${psEscape(uri)}' \`
    -Method '${method}' \`
    ${proxyParam} \`
    -UseBasicParsing \`
    ${contentTypeParam} \`
    ${headersParam} \`
    ${bodyParam}
  $responseBody = if ($response.Content -is [byte[]]) {
    [System.Text.Encoding]::UTF8.GetString($response.Content)
  } else {
    [string]$response.Content
  }
  $out = @{
    status  = [int]$response.StatusCode
    headers = ($response.Headers | ConvertTo-Json -Compress -Depth 3)
    body    = $responseBody
  }
  $out | ConvertTo-Json -Compress -Depth 5
} catch [System.Net.WebException] {
  $ex = $_.Exception
  if ($ex.Response) {
    $st = [int]$ex.Response.StatusCode
    $stream = $ex.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $b = $reader.ReadToEnd()
    $out = @{
      status = $st
      headers = ($ex.Response.Headers | ConvertTo-Json -Compress -Depth 3)
      body = $b
    }
  } else {
    $out = @{ status = 0; headers = '{}'; body = $ex.Message }
  }
  $out | ConvertTo-Json -Compress -Depth 3
} catch {
  @{ status = 0; headers = '{}'; body = $_.ToString() } | ConvertTo-Json -Compress
}
`.trim();

  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && !stdout) {
          return reject(new Error(`PowerShell error: ${err.message}\n${stderr}`));
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          const rawHeaders = parsed.headers || '{}';
          let headers = {};
          try {
            const h = JSON.parse(rawHeaders);
            // Normalize: PowerShell gives array or string values
            for (const [k, v] of Object.entries(h)) {
              headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : String(v);
            }
          } catch { /* ignore header parse errors */ }
          resolve({
            status: parsed.status || 0,
            headers,
            body: parsed.body || '',
          });
        } catch (parseErr) {
          reject(new Error(`Failed to parse PowerShell output: ${stdout}\n${stderr}`));
        }
      }
    );
  });
}

// ─────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────
const CONFIG = {
  CLIENT_ID: process.env.HC_CLIENT_ID || LOCAL_CONFIG.client_id || '9CC5D656C48063DFB645CEF04D0565DC7977C382E315F574343AE6ECBA4EE9DD',
  CLIENT_SECRET: process.env.HC_CLIENT_SECRET || LOCAL_CONFIG.client_secret || '',
  REDIRECT_URI: process.env.HC_REDIRECT_URI || LOCAL_CONFIG.redirect_uri || 'http://localhost:4000/oauth/callback',
  SCOPE: process.env.HC_SCOPE || LOCAL_CONFIG.scope || 'IdentifyAppliance Dishwasher-Monitor',
  HC_AUTHORIZE_HOST: process.env.HC_AUTHORIZE_HOST || LOCAL_CONFIG.authorize_host || 'api.home-connect.cn',
  HC_TOKEN_HOST: process.env.HC_TOKEN_HOST || LOCAL_CONFIG.token_host || LOCAL_CONFIG.auth_host || 'api.home-connect.cn',
  HC_API_HOST: process.env.HC_API_HOST || LOCAL_CONFIG.api_host || 'api.home-connect.cn',
  PORT: Number(process.env.PORT || LOCAL_CONFIG.port || 4000),
  ADMIN_PORT: Number(process.env.ADMIN_PORT || LOCAL_CONFIG.admin_port || 4001),
  USE_PKCE: String(process.env.HC_USE_PKCE ?? LOCAL_CONFIG.use_pkce ?? 'false').toLowerCase() === 'true',
};

console.log('[Config] Client ID:', `${CONFIG.CLIENT_ID.slice(0, 8)}...${CONFIG.CLIENT_ID.slice(-6)}`);
console.log('[Config] Client secret configured:', CONFIG.CLIENT_SECRET ? 'yes' : 'no');
console.log('[Config] Scope:', CONFIG.SCOPE);
console.log('[Config] Authorize host:', CONFIG.HC_AUTHORIZE_HOST);
console.log('[Config] Token host:', CONFIG.HC_TOKEN_HOST);
console.log('[Config] PKCE enabled:', CONFIG.USE_PKCE ? 'yes' : 'no');
if (!CONFIG.CLIENT_SECRET) {
  console.warn('[Config] Home Connect Authorization Code Flow requires client_secret for token exchange. Set HC_CLIENT_SECRET or GetDWinfo/homeconnect.local.json.');
}

// ─────────────────────────────────────────────────────────
// PKCE helpers (RFC 7636)
// ─────────────────────────────────────────────────────────
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url'); // 43-char URL-safe string
}
function computeCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// In-memory state
let tokenData = null;
let deviceFlowData = null;
let lastTokenError = null;
let pendingCodeVerifier = null; // PKCE verifier stored between /auth/login and /oauth/callback
let pendingOAuthState = null;
let lastLoginStartedAt = null;
let lastLogoutAt = null;

const APPLIANCE_LIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const APPLIANCE_LIST_CACHE_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const APPLIANCE_DETAIL_CACHE_TTL_MS = 15 * 1000;
const APPLIANCE_DETAIL_CACHE_MAX_STALE_MS = 5 * 60 * 1000;
const APPLIANCE_STATUS_CACHE_TTL_MS = 5 * 1000;
const APPLIANCE_STATUS_CACHE_MAX_STALE_MS = 60 * 1000;
const APPLIANCE_PROGRAM_CACHE_TTL_MS = 5 * 1000;
const APPLIANCE_PROGRAM_CACHE_MAX_STALE_MS = 60 * 1000;
const APPLIANCE_SETTINGS_CACHE_TTL_MS = 30 * 1000;
const APPLIANCE_SETTINGS_CACHE_MAX_STALE_MS = 5 * 60 * 1000;
const APPLIANCE_ENDPOINT_DEFAULT_COOLDOWN_MS = 60 * 1000;
const SSE_UPSTREAM_RECONNECT_THROTTLE_MS = 15 * 1000;
const SSE_UPSTREAM_429_RECONNECT_THROTTLE_MS = 60 * 1000;
let applianceListCache = null;
let applianceListInFlight = null;
const applianceEndpointCache = new Map();
const applianceEndpointInFlight = new Map();
const applianceEndpointCooldowns = new Map();
const REQUEST_LOG_LIMIT = 100;
let requestLogEntries = [];
let totalUpstreamErrorCount = 0;
let activeSseChannelCount = 0;
let lastRetryAfterDetails = null;
let stationRegistry = [];
const recentCycleIncrementSignatures = new Map();
const sharedSseChannels = new Map();
const aggregateLiveStationClients = new Set();
const LIVE_STATION_KEEPALIVE_MS = 25 * 1000;
const STATION_DEVICE_MODELS = ['QMT-300', 'QMT-500', 'WD-Pro', 'HD-Max'];
const STATION_PROGRAMS = ['Magic Daily', 'Maximum Cleaning', 'Quick Washer', 'ECO', 'Glass Washer'];
const STATION_STATUS_POOL = [
  ...Array(85).fill('Running'),
  ...Array(18).fill('Idle'),
  ...Array(8).fill('Completed'),
  ...Array(5).fill('Fault'),
  ...Array(2).fill('Disconnected'),
];
let liveStationState = new Map();
let lastLiveStationRefreshAt = null;
let lastLiveStationRefreshSummary = null;

const LOGIN_COOLDOWN_SECONDS = 10 * 60;

// ─────────────────────────────────────────────────────────
// Token file persistence
// ─────────────────────────────────────────────────────────
const TOKEN_FILE = path.join(__dirname, '.token.json');
const APPLIANCE_CACHE_FILE = path.join(__dirname, '.appliances-cache.json');
const STATION_REGISTRY_FILE = path.join(__dirname, 'station-registry.json');
const REGISTRY_ADMIN_HTML_FILE = path.join(__dirname, 'registry-admin.html');
const CYCLE_INCREMENT_DEDUP_WINDOW_MS = 60 * 1000;

const REGISTRY_GROUPS = [
  { id: 'A', slotCount: 12, idPrefix: 'A', slotPrefix: 'A' },
  { id: '1', slotCount: 24, idPrefix: '1-', slotPrefix: '1-' },
  { id: '2', slotCount: 24, idPrefix: '2-', slotPrefix: '2-' },
  { id: '3', slotCount: 24, idPrefix: '3-', slotPrefix: '3-' },
  { id: '4', slotCount: 24, idPrefix: '4-', slotPrefix: '4-' },
  { id: 'V', slotCount: 10, idPrefix: 'V-', slotPrefix: 'V-' },
];

function saveToken(data) {
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(data), 'utf8'); } catch {}
}
function loadToken() {
  try {
    const raw = fs.readFileSync(TOKEN_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data?.access_token && !data?.refresh_token) return null;
    return data;
  } catch { return null; }
}
function clearToken() {
  try { if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE); } catch {}
}

function buildDefaultStationRegistry() {
  const entries = [];

  for (const group of REGISTRY_GROUPS) {
    for (let index = 1; index <= group.slotCount; index += 1) {
      const paddedIndex = String(index).padStart(2, '0');
      entries.push({
        stationId: `${group.idPrefix}${paddedIndex}`,
        group: group.id,
        slotCode: `${group.slotPrefix}${index}`,
        haId: '',
        vib: '',
        snr: '',
        cycles: 0,
      });
    }
  }

  return entries;
}

function normalizeRegistryEntry(entry, fallback = {}) {
  if (!entry || typeof entry !== 'object') return null;

  const stationId = String(entry.stationId || fallback.stationId || '').trim();
  if (!stationId) return null;

  return {
    stationId,
    group: String(entry.group || fallback.group || '').trim(),
    slotCode: String(entry.slotCode || fallback.slotCode || '').trim(),
    haId: String(entry.haId || fallback.haId || '').trim(),
    vib: String(entry.vib || fallback.vib || '').trim(),
    snr: String(entry.snr || fallback.snr || '').trim(),
    cycles: Math.max(0, Number.parseInt(String(entry.cycles ?? fallback.cycles ?? 0), 10) || 0),
  };
}

function sortRegistryEntries(entries) {
  return [...entries].sort((left, right) =>
    String(left.stationId).localeCompare(String(right.stationId), undefined, { numeric: true }),
  );
}

function mergeRegistryWithDefaults(existingEntries) {
  const defaults = buildDefaultStationRegistry();
  const existingMap = new Map(
    (Array.isArray(existingEntries) ? existingEntries : [])
      .map((entry) => normalizeRegistryEntry(entry))
      .filter(Boolean)
      .map((entry) => [entry.stationId, entry]),
  );

  const merged = defaults.map((defaultEntry) => {
    const existing = existingMap.get(defaultEntry.stationId);
    return normalizeRegistryEntry(existing || defaultEntry, defaultEntry);
  });

  return sortRegistryEntries(merged);
}

function saveStationRegistry(entries) {
  stationRegistry = sortRegistryEntries(entries.map((entry) => normalizeRegistryEntry(entry)).filter(Boolean));
  fs.writeFileSync(STATION_REGISTRY_FILE, JSON.stringify(stationRegistry, null, 2), 'utf8');
  rebuildLiveStationStateFromRegistry();
  syncAggregateLiveStationChannels();
  return stationRegistry;
}

function loadStationRegistry() {
  let parsedEntries = [];

  try {
    if (fs.existsSync(STATION_REGISTRY_FILE)) {
      parsedEntries = JSON.parse(fs.readFileSync(STATION_REGISTRY_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('[Registry] Failed to parse station-registry.json, rebuilding from defaults.', error.message);
  }

  const merged = mergeRegistryWithDefaults(parsedEntries);
  saveStationRegistry(merged);
  return stationRegistry;
}

function getStationRegistry() {
  if (!stationRegistry.length) {
    return loadStationRegistry();
  }

  return stationRegistry;
}

function upsertStationRegistryEntry(stationId, patch) {
  const currentEntries = getStationRegistry();
  const currentEntry = currentEntries.find((entry) => entry.stationId === stationId);
  const fallback = currentEntry || { stationId };
  const nextEntry = normalizeRegistryEntry({ ...fallback, ...patch, stationId }, fallback);
  if (!nextEntry) {
    throw new Error('invalid_station_registry_entry');
  }

  const nextEntries = currentEntries.map((entry) =>
    entry.stationId === stationId ? nextEntry : entry,
  );

  saveStationRegistry(nextEntries);
  return nextEntry;
}

function incrementRegistryCycleByStationId(stationId) {
  const currentEntries = getStationRegistry();
  const currentEntry = currentEntries.find((entry) => entry.stationId === stationId);
  if (!currentEntry) {
    throw new Error('station_registry_entry_not_found');
  }

  return upsertStationRegistryEntry(stationId, { cycles: currentEntry.cycles + 1 });
}

function findRegistryEntryByHaId(haId) {
  const normalizedHaId = String(haId || '').trim();
  if (!normalizedHaId) return null;
  return getStationRegistry().find((entry) => entry.haId === normalizedHaId) || null;
}

function incrementRegistryCycleByHaId(haId) {
  const entry = findRegistryEntryByHaId(haId);
  if (!entry) {
    return null;
  }

  return incrementRegistryCycleByStationId(entry.stationId);
}

function isDuplicateCycleIncrement(haId, signature) {
  const now = Date.now();
  const key = `${haId}::${signature}`;
  const previousTime = recentCycleIncrementSignatures.get(key);

  for (const [existingKey, existingTime] of recentCycleIncrementSignatures.entries()) {
    if (now - existingTime > CYCLE_INCREMENT_DEDUP_WINDOW_MS) {
      recentCycleIncrementSignatures.delete(existingKey);
    }
  }

  if (previousTime && now - previousTime <= CYCLE_INCREMENT_DEDUP_WINDOW_MS) {
    return true;
  }

  recentCycleIncrementSignatures.set(key, now);
  return false;
}

function parseSseDataItems(dataText) {
  try {
    const parsed = JSON.parse(dataText);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function maybeIncrementCycleFromSseEvent(haId, eventType, dataText) {
  const items = parseSseDataItems(dataText);
  if (!items.length) return;

  const finishItem = items.find((item) =>
    String(item?.key || '').toLowerCase().includes('programfinished'),
  );

  if (!finishItem || String(eventType || '').toUpperCase() !== 'EVENT') {
    return;
  }

  const signature = `${eventType}:${String(finishItem.key || '')}:${dataText.trim()}`;
  if (isDuplicateCycleIncrement(haId, signature)) {
    return;
  }

  const updatedEntry = incrementRegistryCycleByHaId(haId);
  if (updatedEntry) {
    updateLiveStationCyclesFromRegistryEntry(updatedEntry);
    console.log(`[Registry] Cycle incremented from SSE finish: ${updatedEntry.stationId} -> ${updatedEntry.cycles}`);
  }
}

function stableHash(input) {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function buildStatusAssignments(count) {
  const assignments = [...STATION_STATUS_POOL];
  for (let index = assignments.length - 1; index > 0; index -= 1) {
    const swapIndex = (index * 1103515245 + 12345) % assignments.length;
    [assignments[index], assignments[swapIndex]] = [assignments[swapIndex], assignments[index]];
  }

  if (count <= assignments.length) {
    return assignments.slice(0, count);
  }

  const expanded = [];
  for (let index = 0; index < count; index += 1) {
    expanded.push(assignments[index % assignments.length]);
  }
  return expanded;
}

function buildStableDeviceSerial(stationId) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const hash = stableHash(`${stationId}:serial`);
  const first = letters[hash % letters.length];
  const second = letters[Math.floor(hash / 17) % letters.length];
  const digits = String(hash % 1000).padStart(3, '0');
  const third = letters[Math.floor(hash / 31) % letters.length];
  const fourth = letters[Math.floor(hash / 53) % letters.length];
  const suffixDigit = Math.floor(hash / 97) % 10;
  const suffixFirst = letters[Math.floor(hash / 131) % letters.length];
  const suffixSecond = letters[Math.floor(hash / 173) % letters.length];
  return `${first}${second}${digits}${third}${fourth}.${suffixDigit}${suffixFirst}${suffixSecond}`;
}

function findFeature(features, token) {
  const normalizedToken = String(token || '').toLowerCase();
  return (Array.isArray(features) ? features : []).find((feature) =>
    String(feature?.key || '').toLowerCase().includes(normalizedToken),
  );
}

function getFeatureDisplayString(feature) {
  if (!feature || typeof feature !== 'object') return undefined;
  if (typeof feature.displayvalue === 'string' && feature.displayvalue) return feature.displayvalue;
  if (typeof feature.value === 'string' && feature.value) return feature.value;
  return undefined;
}

function getFeatureRawString(feature) {
  return typeof feature?.value === 'string' ? feature.value : undefined;
}

function getFeatureNumber(feature) {
  return typeof feature?.value === 'number' ? feature.value : undefined;
}

function deriveStationStatus(connected, operationState) {
  const normalizedState = String(operationState || '').toLowerCase();

  if (!connected) return 'Disconnected';
  if (!normalizedState) return 'Idle';
  if (normalizedState.includes('operationstate.error') || normalizedState.includes('错误') || normalizedState.includes('故障')) return 'Fault';
  if (normalizedState.includes('operationstate.run') || normalizedState.includes('运行')) return 'Running';
  if (normalizedState.includes('operationstate.finished') || normalizedState.includes('完成') || normalizedState.includes('结束')) return 'Completed';
  return 'Idle';
}

function getProgramNameFromKey(programKey, fallbackName) {
  const normalizedKey = String(programKey || '').trim();
  if (normalizedKey.includes('.')) {
    const segments = normalizedKey.split('.').filter(Boolean);
    return segments[segments.length - 1] || fallbackName;
  }
  return fallbackName;
}

function deriveTotalTimeMinutes(station, remainingProgramSeconds, programProgress) {
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

function sortLiveStations(stations) {
  return [...stations].sort((left, right) =>
    String(left.id).localeCompare(String(right.id), undefined, { numeric: true }),
  );
}

function writeAggregateClientChunk(client, chunk) {
  if (client.res.writableEnded || client.res.destroyed) return false;
  try {
    client.res.write(chunk);
    return true;
  } catch {
    return false;
  }
}

function pruneAggregateClients() {
  for (const client of aggregateLiveStationClients) {
    if (client.res.writableEnded || client.res.destroyed) {
      aggregateLiveStationClients.delete(client);
    }
  }
}

function broadcastAggregateLiveStationEvent(eventType, payload) {
  pruneAggregateClients();
  const chunk = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of aggregateLiveStationClients) {
    if (!writeAggregateClientChunk(client, chunk)) {
      aggregateLiveStationClients.delete(client);
    }
  }
}

function buildLiveStationMeta() {
  const boundStations = getStationRegistry().filter((entry) => entry.haId);
  return {
    stationCount: liveStationState.size,
    boundStationCount: boundStations.length,
    initializedAt: lastLiveStationRefreshAt,
    lastRefreshSummary: lastLiveStationRefreshSummary,
  };
}

function getLiveStationsPayload() {
  return {
    data: sortLiveStations(Array.from(liveStationState.values())),
    meta: buildLiveStationMeta(),
  };
}

function getLiveStationById(stationId) {
  return liveStationState.get(stationId) || null;
}

function buildDefaultLiveStation(entry, index, statusAssignments) {
  const stationId = String(entry.stationId || '').trim();
  const hash = stableHash(stationId);
  const defaultStatus = statusAssignments[index] || 'Idle';
  const totalTime = 45 + (hash % 75);
  const model = entry.vib || STATION_DEVICE_MODELS[hash % STATION_DEVICE_MODELS.length] || undefined;
  const serial = entry.snr || buildStableDeviceSerial(stationId);

  if (entry.haId) {
    return {
      id: stationId,
      group: entry.group,
      slot_code: entry.slotCode || stationId,
      device_model: entry.vib || model,
      device_sn: entry.snr || serial,
      status: 'Disconnected',
      time_remaining: 0,
      total_time: totalTime,
      cycles: entry.cycles,
      program_name: undefined,
      temperature_c: undefined,
      inflow_l: undefined,
      updated_at: new Date().toISOString(),
      data_source: 'home-connect',
      binding_haId: entry.haId || undefined,
      homeconnect_remaining_seconds: undefined,
      homeconnect_program_progress: undefined,
    };
  }

  return {
    id: stationId,
    group: entry.group,
    slot_code: entry.slotCode || stationId,
    device_model: model,
    device_sn: serial,
    status: defaultStatus,
    time_remaining: defaultStatus === 'Running' ? hash % Math.max(1, totalTime) : 0,
    total_time: totalTime,
    cycles: entry.cycles,
    program_name: defaultStatus !== 'Idle' && defaultStatus !== 'Disconnected'
      ? STATION_PROGRAMS[hash % STATION_PROGRAMS.length]
      : undefined,
    temperature_c: undefined,
    inflow_l: undefined,
    updated_at: new Date().toISOString(),
    data_source: 'mock',
    binding_haId: undefined,
    homeconnect_remaining_seconds: undefined,
    homeconnect_program_progress: undefined,
  };
}

function buildLiveStationFromRegistryEntry(entry, existingStation, index, statusAssignments) {
  const defaultStation = buildDefaultLiveStation(entry, index, statusAssignments);
  const sameBinding = existingStation && String(existingStation.binding_haId || '') === String(entry.haId || '');

  if (!existingStation) {
    return defaultStation;
  }

  if (!entry.haId) {
    return {
      ...defaultStation,
      device_model: entry.vib || existingStation.device_model || defaultStation.device_model,
      device_sn: entry.snr || existingStation.device_sn || defaultStation.device_sn,
      cycles: entry.cycles,
      updated_at: existingStation.updated_at || defaultStation.updated_at,
    };
  }

  return {
    ...defaultStation,
    ...sameBinding ? existingStation : {},
    id: entry.stationId,
    group: entry.group,
    slot_code: entry.slotCode || defaultStation.slot_code,
    device_model: entry.vib || (sameBinding ? existingStation.device_model : defaultStation.device_model),
    device_sn: entry.snr || (sameBinding ? existingStation.device_sn : defaultStation.device_sn),
    cycles: entry.cycles,
    data_source: 'home-connect',
    binding_haId: entry.haId,
    updated_at: sameBinding ? existingStation.updated_at : defaultStation.updated_at,
    status: sameBinding ? existingStation.status : defaultStation.status,
    time_remaining: sameBinding ? existingStation.time_remaining : defaultStation.time_remaining,
    total_time: sameBinding ? existingStation.total_time : defaultStation.total_time,
    program_name: sameBinding ? existingStation.program_name : defaultStation.program_name,
    temperature_c: undefined,
    inflow_l: undefined,
    homeconnect_remaining_seconds: sameBinding ? existingStation.homeconnect_remaining_seconds : undefined,
    homeconnect_program_progress: sameBinding ? existingStation.homeconnect_program_progress : undefined,
  };
}

function setLiveStation(stationId, nextStation, reason = 'station-update') {
  liveStationState.set(stationId, nextStation);
  broadcastAggregateLiveStationEvent('station-update', {
    station: nextStation,
    reason,
  });
  return nextStation;
}

function rebuildLiveStationStateFromRegistry() {
  const entries = getStationRegistry();
  const statusAssignments = buildStatusAssignments(entries.length);
  const previousState = liveStationState;
  const nextState = new Map();

  entries.forEach((entry, index) => {
    const existingStation = previousState.get(entry.stationId);
    nextState.set(
      entry.stationId,
      buildLiveStationFromRegistryEntry(entry, existingStation, index, statusAssignments),
    );
  });

  liveStationState = nextState;
  return getLiveStationsPayload();
}

function updateLiveStationCyclesFromRegistryEntry(registryEntry) {
  if (!registryEntry?.stationId) return;
  const currentStation = getLiveStationById(registryEntry.stationId);
  if (!currentStation) return;

  setLiveStation(registryEntry.stationId, {
    ...currentStation,
    cycles: registryEntry.cycles,
    updated_at: new Date().toISOString(),
  }, 'cycle-update');
}

function parseStatusResponseBody(body) {
  try {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed?.data?.status) ? parsed : null;
  } catch {
    return null;
  }
}

function parseActiveProgramResponseBody(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed?.data && typeof parsed.data === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function buildLiveSnapshotFromResults(registryEntry, applianceResult, statusResult, activeProgramResult) {
  const appliance = parseApplianceDetailBody(applianceResult?.body || '')?.data;
  if (!appliance) return null;

  const statusFeatures = parseStatusResponseBody(statusResult?.body || '')?.data?.status || [];
  const activeProgram = parseActiveProgramResponseBody(activeProgramResult?.body || '')?.data || null;
  const activeProgramOptions = activeProgram?.options || [];
  const operationState =
    getFeatureRawString(findFeature(statusFeatures, 'operationstate')) ||
    getFeatureDisplayString(findFeature(statusFeatures, 'operationstate'));
  const connected = appliance.connected !== false;
  const remainingProgramSeconds =
    getFeatureNumber(findFeature(activeProgramOptions, 'remainingprogramtime')) ??
    getFeatureNumber(findFeature(statusFeatures, 'remainingprogramtime'));
  const programProgress = getFeatureNumber(findFeature(activeProgramOptions, 'programprogress'));
  const status = deriveStationStatus(connected, operationState);
  const existingStation = getLiveStationById(registryEntry.stationId) || buildDefaultLiveStation(registryEntry, 0, []);

  return {
    ...existingStation,
    id: registryEntry.stationId,
    group: registryEntry.group,
    slot_code: registryEntry.slotCode || existingStation.slot_code,
    device_model: registryEntry.vib || appliance.vib || appliance.enumber || appliance.name || existingStation.device_model,
    device_sn: registryEntry.snr || appliance.enumber || appliance.haId || existingStation.device_sn,
    status,
    time_remaining: typeof remainingProgramSeconds === 'number'
      ? Math.max(0, Math.ceil(remainingProgramSeconds / 60))
      : status === 'Running'
        ? existingStation.time_remaining
        : 0,
    total_time: deriveTotalTimeMinutes(existingStation, remainingProgramSeconds, programProgress),
    cycles: registryEntry.cycles,
    program_name: (() => {
      const nextProgramName = getProgramNameFromKey(activeProgram?.key, activeProgram?.name);
      if (nextProgramName) return nextProgramName;
      if (status === 'Running') return existingStation.program_name;
      return undefined;
    })(),
    temperature_c: undefined,
    inflow_l: undefined,
    updated_at: new Date().toISOString(),
    data_source: 'home-connect',
    binding_haId: registryEntry.haId,
    homeconnect_remaining_seconds: remainingProgramSeconds,
    homeconnect_program_progress: programProgress,
  };
}

async function loadBoundStationSnapshots() {
  const results = [];

  for (const registryEntry of getStationRegistry().filter((entry) => entry.haId)) {
    try {
      const applianceResult = await getProtectedApplianceResult(`/homeappliances/${encodeURIComponent(registryEntry.haId)}`, 'GET');
      if (applianceResult.status !== 200) {
        results.push({ stationId: registryEntry.stationId, haId: registryEntry.haId, ok: false, status: applianceResult.status });
        continue;
      }

      const statusResult = await getProtectedApplianceResult(`/homeappliances/${encodeURIComponent(registryEntry.haId)}/status`, 'GET');
      if (statusResult.status !== 200) {
        results.push({ stationId: registryEntry.stationId, haId: registryEntry.haId, ok: false, status: statusResult.status });
        continue;
      }

      const activeProgramResult = await getProtectedApplianceResult(`/homeappliances/${encodeURIComponent(registryEntry.haId)}/programs/active`, 'GET');
      const nextStation = buildLiveSnapshotFromResults(
        registryEntry,
        applianceResult,
        statusResult,
        activeProgramResult.status === 200 ? activeProgramResult : null,
      );

      if (!nextStation) {
        results.push({ stationId: registryEntry.stationId, haId: registryEntry.haId, ok: false, status: 502 });
        continue;
      }

      setLiveStation(registryEntry.stationId, nextStation, 'manual-refresh');
      results.push({ stationId: registryEntry.stationId, haId: registryEntry.haId, ok: true, status: 200 });
    } catch (error) {
      results.push({ stationId: registryEntry.stationId, haId: registryEntry.haId, ok: false, status: 500, error: error.message });
    }
  }

  lastLiveStationRefreshAt = Date.now();
  lastLiveStationRefreshSummary = {
    refreshedAt: lastLiveStationRefreshAt,
    total: results.length,
    success: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  };

  broadcastAggregateLiveStationEvent('refresh-complete', {
    meta: buildLiveStationMeta(),
    results,
  });

  return results;
}

function applySseDeltaToLiveStation(haId, eventType, dataText) {
  const registryEntry = findRegistryEntryByHaId(haId);
  if (!registryEntry) return null;

  const currentStation = getLiveStationById(registryEntry.stationId);
  if (!currentStation) return null;

  if (String(eventType || '').toUpperCase() === 'CONNECTED') {
    return setLiveStation(registryEntry.stationId, {
      ...currentStation,
      status: currentStation.status === 'Disconnected' ? 'Idle' : currentStation.status,
      updated_at: new Date().toISOString(),
      data_source: 'home-connect',
      binding_haId: registryEntry.haId,
    }, 'sse-connected');
  }

  if (String(eventType || '').toUpperCase() === 'DISCONNECTED') {
    return setLiveStation(registryEntry.stationId, {
      ...currentStation,
      status: 'Disconnected',
      updated_at: new Date().toISOString(),
      data_source: 'home-connect',
      binding_haId: registryEntry.haId,
    }, 'sse-disconnected');
  }

  const items = parseSseDataItems(dataText);
  if (!items.length) return null;

  const nextStation = {
    ...currentStation,
    updated_at: new Date().toISOString(),
    data_source: 'home-connect',
    binding_haId: registryEntry.haId,
    device_model: registryEntry.vib || currentStation.device_model,
    device_sn: registryEntry.snr || currentStation.device_sn,
    cycles: registryEntry.cycles,
  };

  const operationState =
    getFeatureRawString(findFeature(items, 'operationstate')) ||
    getFeatureDisplayString(findFeature(items, 'operationstate'));
  if (operationState) {
    nextStation.status = deriveStationStatus(true, operationState);
  }

  const remainingProgramSeconds = getFeatureNumber(findFeature(items, 'remainingprogramtime'));
  if (typeof remainingProgramSeconds === 'number') {
    nextStation.homeconnect_remaining_seconds = remainingProgramSeconds;
    nextStation.time_remaining = Math.max(0, Math.ceil(remainingProgramSeconds / 60));
  }

  const programProgress = getFeatureNumber(findFeature(items, 'programprogress'));
  if (typeof programProgress === 'number') {
    nextStation.homeconnect_program_progress = programProgress;
  }

  if (String(eventType || '').toUpperCase() === 'EVENT') {
    const programFinished = items.some((item) =>
      String(item?.key || '').toLowerCase().includes('programfinished'),
    );

    if (programFinished) {
      nextStation.status = 'Completed';
      nextStation.homeconnect_remaining_seconds = 0;
      nextStation.homeconnect_program_progress = 100;
      nextStation.time_remaining = 0;
      nextStation.program_name = undefined;
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

  return setLiveStation(registryEntry.stationId, nextStation, 'sse-delta');
}

function channelHasDemand(channel) {
  return channel.clients.size > 0 || channel.aggregateAttached === true;
}

function syncAggregateLiveStationChannels() {
  const desiredHaIds = new Set(
    aggregateLiveStationClients.size > 0
      ? getStationRegistry().filter((entry) => entry.haId).map((entry) => entry.haId)
      : [],
  );

  for (const [haId, channel] of sharedSseChannels.entries()) {
    channel.aggregateAttached = desiredHaIds.has(haId);
    if (!channelHasDemand(channel)) {
      teardownSharedSseChannel(channel);
      continue;
    }

    if (channel.aggregateAttached) {
      void ensureSharedSseUpstream(channel);
    }
  }

  for (const haId of desiredHaIds) {
    const channel = getOrCreateSharedSseChannel(haId);
    channel.aggregateAttached = true;
    void ensureSharedSseUpstream(channel);
  }
}

function serveHtmlFile(res, filePath, notFoundMessage) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(notFoundMessage);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

function appendRequestLog(entry) {
  requestLogEntries.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: Date.now(),
    method: entry.method || 'GET',
    path: entry.path || '/',
    kind: entry.kind || 'rest',
    status: entry.status ?? null,
    source: entry.source || 'network',
    retryAfter: entry.retryAfter ?? null,
    durationMs: Number.isFinite(entry.durationMs) ? Math.max(0, Math.round(entry.durationMs)) : null,
  });

  if (requestLogEntries.length > REQUEST_LOG_LIMIT) {
    requestLogEntries = requestLogEntries.slice(-REQUEST_LOG_LIMIT);
  }
}

function trackUpstreamError(entry) {
  const numericStatus = Number(entry.status);
  if (!Number.isFinite(numericStatus) || numericStatus < 400) return;

  totalUpstreamErrorCount += 1;
  if (numericStatus === 429) {
    lastRetryAfterDetails = {
      retryAfter: entry.retryAfter ?? null,
      path: entry.path || '/',
      method: entry.method || 'GET',
      time: Date.now(),
      source: entry.source || 'network',
    };
  }
}

function recordRequestLog(entry) {
  appendRequestLog(entry);
  trackUpstreamError(entry);
}

function countRecentErrors(windowMs = 10 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  return requestLogEntries.reduce((count, entry) => {
    const numericStatus = Number(entry.status);
    if (!Number.isFinite(numericStatus) || numericStatus < 400) return count;
    if (typeof entry.time !== 'number' || entry.time < cutoff) return count;
    return count + 1;
  }, 0);
}

function buildRateLimitHints() {
  const hints = [];
  const recentErrorCount10m = countRecentErrors();

  if (lastRetryAfterDetails?.retryAfter) {
    hints.push(`最近一次 429 给出了 Retry-After=${lastRetryAfterDetails.retryAfter}，优先等待该冷却窗口结束。`);
  }

  if (recentErrorCount10m >= 10) {
    hints.push('最近 10 分钟错误次数已达到或超过 10，已进入官方“连续错误触发额外阻断”风险区间。');
  }

  if (activeSseChannelCount >= 8) {
    hints.push(`当前活跃 SSE 通道数为 ${activeSseChannelCount}，已接近官方 10 条并行 monitoring channel 上限。`);
  }

  if (!lastRetryAfterDetails?.retryAfter && totalUpstreamErrorCount > 0) {
    hints.push('最近存在上游错误但没有 Retry-After，这更像额度总量限制、SSE 通道限制，或连续错误惩罚窗口。');
  }

  if (hints.length === 0) {
    hints.push('当前没有明显限流信号；如果再次出现 429，请优先观察 Retry-After、SSE 通道数和最近 10 分钟错误次数。');
  }

  return hints;
}

function buildRateLimitDiagnosticsPayload() {
  return {
    totalErrorCount: totalUpstreamErrorCount,
    recentErrorCount10m: countRecentErrors(),
    activeSseChannels: activeSseChannelCount,
    lastRetryAfter: lastRetryAfterDetails?.retryAfter ?? null,
    last429At: lastRetryAfterDetails?.time ?? null,
    last429Path: lastRetryAfterDetails?.path ?? null,
    last429Method: lastRetryAfterDetails?.method ?? null,
    last429Source: lastRetryAfterDetails?.source ?? null,
    requestLogSize: requestLogEntries.length,
    hints: buildRateLimitHints(),
  };
}

function buildRequestLogPayload() {
  return {
    entries: [...requestLogEntries].reverse(),
    limit: REQUEST_LOG_LIMIT,
  };
}

function clearRequestLog() {
  requestLogEntries = [];
  totalUpstreamErrorCount = 0;
  lastRetryAfterDetails = null;
}

function saveApplianceCache(cache) {
  try {
    fs.writeFileSync(APPLIANCE_CACHE_FILE, JSON.stringify(cache), 'utf8');
  } catch {}
}

function parseApplianceListBody(body) {
  try {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed?.data?.homeappliances) ? parsed : null;
  } catch {
    return null;
  }
}

function isApplianceCacheFreshEnough(cache, maxAgeMs) {
  if (!cache?.body || !cache?.cachedAt) return false;
  if (typeof cache.cachedAt !== 'number') return false;

  const ageMs = Date.now() - cache.cachedAt;
  if (ageMs < 0 || ageMs > maxAgeMs) return false;

  return !!parseApplianceListBody(cache.body);
}

function loadApplianceCache() {
  try {
    const raw = fs.readFileSync(APPLIANCE_CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data?.body || !data?.cachedAt) return null;
    if (!isApplianceCacheFreshEnough(data, APPLIANCE_LIST_CACHE_MAX_STALE_MS)) {
      console.warn('[Cache] Ignoring persisted appliance cache because it is invalid or too old.');
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function buildApplianceListPayload(homeappliances) {
  return {
    data: {
      homeappliances,
    },
  };
}

function parseApplianceDetailBody(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed?.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function projectApplianceListEntryForBrowser(appliance) {
  if (!appliance || typeof appliance !== 'object') return null;
  return {
    haId: appliance.haId,
    name: appliance.name || appliance.haId,
    type: appliance.type || null,
    brand: appliance.brand || null,
    connected: appliance.connected === true,
    enumber: appliance.enumber || null,
    vib: appliance.vib || null,
  };
}

function buildBrowserApplianceDetailResult(result) {
  if (!result?.body) return null;

  const parsed = parseApplianceDetailBody(result.body);
  if (!parsed?.data) return null;

  return projectApplianceListEntryForBrowser(parsed.data);
}

function buildBrowserApplianceListResult(result) {
  if (!result?.body) return result;

  const parsed = parseApplianceListBody(result.body);
  if (!parsed) return result;

  const projected = parsed.data.homeappliances
    .map(projectApplianceListEntryForBrowser)
    .filter(Boolean);

  return {
    ...result,
    body: JSON.stringify(buildApplianceListPayload(projected)),
  };
}

function normalizeApplianceSnapshot(input) {
  if (Array.isArray(input)) {
    return {
      payload: buildApplianceListPayload(input),
      importedCachedAt: null,
    };
  }

  if (Array.isArray(input?.data?.homeappliances)) {
    return {
      payload: buildApplianceListPayload(input.data.homeappliances),
      importedCachedAt: typeof input.cachedAt === 'number' ? input.cachedAt : null,
    };
  }

  if (Array.isArray(input?.homeappliances)) {
    return {
      payload: buildApplianceListPayload(input.homeappliances),
      importedCachedAt: typeof input.cachedAt === 'number' ? input.cachedAt : null,
    };
  }

  if (typeof input?.body === 'string') {
    const parsedBody = parseApplianceListBody(input.body);
    if (!parsedBody) return null;
    return {
      payload: buildApplianceListPayload(parsedBody.data.homeappliances),
      importedCachedAt: typeof input.cachedAt === 'number' ? input.cachedAt : null,
    };
  }

  return null;
}

function validateApplianceEntries(homeappliances) {
  if (!Array.isArray(homeappliances) || homeappliances.length === 0) {
    return 'invalid_snapshot_shape';
  }

  for (const appliance of homeappliances) {
    if (!appliance || typeof appliance !== 'object' || typeof appliance.haId !== 'string' || !appliance.haId.trim()) {
      return 'invalid_appliance_entry';
    }
  }

  return null;
}

function setApplianceCacheFromPayload(payload, options = {}) {
  const cachedAt = typeof options.cachedAt === 'number' && Number.isFinite(options.cachedAt)
    ? options.cachedAt
    : Date.now();
  const source = options.source || 'manual-import';

  applianceListCache = {
    status: 200,
    headers: {
      'x-homeconnect-cache': source,
      'x-homeconnect-cache-age-seconds': '0',
      'x-homeconnect-cache-cached-at': String(cachedAt),
    },
    body: JSON.stringify(payload),
    cachedAt,
  };

  saveApplianceCache(applianceListCache);
  return applianceListCache;
}

function buildServerApplianceCacheExport() {
  if (!applianceListCache) return null;

  const payload = parseApplianceListBody(applianceListCache.body);
  if (!payload) return null;

  return {
    source: 'server',
    cachedAt: applianceListCache.cachedAt,
    cacheState: applianceListCache.headers?.['x-homeconnect-cache'] || 'server',
    data: payload.data,
  };
}

function clearServerApplianceCache() {
  applianceListCache = null;
  try {
    if (fs.existsSync(APPLIANCE_CACHE_FILE)) {
      fs.unlinkSync(APPLIANCE_CACHE_FILE);
    }
  } catch (error) {
    throw new Error(`cache_clear_failed:${error.message}`);
  }
}

function getServerCacheDiagnostics() {
  const cacheFileExists = fs.existsSync(APPLIANCE_CACHE_FILE);
  const cache = applianceListCache;
  const payload = cache ? parseApplianceListBody(cache.body) : null;
  const ageMs = cache?.cachedAt ? Math.max(0, Date.now() - cache.cachedAt) : null;

  return {
    has_cache_file: cacheFileExists,
    cache_file_exists: cacheFileExists,
    cache_file_name: '.appliances-cache.json',
    loaded_in_memory: !!cache,
    cached_at: cache?.cachedAt || null,
    age_ms: ageMs,
    appliance_count: payload?.data?.homeappliances?.length || 0,
    is_fresh_within_24h: !!cache && isApplianceCacheFreshEnough(cache, APPLIANCE_LIST_CACHE_TTL_MS),
    is_usable_stale: !!cache && isApplianceCacheFreshEnough(cache, APPLIANCE_LIST_CACHE_MAX_STALE_MS),
  };
}

function readJsonRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('request_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        reject(new Error('empty_request_body'));
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

// Load persisted token on startup
tokenData = loadToken();
if (tokenData) {
  console.log(
    '[Auth] Loaded persisted auth data from disk. Scope:',
    tokenData.scope,
    'access token present:',
    tokenData.access_token ? 'yes' : 'no',
    'refresh token present:',
    tokenData.refresh_token ? 'yes' : 'no'
  );
}

applianceListCache = loadApplianceCache();
if (applianceListCache) {
  console.log('[Cache] Loaded persisted appliance list cache from disk.');
}

stationRegistry = loadStationRegistry();
console.log(`[Registry] Loaded ${stationRegistry.length} station entries.`);

function getTokenExpiresIn(data = tokenData) {
  if (!data?.access_token || !data?.obtained_at) return null;
  const remaining = (data.expires_in || 86400) - Math.floor((Date.now() - data.obtained_at) / 1000);
  return Math.max(0, remaining);
}

function hasUsableAccessToken(data = tokenData) {
  const expiresIn = getTokenExpiresIn(data);
  return expiresIn !== null && expiresIn > 0;
}

function hasRefreshToken(data = tokenData) {
  return !!data?.refresh_token;
}

function getLoginCooldownSecondsRemaining() {
  if (!lastLoginStartedAt) return 0;
  const elapsed = Math.floor((Date.now() - lastLoginStartedAt) / 1000);
  return Math.max(0, LOGIN_COOLDOWN_SECONDS - elapsed);
}

function summarizeAuthError(data, fallbackMessage = 'unknown_error') {
  if (!data) return fallbackMessage;
  if (typeof data === 'string') return data;
  return data.error_description || data.error || fallbackMessage;
}

function clearRefreshError() {
  lastTokenError = null;
}

function setRefreshError(message) {
  lastTokenError = message || 'unknown_refresh_error';
}

function getAuthState() {
  if (hasUsableAccessToken()) return 'authenticated';
  if (lastLogoutAt && !hasRefreshToken()) return 'logged_out';
  if (lastTokenError) return 'needs_relogin';
  if (hasRefreshToken()) return 'recoverable';
  return 'needs_relogin';
}

function buildAuthStatus() {
  return {
    authenticated: getAuthState() === 'authenticated',
    auth_state: getAuthState(),
    scope: tokenData?.scope || null,
    expires_in: getTokenExpiresIn(),
    has_refresh_token: hasRefreshToken(),
    last_refresh_error: lastTokenError,
    last_login_started_at: lastLoginStartedAt,
    login_cooldown_seconds: getLoginCooldownSecondsRemaining(),
  };
}

function maskClientId(clientId = CONFIG.CLIENT_ID) {
  const raw = String(clientId || '');
  if (!raw) return null;
  if (raw.length <= 12) return raw;
  return `${raw.slice(0, 8)}...${raw.slice(-6)}`;
}

function buildTokenDebugPayload() {
  const auth = buildAuthStatus();
  return {
    ...auth,
    client_id_masked: maskClientId(),
    authorize_host: CONFIG.HC_AUTHORIZE_HOST,
    token_host: CONFIG.HC_TOKEN_HOST,
    api_host: CONFIG.HC_API_HOST,
    redirect_uri: CONFIG.REDIRECT_URI,
    access_token: tokenData?.access_token || null,
    refresh_token_present: !!tokenData?.refresh_token,
    obtained_at: tokenData?.obtained_at || null,
  };
}

// ─────────────────────────────────────────────────────────
// OAuth helpers
// ─────────────────────────────────────────────────────────

function buildAuthorizeUrl() {
  pendingOAuthState = crypto.randomBytes(16).toString('base64url');
  lastLoginStartedAt = Date.now();
  lastLogoutAt = null;
  clearRefreshError();

  const params = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    redirect_uri: CONFIG.REDIRECT_URI,
    response_type: 'code',
    scope: CONFIG.SCOPE,
    state: pendingOAuthState,
  });
  if (CONFIG.USE_PKCE) {
    pendingCodeVerifier = generateCodeVerifier();
    params.set('code_challenge', computeCodeChallenge(pendingCodeVerifier));
    params.set('code_challenge_method', 'S256');
  } else {
    pendingCodeVerifier = null;
  }
  console.log('[Auth] Login started. PKCE:', CONFIG.USE_PKCE ? 'yes' : 'no', 'state set: yes, client_secret configured:', CONFIG.CLIENT_SECRET ? 'yes' : 'no');
  return `https://${CONFIG.HC_AUTHORIZE_HOST}/security/oauth/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const hasVerifier = !!pendingCodeVerifier;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CONFIG.CLIENT_ID,
    redirect_uri: CONFIG.REDIRECT_URI,
  });
  if (CONFIG.CLIENT_SECRET) {
    params.set('client_secret', CONFIG.CLIENT_SECRET);
  }
  if (pendingCodeVerifier) {
    params.set('code_verifier', pendingCodeVerifier);
    pendingCodeVerifier = null; // single-use
  }

  const bodyStr = params.toString();
  console.log('[Auth] Exchanging code. Summary:', {
    codeLength: String(code).length,
    hasClientSecret: !!CONFIG.CLIENT_SECRET,
    hasCodeVerifier: hasVerifier,
    redirectUri: CONFIG.REDIRECT_URI,
    bodyKeys: [...params.keys()],
  });
  const result = await httpsRequest(
    {
      hostname: CONFIG.HC_TOKEN_HOST,
      path: '/security/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    },
    bodyStr
  );

  let data;
  try { data = JSON.parse(result.body); }
  catch { data = { error: 'invalid_json', raw: result.body }; }
  if (data.access_token) {
    console.log('[Auth] Token exchange HTTP', result.status, 'success. Fields:', Object.keys(data));
  } else {
    console.log('[Auth] Token exchange HTTP', result.status, 'failure:', data.error_description || data.error || 'unknown_error');
  }
  return { status: result.status, data };
}

// ─────────────────────────────────────────────────────────
// Device Authorization Flow (RFC 8628)
// No client_secret needed; user authorizes on phone/browser.
// ─────────────────────────────────────────────────────────

async function startDeviceFlow() {
  const params = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPE,
  });
  const bodyStr = params.toString();
  const result = await httpsRequest(
    {
      hostname: CONFIG.HC_TOKEN_HOST,
      path: '/security/oauth/device_authorization',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    },
    bodyStr
  );
  console.log('[Device] Start response HTTP', result.status, ':', result.body);
  let data;
  try { data = JSON.parse(result.body); } catch { data = { error: 'invalid_json', raw: result.body }; }
  return { status: result.status, data };
}

async function pollDeviceToken(deviceCode) {
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: deviceCode,
    client_id: CONFIG.CLIENT_ID,
  });
  const bodyStr = params.toString();
  const result = await httpsRequest(
    {
      hostname: CONFIG.HC_TOKEN_HOST,
      path: '/security/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    },
    bodyStr
  );
  let data;
  try { data = JSON.parse(result.body); } catch { data = { error: 'invalid_json', raw: result.body }; }
  return { status: result.status, data };
}

async function doRefreshToken() {
  if (!tokenData?.refresh_token) {
    setRefreshError('No refresh_token stored');
    throw new Error('No refresh_token stored');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token,
    client_id: CONFIG.CLIENT_ID,
  });
  if (CONFIG.CLIENT_SECRET) {
    params.set('client_secret', CONFIG.CLIENT_SECRET);
  }

  const bodyStr = params.toString();
  const result = await httpsRequest(
    {
      hostname: CONFIG.HC_TOKEN_HOST,
      path: '/security/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    },
    bodyStr
  );

  let data;
  try { data = JSON.parse(result.body); }
  catch { data = { error: 'invalid_json', raw: result.body }; }
  if (data.access_token) {
    tokenData = {
      ...tokenData,
      ...data,
      obtained_at: Date.now(),
    };
    saveToken(tokenData);
    clearRefreshError();
    lastLogoutAt = null;
  } else {
    setRefreshError(summarizeAuthError(data, 'refresh_failed'));
  }
  return { status: result.status, data };
}

// ─────────────────────────────────────────────────────────
// Home Connect API proxy
// ─────────────────────────────────────────────────────────

async function ensureValidToken() {
  if (!tokenData) throw new Error('Not authenticated — please login first');

  if (!hasUsableAccessToken()) {
    if (!hasRefreshToken()) {
      throw new Error('Not authenticated — please login first');
    }
    await doRefreshToken();
  } else {
    const expiresIn = getTokenExpiresIn();
    if (expiresIn !== null && expiresIn <= 300) {
      await doRefreshToken();
    }
  }

  if (!hasUsableAccessToken()) {
    throw new Error(lastTokenError || 'Session recovery failed — please login again');
  }
}

async function callHCApi(apiPath, method = 'GET', reqBody = null) {
  await ensureValidToken();

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: 'application/vnd.bsh.sdk.v1+json',
    'Accept-Language': 'zh-CN',
  };
  if (reqBody) {
    headers['Content-Type'] = 'application/vnd.bsh.sdk.v1+json';
  }

  const bodyStr = reqBody ? JSON.stringify(reqBody) : null;
  if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

  const startedAt = Date.now();
  const result = await httpsRequest(
    {
      hostname: CONFIG.HC_API_HOST,
      path: `/api${apiPath}`,
      method,
      headers,
    },
    bodyStr
  );

  recordRequestLog({
    method,
    path: apiPath,
    kind: 'rest',
    status: result.status,
    source: 'network',
    retryAfter: result.headers?.['retry-after'] || null,
    durationMs: Date.now() - startedAt,
  });

  return result;
}

function getCachedApplianceList() {
  if (!isApplianceCacheFreshEnough(applianceListCache, APPLIANCE_LIST_CACHE_TTL_MS)) return null;
  return {
    status: 200,
    headers: {
      ...(applianceListCache.headers || {}),
      'x-homeconnect-cache': 'fresh',
      'x-homeconnect-cache-age-seconds': String(Math.max(0, Math.floor((Date.now() - applianceListCache.cachedAt) / 1000))),
      'x-homeconnect-cache-cached-at': String(applianceListCache.cachedAt),
    },
    body: applianceListCache.body,
  };
}

function getStaleApplianceListFallback() {
  if (!isApplianceCacheFreshEnough(applianceListCache, APPLIANCE_LIST_CACHE_MAX_STALE_MS)) return null;
  return {
    status: 200,
    headers: {
      ...(applianceListCache.headers || {}),
      'x-homeconnect-cache': 'stale-on-429',
      'x-homeconnect-cache-age-seconds': String(Math.max(0, Math.floor((Date.now() - applianceListCache.cachedAt) / 1000))),
      'x-homeconnect-cache-cached-at': String(applianceListCache.cachedAt),
    },
    body: applianceListCache.body,
  };
}

function rememberApplianceList(result) {
  if (result?.status !== 200 || !result.body || !parseApplianceListBody(result.body)) return;
  const cachedAt = Date.now();
  applianceListCache = {
    status: result.status,
    headers: result.headers || {},
    body: result.body,
    cachedAt,
  };
  saveApplianceCache(applianceListCache);
  return applianceListCache;
}

function annotateNetworkApplianceResult(result, cacheState) {
  if (!result) return result;
  return {
    ...result,
    headers: {
      ...(result.headers || {}),
      'x-homeconnect-cache': cacheState,
      'x-homeconnect-cache-age-seconds': '0',
      'x-homeconnect-cache-cached-at': String(applianceListCache?.cachedAt || Date.now()),
    },
  };
}

function getApplianceEndpointPolicy(apiPath, method = 'GET') {
  if (String(method || 'GET').toUpperCase() !== 'GET') return null;

  const policies = [
    {
      pattern: /^\/homeappliances\/[^/]+$/,
      ttlMs: APPLIANCE_DETAIL_CACHE_TTL_MS,
      maxStaleMs: APPLIANCE_DETAIL_CACHE_MAX_STALE_MS,
      cooldownMs: APPLIANCE_ENDPOINT_DEFAULT_COOLDOWN_MS,
      cacheLabel: 'detail',
    },
    {
      pattern: /^\/homeappliances\/[^/]+\/status$/,
      ttlMs: APPLIANCE_STATUS_CACHE_TTL_MS,
      maxStaleMs: APPLIANCE_STATUS_CACHE_MAX_STALE_MS,
      cooldownMs: 30 * 1000,
      cacheLabel: 'status',
    },
    {
      pattern: /^\/homeappliances\/[^/]+\/programs\/active$/,
      ttlMs: APPLIANCE_PROGRAM_CACHE_TTL_MS,
      maxStaleMs: APPLIANCE_PROGRAM_CACHE_MAX_STALE_MS,
      cooldownMs: 30 * 1000,
      cacheLabel: 'active-program',
    },
    {
      pattern: /^\/homeappliances\/[^/]+\/settings$/,
      ttlMs: APPLIANCE_SETTINGS_CACHE_TTL_MS,
      maxStaleMs: APPLIANCE_SETTINGS_CACHE_MAX_STALE_MS,
      cooldownMs: APPLIANCE_ENDPOINT_DEFAULT_COOLDOWN_MS,
      cacheLabel: 'settings',
    },
  ];

  return policies.find((policy) => policy.pattern.test(apiPath)) || null;
}

function buildApplianceEndpointCacheKey(apiPath, method = 'GET') {
  return `${String(method || 'GET').toUpperCase()} ${apiPath}`;
}

function isEndpointCacheFreshEnough(cache, maxAgeMs) {
  if (!cache?.body || cache.status !== 200 || typeof cache.cachedAt !== 'number') return false;
  const ageMs = Date.now() - cache.cachedAt;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

function buildCachedEndpointResult(cache, cacheState) {
  return {
    status: cache.status,
    headers: {
      ...(cache.headers || {}),
      'x-homeconnect-cache': cacheState,
      'x-homeconnect-cache-age-seconds': String(Math.max(0, Math.floor((Date.now() - cache.cachedAt) / 1000))),
      'x-homeconnect-cache-cached-at': String(cache.cachedAt),
    },
    body: cache.body,
  };
}

function getCachedEndpointResult(cacheKey, maxAgeMs, cacheState) {
  const cache = applianceEndpointCache.get(cacheKey);
  if (!isEndpointCacheFreshEnough(cache, maxAgeMs)) return null;
  return buildCachedEndpointResult(cache, cacheState);
}

function rememberEndpointResult(cacheKey, result) {
  if (result?.status !== 200 || !result.body) return null;

  const cached = {
    status: result.status,
    headers: result.headers || {},
    body: result.body,
    cachedAt: Date.now(),
  };

  applianceEndpointCache.set(cacheKey, cached);
  return cached;
}

function parseRetryAfterToMs(retryAfter) {
  if (!retryAfter) return null;

  const numericSeconds = Number(retryAfter);
  if (Number.isFinite(numericSeconds) && numericSeconds > 0) {
    return numericSeconds * 1000;
  }

  const parsedTime = Date.parse(retryAfter);
  if (Number.isFinite(parsedTime)) {
    return Math.max(0, parsedTime - Date.now());
  }

  return null;
}

function buildCooldownBlockedResult(apiPath, cooldownUntil) {
  const retryAfterSeconds = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
  return {
    status: 429,
    headers: {
      'retry-after': String(retryAfterSeconds),
      'x-homeconnect-cache': 'cooldown-block',
      'x-homeconnect-cache-age-seconds': '0',
      'x-homeconnect-cache-cached-at': String(Date.now()),
    },
    body: JSON.stringify({
      error: 'upstream_cooldown_active',
      path: apiPath,
      retryAfter: retryAfterSeconds,
    }),
  };
}

async function getProtectedApplianceResult(apiPath, method = 'GET', reqBody = null, options = {}) {
  const policy = getApplianceEndpointPolicy(apiPath, method);
  if (!policy || reqBody) {
    return callHCApi(apiPath, method, reqBody);
  }

  const cacheKey = buildApplianceEndpointCacheKey(apiPath, method);
  const forceRefresh = options.forceRefresh === true;

  if (!forceRefresh) {
    const freshCache = getCachedEndpointResult(cacheKey, policy.ttlMs, `${policy.cacheLabel}-fresh`);
    if (freshCache) {
      appendRequestLog({
        method,
        path: apiPath,
        kind: 'cache',
        status: 200,
        source: `${policy.cacheLabel}-fresh`,
        retryAfter: null,
        durationMs: 0,
      });
      return freshCache;
    }
  }

  const cooldownUntil = applianceEndpointCooldowns.get(cacheKey) || 0;
  if (cooldownUntil > Date.now()) {
    const staleCache = getCachedEndpointResult(cacheKey, policy.maxStaleMs, `${policy.cacheLabel}-stale-on-cooldown`);
    if (staleCache) {
      appendRequestLog({
        method,
        path: apiPath,
        kind: 'cache',
        status: 200,
        source: `${policy.cacheLabel}-stale-on-cooldown`,
        retryAfter: String(Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000))),
        durationMs: 0,
      });
      return staleCache;
    }

    const blockedResult = buildCooldownBlockedResult(apiPath, cooldownUntil);
    recordRequestLog({
      method,
      path: apiPath,
      kind: 'rest',
      status: blockedResult.status,
      source: 'local-cooldown',
      retryAfter: blockedResult.headers['retry-after'],
      durationMs: 0,
    });
    return blockedResult;
  }

  const inFlightKey = cacheKey;
  if (applianceEndpointInFlight.has(inFlightKey)) {
    return applianceEndpointInFlight.get(inFlightKey);
  }

  const requestPromise = (async () => {
    const result = await callHCApi(apiPath, method, reqBody);

    if (result.status === 200) {
      rememberEndpointResult(cacheKey, result);
      applianceEndpointCooldowns.delete(cacheKey);
      return annotateNetworkApplianceResult(result, forceRefresh ? `${policy.cacheLabel}-refreshed` : `${policy.cacheLabel}-network`);
    }

    if (result.status === 429 || result.status >= 500) {
      const cooldownMs = parseRetryAfterToMs(result.headers?.['retry-after']) || policy.cooldownMs;
      applianceEndpointCooldowns.set(cacheKey, Date.now() + cooldownMs);

      const staleCache = getCachedEndpointResult(
        cacheKey,
        policy.maxStaleMs,
        result.status === 429 ? `${policy.cacheLabel}-stale-on-429` : `${policy.cacheLabel}-stale-on-error`,
      );

      if (staleCache) {
        appendRequestLog({
          method,
          path: apiPath,
          kind: 'cache',
          status: 200,
          source: result.status === 429 ? `${policy.cacheLabel}-stale-on-429` : `${policy.cacheLabel}-stale-on-error`,
          retryAfter: result.headers?.['retry-after'] || null,
          durationMs: 0,
        });
        return staleCache;
      }
    }

    return result;
  })().finally(() => {
    applianceEndpointInFlight.delete(inFlightKey);
  });

  applianceEndpointInFlight.set(inFlightKey, requestPromise);
  return requestPromise;
}

async function getApplianceListWithCache(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const cached = forceRefresh ? null : getCachedApplianceList();
  if (cached) {
    appendRequestLog({
      method: 'GET',
      path: '/homeappliances',
      kind: 'cache',
      status: 200,
      source: 'cache-fresh',
      retryAfter: null,
      durationMs: 0,
    });
    return cached;
  }

  if (applianceListInFlight) {
    return applianceListInFlight;
  }

  applianceListInFlight = (async () => {
    const result = await callHCApi('/homeappliances');

    if (result.status === 200) {
      rememberApplianceList(result);
      return annotateNetworkApplianceResult(result, forceRefresh ? 'refreshed' : 'network');
    }

    if (result.status === 429) {
      const staleCache = getStaleApplianceListFallback();

      if (staleCache) {
        console.warn('[Proxy] /homeappliances hit 429, serving stale cached appliance list');
        appendRequestLog({
          method: 'GET',
          path: '/homeappliances',
          kind: 'cache',
          status: 200,
          source: 'cache-stale-on-429',
          retryAfter: result.headers?.['retry-after'] || null,
          durationMs: 0,
        });
        return staleCache;
      }
    }

    return result;
  })().finally(() => {
    applianceListInFlight = null;
  });

  return applianceListInFlight;
}

function getOrCreateSharedSseChannel(haId) {
  let channel = sharedSseChannels.get(haId);
  if (channel) return channel;

  channel = {
    haId,
    clients: new Set(),
    aggregateAttached: false,
    process: null,
    reconnectTimer: null,
    reconnectBlockedUntil: 0,
    startPromise: null,
    stdoutBuffer: '',
    currentEventType: 'message',
    currentDataLines: [],
    lastErrorStatus: null,
    lastRetryAfter: null,
    tearingDown: false,
  };

  sharedSseChannels.set(haId, channel);
  return channel;
}

function writeToSseClient(client, chunk) {
  if (client.res.writableEnded || client.res.destroyed) return false;

  try {
    client.res.write(chunk);
    return true;
  } catch {
    return false;
  }
}

function pruneClosedSseClients(channel) {
  for (const client of channel.clients) {
    if (client.res.writableEnded || client.res.destroyed) {
      channel.clients.delete(client);
    }
  }
}

function broadcastSseChunk(channel, chunk) {
  pruneClosedSseClients(channel);
  for (const client of channel.clients) {
    if (!writeToSseClient(client, chunk)) {
      channel.clients.delete(client);
    }
  }
}

function broadcastSseControlEvent(channel, eventType, payload) {
  broadcastSseChunk(channel, `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function flushSharedSseEvent(channel) {
  if (!channel.currentDataLines.length) {
    channel.currentEventType = 'message';
    return;
  }

  const dataText = channel.currentDataLines.join('\n');
  try {
    maybeIncrementCycleFromSseEvent(channel.haId, channel.currentEventType, dataText);
    applySseDeltaToLiveStation(channel.haId, channel.currentEventType, dataText);
  } catch (error) {
    console.warn('[Registry] Failed to process SSE finish event:', error.message);
  }

  channel.currentEventType = 'message';
  channel.currentDataLines = [];
}

function handleSharedSseLine(channel, line) {
  broadcastSseChunk(channel, `${line}\n`);

  const normalizedLine = line.replace(/\r$/, '');
  if (normalizedLine.startsWith('event:')) {
    channel.currentEventType = normalizedLine.slice('event:'.length).trim() || 'message';
    return;
  }

  if (normalizedLine.startsWith('data:')) {
    channel.currentDataLines.push(normalizedLine.slice('data:'.length).trimStart());
    return;
  }

  if (normalizedLine === '') {
    flushSharedSseEvent(channel);
  }
}

function clearSharedSseReconnectTimer(channel) {
  if (channel.reconnectTimer) {
    clearTimeout(channel.reconnectTimer);
    channel.reconnectTimer = null;
  }
}

function scheduleSharedSseReconnect(channel, delayMs, reason) {
  clearSharedSseReconnectTimer(channel);

  if (!channelHasDemand(channel) || channel.tearingDown) {
    return;
  }

  const safeDelayMs = Math.max(1000, delayMs);
  channel.reconnectBlockedUntil = Date.now() + safeDelayMs;
  broadcastSseControlEvent(channel, 'DISCONNECTED', {
    reason,
    reconnectInMs: safeDelayMs,
  });

  channel.reconnectTimer = setTimeout(() => {
    channel.reconnectTimer = null;
    if (!channelHasDemand(channel) || channel.tearingDown) {
      return;
    }
    channel.reconnectBlockedUntil = 0;
    void ensureSharedSseUpstream(channel);
  }, safeDelayMs);
}

function computeSharedSseReconnectDelay(channel) {
  if (channel.lastErrorStatus === 429) {
    return parseRetryAfterToMs(channel.lastRetryAfter) || SSE_UPSTREAM_429_RECONNECT_THROTTLE_MS;
  }

  return SSE_UPSTREAM_RECONNECT_THROTTLE_MS;
}

function teardownSharedSseChannel(channel) {
  channel.tearingDown = true;
  clearSharedSseReconnectTimer(channel);

  if (channel.process && !channel.process.killed) {
    channel.process.kill();
  }

  channel.process = null;
  channel.startPromise = null;
  channel.stdoutBuffer = '';
  channel.currentEventType = 'message';
  channel.currentDataLines = [];
  channel.lastErrorStatus = null;
  channel.lastRetryAfter = null;
  channel.reconnectBlockedUntil = 0;
  channel.aggregateAttached = false;
  sharedSseChannels.delete(channel.haId);
}

function startSharedSseUpstream(channel) {
  const apiUrl = `https://${CONFIG.HC_API_HOST}/api/homeappliances/${encodeURIComponent(channel.haId)}/events`;
  const token = tokenData.access_token;
  const proxyLine = PROXY_URL
    ? `$wr.Proxy = [System.Net.WebProxy]::new('${psEscape(PROXY_URL)}'); $wr.Proxy.UseDefaultCredentials = $true`
    : '';

  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $wr = [System.Net.HttpWebRequest]::Create('${psEscape(apiUrl)}')
  $wr.Method = 'GET'
  $wr.Accept = 'text/event-stream'
  $wr.Headers.Add('Authorization', 'Bearer ${psEscape(token)}')
  $wr.Headers.Add('Accept-Language', 'zh-CN')
  $wr.Timeout = -1
  $wr.ReadWriteTimeout = -1
  ${proxyLine}
  $resp = $wr.GetResponse()
  $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
  while (-not $sr.EndOfStream) {
    $line = $sr.ReadLine()
    [Console]::WriteLine($line)
    [Console]::Out.Flush()
  }
} catch [System.Net.WebException] {
  $response = $_.Exception.Response
  if ($response) {
    $status = [int]$response.StatusCode
    $retryAfter = $response.Headers['Retry-After']
    [Console]::Error.WriteLine("SSE_STATUS:$status;RETRY_AFTER:$retryAfter")
  } else {
    [Console]::Error.WriteLine('SSE_STATUS:0;RETRY_AFTER:')
  }
} catch {
  [Console]::Error.WriteLine("SSE_STATUS:0;RETRY_AFTER:")
  [Console]::Error.WriteLine("SSE stream error: $_")
}
`.trim();

  const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true,
  });

  channel.process = ps;
  channel.stdoutBuffer = '';
  channel.currentEventType = 'message';
  channel.currentDataLines = [];
  channel.lastErrorStatus = null;
  channel.lastRetryAfter = null;
  channel.tearingDown = false;
  activeSseChannelCount += 1;

  recordRequestLog({
    method: 'GET',
    path: `/homeappliances/${channel.haId}/events`,
    kind: 'sse',
    status: 'stream-started',
    source: 'network',
    retryAfter: null,
    durationMs: 0,
  });

  broadcastSseControlEvent(channel, 'CONNECTED', {
    haId: channel.haId,
    shared: true,
  });
  console.log(`[SSE] Shared upstream started for ${channel.haId} (PID ${ps.pid}, clients ${channel.clients.size}, aggregate ${channel.aggregateAttached ? 'yes' : 'no'})`);

  ps.stdout.on('data', (chunk) => {
    channel.stdoutBuffer += chunk.toString('utf8');
    const lines = channel.stdoutBuffer.split(/\n/);
    channel.stdoutBuffer = lines.pop() ?? '';
    lines.forEach((line) => handleSharedSseLine(channel, line));
  });

  ps.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (!text) return;

    const match = text.match(/SSE_STATUS:(\d+);RETRY_AFTER:(.*)$/m);
    if (match) {
      channel.lastErrorStatus = Number(match[1]) || 0;
      channel.lastRetryAfter = match[2] || null;
      if (channel.lastErrorStatus >= 400) {
        recordRequestLog({
          method: 'GET',
          path: `/homeappliances/${channel.haId}/events`,
          kind: 'sse',
          status: channel.lastErrorStatus,
          source: 'network',
          retryAfter: channel.lastRetryAfter,
          durationMs: 0,
        });
      }
      return;
    }

    console.error(`[SSE] stderr (${channel.haId}): ${text}`);
  });

  ps.on('close', () => {
    if (channel.process === ps) {
      channel.process = null;
    }

    activeSseChannelCount = Math.max(0, activeSseChannelCount - 1);

    if (channel.stdoutBuffer) {
      handleSharedSseLine(channel, channel.stdoutBuffer);
      channel.stdoutBuffer = '';
    }
    flushSharedSseEvent(channel);

    if (channel.tearingDown || !channelHasDemand(channel)) {
      return;
    }

    const reconnectDelayMs = computeSharedSseReconnectDelay(channel);
    console.warn(`[SSE] Shared upstream closed for ${channel.haId}; reconnect in ${reconnectDelayMs}ms`);
    scheduleSharedSseReconnect(channel, reconnectDelayMs, 'stream_ended');
  });
}

async function ensureSharedSseUpstream(channel) {
  if (!channelHasDemand(channel) || channel.process || channel.startPromise || channel.reconnectTimer || channel.tearingDown) {
    return;
  }

  const delayMs = channel.reconnectBlockedUntil - Date.now();
  if (delayMs > 0) {
    scheduleSharedSseReconnect(channel, delayMs, 'cooldown_active');
    return;
  }

  channel.startPromise = (async () => {
    try {
      await ensureValidToken();
      if (!channelHasDemand(channel) || channel.tearingDown) {
        return;
      }
      startSharedSseUpstream(channel);
    } catch (error) {
      console.error(`[SSE] Shared upstream auth/start failed for ${channel.haId}: ${error.message}`);
      scheduleSharedSseReconnect(channel, SSE_UPSTREAM_RECONNECT_THROTTLE_MS, 'startup_failed');
    } finally {
      channel.startPromise = null;
    }
  })();

  await channel.startPromise;
}

// ─────────────────────────────────────────────────────────
// HTTP server
// ─────────────────────────────────────────────────────────

async function handleRequest(req, res, serverMode = 'main') {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Always add CORS + no-cache for API routes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Static file: index.html ────────────────────────────
  if (pathname === '/' || pathname === '/index.html') {
    if (serverMode === 'admin') {
      serveHtmlFile(res, REGISTRY_ADMIN_HTML_FILE, 'registry-admin.html not found — make sure it is in the same folder as server.js');
      return;
    }

    serveHtmlFile(res, path.join(__dirname, 'index.html'), 'index.html not found — make sure it is in the same folder as server.js');
    return;
  }

  if (pathname === '/registry-admin.html') {
    serveHtmlFile(res, REGISTRY_ADMIN_HTML_FILE, 'registry-admin.html not found — make sure it is in the same folder as server.js');
    return;
  }

  if (pathname === '/api/station-registry' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ data: getStationRegistry() }));
    return;
  }

  if (pathname === '/api/live-stations' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(getLiveStationsPayload()));
    return;
  }

  if (pathname === '/api/live-stations/diagnostics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      meta: buildLiveStationMeta(),
      upstreamChannels: Array.from(sharedSseChannels.values()).map((channel) => ({
        haId: channel.haId,
        browserClients: channel.clients.size,
        aggregateAttached: channel.aggregateAttached === true,
        reconnectBlockedUntil: channel.reconnectBlockedUntil,
        hasProcess: !!channel.process,
      })),
    }));
    return;
  }

  if (pathname === '/api/live-stations/refresh' && req.method === 'POST') {
    try {
      const results = await loadBoundStationSnapshots();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        meta: buildLiveStationMeta(),
        results,
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'live_station_refresh_failed' }));
    }
    return;
  }

  if (pathname === '/api/live-stations/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.flushHeaders();

    const client = { res, keepalive: null };
    aggregateLiveStationClients.add(client);
    writeAggregateClientChunk(client, `event: CONNECTED\ndata: ${JSON.stringify({ meta: buildLiveStationMeta() })}\n\n`);
    client.keepalive = setInterval(() => {
      writeAggregateClientChunk(client, ': keepalive\n\n');
    }, LIVE_STATION_KEEPALIVE_MS);
    syncAggregateLiveStationChannels();

    req.on('close', () => {
      if (client.keepalive) {
        clearInterval(client.keepalive);
      }
      aggregateLiveStationClients.delete(client);
      if (!res.writableEnded) {
        res.end();
      }
      syncAggregateLiveStationChannels();
    });
    return;
  }

  if (pathname.startsWith('/api/station-registry/') && pathname.endsWith('/increment-cycle') && req.method === 'POST') {
    const stationId = decodeURIComponent(
      pathname.slice('/api/station-registry/'.length, -'/increment-cycle'.length),
    );

    if (!stationId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_station_id' }));
      return;
    }

    try {
      const updatedEntry = incrementRegistryCycleByStationId(stationId);
      updateLiveStationCyclesFromRegistryEntry(updatedEntry);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, data: updatedEntry }));
    } catch (error) {
      const message = error.message || 'station_registry_increment_failed';
      const status = message === 'station_registry_entry_not_found' ? 404 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  if (pathname.startsWith('/api/station-registry/') && req.method === 'PUT') {
    const stationId = decodeURIComponent(pathname.slice('/api/station-registry/'.length));
    if (!stationId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_station_id' }));
      return;
    }

    try {
      const body = await readJsonRequestBody(req);
      const updatedEntry = upsertStationRegistryEntry(stationId, body);
      const liveStation = getLiveStationById(stationId);
      if (liveStation) {
        broadcastAggregateLiveStationEvent('station-update', {
          station: liveStation,
          reason: 'registry-update',
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, data: updatedEntry }));
    } catch (error) {
      const message = error.message || 'station_registry_update_failed';
      const status = message === 'invalid_json' || message === 'empty_request_body' || message === 'request_too_large'
        ? 400
        : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  // ── Auth: start login (Authorization Code Flow) ─────────
  if (pathname === '/auth/login') {
    const authUrl = buildAuthorizeUrl();
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // ── Device Flow: start ────────────────────────────────────
  if (pathname === '/auth/device/start' && req.method === 'POST') {
    try {
      const result = await startDeviceFlow();
      if (result.data.device_code) {
        deviceFlowData = {
          device_code: result.data.device_code,
          user_code: result.data.user_code,
          verification_uri: result.data.verification_uri,
          verification_uri_complete: result.data.verification_uri_complete,
          expires_at: Date.now() + (result.data.expires_in || 1800) * 1000,
          interval: result.data.interval || 5,
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          user_code: deviceFlowData.user_code,
          verification_uri: deviceFlowData.verification_uri,
          verification_uri_complete: deviceFlowData.verification_uri_complete,
          expires_in: result.data.expires_in || 1800,
          interval: deviceFlowData.interval,
        }));
      } else {
        const errMsg = result.data.error_description || result.data.error || JSON.stringify(result.data);
        console.error('[Device] Start failed:', result.data);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errMsg }));
      }
    } catch (e) {
      console.error('[Device] Start error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── Device Flow: poll ────────────────────────────────────
  if (pathname === '/auth/device/poll' && req.method === 'GET') {
    if (!deviceFlowData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No device flow in progress. Start one first.' }));
      return;
    }
    if (Date.now() > deviceFlowData.expires_at) {
      deviceFlowData = null;
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'device_code_expired' }));
      return;
    }
    try {
      const result = await pollDeviceToken(deviceFlowData.device_code);
      if (result.data.access_token) {
        tokenData = { ...result.data, obtained_at: Date.now() };
        saveToken(tokenData);
        deviceFlowData = null;
        console.log('[Device] Token acquired! Scope:', tokenData.scope);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'authorized' }));
      } else if (result.data.error === 'authorization_pending') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'pending' }));
      } else if (result.data.error === 'slow_down') {
        deviceFlowData.interval = (deviceFlowData.interval || 5) + 5;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'pending', interval: deviceFlowData.interval }));
      } else {
        const errMsg = result.data.error_description || result.data.error || JSON.stringify(result.data);
        console.error('[Device] Poll error:', result.data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: errMsg }));
      }
    } catch (e) {
      console.error('[Device] Poll exception:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── Auth: OAuth callback ───────────────────────────────
  if (pathname === '/oauth/callback') {
    const code = parsed.query.code;
    const error = parsed.query.error;
    const state = parsed.query.state;

    if (error) {
      const desc = parsed.query.error_description || error;
      res.writeHead(302, { Location: `/?error=${encodeURIComponent(desc)}` });
      res.end();
      return;
    }

    if (!code) {
      res.writeHead(302, { Location: '/?error=no_authorization_code' });
      res.end();
      return;
    }

    if (pendingOAuthState && state !== pendingOAuthState) {
      console.error('[Auth] State mismatch in OAuth callback.');
      res.writeHead(302, { Location: '/?error=oauth_state_mismatch' });
      res.end();
      return;
    }
    pendingOAuthState = null;

    try {
      const result = await exchangeCodeForToken(code);
      if (result.data.access_token) {
        tokenData = { ...result.data, obtained_at: Date.now() };
        saveToken(tokenData);
        clearRefreshError();
        lastLogoutAt = null;
        console.log('[Auth] Token acquired. Scope:', tokenData.scope);
        res.writeHead(302, { Location: '/?auth=success' });
      } else {
        const errMsg = result.data.error_description || result.data.error || JSON.stringify(result.data);
        console.error('[Auth] Token exchange failed:', result.data);
        res.writeHead(302, { Location: `/?error=${encodeURIComponent(errMsg)}` });
      }
    } catch (e) {
      console.error('[Auth] Error:', e.message);
      res.writeHead(302, { Location: `/?error=${encodeURIComponent(e.message)}` });
    }
    res.end();
    return;
  }

  // ── Auth: status ───────────────────────────────────────
  if (pathname === '/auth/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildAuthStatus()));
    return;
  }

  if (pathname === '/debug/token' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildTokenDebugPayload()));
    return;
  }

  // ── Cache diagnostics ─────────────────────────────────
  if (pathname === '/cache/diagnostics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ server: getServerCacheDiagnostics() }));
    return;
  }

  // ── Request log ───────────────────────────────────────
  if (pathname === '/debug/request-log' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildRequestLogPayload()));
    return;
  }

  if (pathname === '/debug/request-log/clear' && req.method === 'POST') {
    clearRequestLog();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ...buildRequestLogPayload() }));
    return;
  }

  if (pathname === '/debug/rate-limit-diagnostics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildRateLimitDiagnosticsPayload()));
    return;
  }

  if (pathname === '/debug/appliance-by-id' && req.method === 'GET') {
    const haId = String(parsed.query.haId || '').trim();
    if (!haId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'missing_haId', upstreamStatus: null, retryAfter: null }));
      return;
    }

    try {
      const result = await callHCApi(`/homeappliances/${encodeURIComponent(haId)}`);
      const retryAfter = result.headers?.['retry-after'] || null;

      if (result.status !== 200) {
        const parsedBody = (() => {
          try {
            return JSON.parse(result.body || '{}');
          } catch {
            return null;
          }
        })();
        const errorMessage = parsedBody?.error?.description || parsedBody?.error?.key || `upstream_${result.status}`;
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          error: errorMessage,
          upstreamStatus: result.status,
          retryAfter,
        }));
        return;
      }

      const projected = buildBrowserApplianceDetailResult(result);
      if (!projected?.haId) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid_upstream_appliance_detail', upstreamStatus: 200, retryAfter }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: projected, upstreamStatus: 200, retryAfter }));
    } catch (error) {
      const status = error.message.includes('Not authenticated') ? 401 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: error.message, upstreamStatus: status, retryAfter: null }));
    }
    return;
  }

  // ── Cache export ──────────────────────────────────────
  if (pathname === '/cache/appliances/export' && req.method === 'GET') {
    const source = String(parsed.query.source || 'server');
    if (source !== 'server') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_cache_source' }));
      return;
    }

    const exportPayload = buildServerApplianceCacheExport();
    if (!exportPayload) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'cache_not_found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(exportPayload));
    return;
  }

  // ── Cache import ──────────────────────────────────────
  if (pathname === '/cache/appliances/import' && req.method === 'POST') {
    try {
      const body = await readJsonRequestBody(req);
      const normalized = normalizeApplianceSnapshot(body);
      if (!normalized) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_snapshot_shape' }));
        return;
      }

      const homeappliances = normalized.payload.data.homeappliances;
      const validationError = validateApplianceEntries(homeappliances);
      if (validationError) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: validationError }));
        return;
      }

      const importedCache = setApplianceCacheFromPayload(normalized.payload, {
        cachedAt: normalized.importedCachedAt || Date.now(),
        source: 'manual-import',
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        cached_at: importedCache.cachedAt,
        appliance_count: homeappliances.length,
        data: normalized.payload.data,
        server: getServerCacheDiagnostics(),
      }));
    } catch (error) {
      const message = error.message || 'import_failed';
      const status = message === 'invalid_json' || message === 'empty_request_body' || message === 'request_too_large' ? 400 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  // ── Cache clear ───────────────────────────────────────
  if (pathname === '/cache/clear' && req.method === 'POST') {
    try {
      const body = await readJsonRequestBody(req);
      const scope = body?.scope;

      if (scope !== 'server') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_cache_scope' }));
        return;
      }

      clearServerApplianceCache();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, scope, server: getServerCacheDiagnostics() }));
    } catch (error) {
      const message = error.message || 'cache_clear_failed';
      const status = message === 'invalid_json' || message === 'empty_request_body' || message === 'request_too_large'
        ? 400
        : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  // ── Auth: refresh ──────────────────────────────────────
  if (pathname === '/auth/refresh') {
    try {
      const result = await doRefreshToken();
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: result.status === 200 && !!result.data.access_token,
          auth_state: buildAuthStatus().auth_state,
          error: result.data.access_token ? null : summarizeAuthError(result.data, 'refresh_failed'),
        })
      );
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, auth_state: buildAuthStatus().auth_state, error: e.message }));
    }
    return;
  }

  // ── Auth: logout ───────────────────────────────────────
  if (pathname === '/auth/logout') {
    tokenData = null;
    clearToken();
    clearRefreshError();
    lastLogoutAt = Date.now();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, auth_state: buildAuthStatus().auth_state }));
    return;
  }

  // ── HC API proxy: GET /proxy/* → /api/* ───────────────
  if (pathname.startsWith('/proxy/')) {
    const apiPath = pathname.replace('/proxy', '');
    try {
      const forceRefresh = req.method === 'GET' && String(parsed.query.refresh || '') === '1';
      const upstreamResult = apiPath === '/homeappliances' && req.method === 'GET'
        ? await getApplianceListWithCache({ forceRefresh })
        : await getProtectedApplianceResult(apiPath, req.method, null, { forceRefresh });
      const result = apiPath === '/homeappliances' && req.method === 'GET'
        ? buildBrowserApplianceListResult(upstreamResult)
        : upstreamResult;

      const responseHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
      if (result.headers?.['retry-after']) {
        responseHeaders['Retry-After'] = result.headers['retry-after'];
      }
      if (result.headers?.['x-homeconnect-cache']) {
        responseHeaders['X-HomeConnect-Cache'] = result.headers['x-homeconnect-cache'];
      }
      if (result.headers?.['x-homeconnect-cache-age-seconds']) {
        responseHeaders['X-HomeConnect-Cache-Age-Seconds'] = result.headers['x-homeconnect-cache-age-seconds'];
      }
      if (result.headers?.['x-homeconnect-cache-cached-at']) {
        responseHeaders['X-HomeConnect-Cache-Cached-At'] = result.headers['x-homeconnect-cache-cached-at'];
      }

      res.writeHead(result.status, responseHeaders);
      res.end(result.body);
    } catch (e) {
      const status = e.message.includes('Not authenticated') ? 401 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── SSE proxy: GET /events/:haId → HC API events stream ──
  if (pathname.startsWith('/events/')) {
    const haId = decodeURIComponent(pathname.slice('/events/'.length));
    if (!haId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing haId' }));
      return;
    }

    try {
      await ensureValidToken();
    } catch (e) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end(e.message);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.flushHeaders();

    const channel = getOrCreateSharedSseChannel(haId);
    const client = { res };
    channel.clients.add(client);

    writeToSseClient(client, ': shared upstream attached\n\n');
    broadcastSseControlEvent(channel, 'CLIENT_ATTACHED', {
      haId,
      clientCount: channel.clients.size,
      shared: true,
    });
    void ensureSharedSseUpstream(channel);

    req.on('close', () => {
      channel.clients.delete(client);
      console.log(`[SSE] Browser disconnected for ${haId}; remaining clients ${channel.clients.size}`);
      if (!res.writableEnded) {
        res.end();
      }
      if (!channelHasDemand(channel)) {
        teardownSharedSseChannel(channel);
      }
    });

    return;
  }

  // ── 404 ───────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

const server = http.createServer((req, res) => {
  handleRequest(req, res, 'main').catch((e) => {
    console.error('[Server] Unhandled error:', e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

const adminServer = http.createServer((req, res) => {
  handleRequest(req, res, 'admin').catch((e) => {
    console.error('[Admin Server] Unhandled error:', e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

server.listen(CONFIG.PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Home Connect Dishwasher Monitor                 ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Open: http://localhost:${CONFIG.PORT}                     ║`);
  console.log('║  Click "Login with Home Connect" to authorize.   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

adminServer.listen(CONFIG.ADMIN_PORT, () => {
  console.log(`[Admin] Station registry editor: http://localhost:${CONFIG.ADMIN_PORT}`);
});
