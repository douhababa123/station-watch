export type StationStatus = "Running" | "Completed" | "Idle" | "Fault" | "Disconnected";

export interface Station {
  id: string;             // A01, B03 ...
  section: "A" | "B" | "C";
  slot_code: string;      // A-1 形式（可与 id 等价）
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
  section: 'all' | 'A' | 'B' | 'C';
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