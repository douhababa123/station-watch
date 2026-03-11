export type StationStatus = "Running" | "Completed" | "Idle" | "Fault" | "Disconnected";

export type StationGroup = "A" | "1" | "2" | "3" | "4" | "V";

export interface StationGroupConfig {
  id: StationGroup;
  label: string;       // "A组", "1组", "V组"
  slotCount: number;   // 12, 24, 24, 24, 24, 10
  slotPrefix: string;  // "A", "1-", "2-", "3-", "4-", "V-"
}

export const STATION_GROUPS: StationGroupConfig[] = [
  { id: "A", label: "A组", slotCount: 12, slotPrefix: "A"  },
  { id: "1", label: "1组", slotCount: 24, slotPrefix: "1-" },
  { id: "2", label: "2组", slotCount: 24, slotPrefix: "2-" },
  { id: "3", label: "3组", slotCount: 24, slotPrefix: "3-" },
  { id: "4", label: "4组", slotCount: 24, slotPrefix: "4-" },
  { id: "V", label: "V组", slotCount: 10, slotPrefix: "V-" },
];

export interface Station {
  id: string;             // A01, 1-01, V-01 ...
  group: StationGroup;
  slot_code: string;      // A1~A12, 1-1~1-24, V-1~V-10
  device_model?: string;  // QMT-300
  device_sn?: string;     // GV650AX.3CN
  status: StationStatus;
  time_remaining: number; // minutes
  total_time: number;     // minutes
  cycles: number;
  program_name?: string;
  temperature_c?: number; // ℃
  inflow_l?: number;      // L
  updated_at: string;     // ISO
}

export interface FilterState {
  group: 'all' | StationGroup;
  status: 'all' | StationStatus;
  search: string;
  hideDisconnected: boolean;
}

export interface Statistics {
  totalStations: number;
  uniqueDevices: number;
  idleStations: number;
  faultStations: number;
}

export interface Notification {
  id: string;
  type: 'completion' | 'fault';
  stationId: string;
  message: string;
  timestamp: Date;
}