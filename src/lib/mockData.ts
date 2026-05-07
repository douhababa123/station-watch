import type { Station, StationStatus } from '@/types/station';
import { STATION_GROUPS } from '@/types/station';

const DEVICE_MODELS = ['QMT-300', 'QMT-500', 'WD-Pro', 'HD-Max'];
const PROGRAMS = ['Magic Daily', 'Maximum Cleaning', 'Quick Washer', 'ECO', 'Glass Washer'];

const generateDeviceSN = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  let sn = '';
  // Format: XX###XX.#XX (e.g., GV650AX.3CN)
  sn += letters[Math.floor(Math.random() * letters.length)];
  sn += letters[Math.floor(Math.random() * letters.length)];
  sn += Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  sn += letters[Math.floor(Math.random() * letters.length)];
  sn += letters[Math.floor(Math.random() * letters.length)];
  sn += '.';
  sn += Math.floor(Math.random() * 10);
  sn += letters[Math.floor(Math.random() * letters.length)];
  sn += letters[Math.floor(Math.random() * letters.length)];
  
  return sn;
};

// 预定义状态分布：Running(85) + Idle(18) + Completed(8) + Fault(5) + Disconnected(2) = 118
// 保证 Running > 80，且三类汇总：测试中(85) + 空余(26) + 维修(7) = 118
const STATUS_POOL: StationStatus[] = [
  ...Array(85).fill('Running'),
  ...Array(18).fill('Idle'),
  ...Array(8).fill('Completed'),
  ...Array(5).fill('Fault'),
  ...Array(2).fill('Disconnected'),
] as StationStatus[];

// 使用固定种子的简单 shuffle，保证每次初始化一致
const shuffleStatuses = (): StationStatus[] => {
  const arr = [...STATUS_POOL];
  // deterministic shuffle based on index math (no random, always same order)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (i * 1103515245 + 12345) % arr.length;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const statusAssignments = shuffleStatuses();
let statusIndex = 0;
const pickStatus = (): StationStatus => {
  const s = statusAssignments[statusIndex % statusAssignments.length];
  statusIndex++;
  return s;
};

export const generateMockStations = (): Station[] => {
  statusIndex = 0; // reset so status distribution is always exact
  const stations: Station[] = [];

  for (const groupConfig of STATION_GROUPS) {
    for (let i = 1; i <= groupConfig.slotCount; i++) {
      const id        = `${groupConfig.slotPrefix}${i.toString().padStart(2, '0')}`;
      const slotCode  = `${groupConfig.slotPrefix}${i}`;
      const status    = pickStatus();
      const totalTime = 45 + Math.floor(Math.random() * 75); // 45-120 minutes

      const station: Station = {
        id,
        group: groupConfig.id,
        slot_code: slotCode,
        device_model: Math.random() > 0.1 ? DEVICE_MODELS[Math.floor(Math.random() * DEVICE_MODELS.length)] : undefined,
        device_sn:    Math.random() > 0.1 ? generateDeviceSN() : undefined,
        status,
        time_remaining: status === 'Running' ? Math.floor(Math.random() * totalTime) : 0,
        total_time: totalTime,
        cycles: Math.floor(Math.random() * 1000) + 1,
        program_name: status !== 'Idle' && status !== 'Disconnected'
          ? PROGRAMS[Math.floor(Math.random() * PROGRAMS.length)]
          : undefined,
        temperature_c: status === 'Running' ? 65 + Math.floor(Math.random() * 20) : undefined,
        inflow_l:      status === 'Running' ? 2.5 + Math.random() * 1.5 : undefined,
        updated_at: new Date().toISOString(),
      };

      stations.push(station);
    }
  }

  return stations; // 总计 118 条
};

export const updateStationsRealtime = (stations: Station[]) => {
  const newNotifications: Array<{
    type: 'completion' | 'fault';
    stationId: string;
    message: string;
  }> = [];
  
  const updatedStations = stations.map(station => {
    // Only update running stations
    if (station.status !== 'Running') {
      return station;
    }
    
    const newStation = { ...station };
    
    // Decrease remaining time
    if (newStation.time_remaining > 0) {
      newStation.time_remaining = Math.max(0, newStation.time_remaining - 1);
      
      // Add slight variations to temperature and inflow
      if (newStation.temperature_c) {
        newStation.temperature_c = Math.max(
          60,
          Math.min(85, newStation.temperature_c + (Math.random() - 0.5) * 2)
        );
      }
      
      if (newStation.inflow_l) {
        newStation.inflow_l = Math.max(
          2.0,
          Math.min(4.5, newStation.inflow_l + (Math.random() - 0.5) * 0.2)
        );
      }
    }
    
    // When time reaches 0, transition to completed or fault
    if (newStation.time_remaining === 0) {
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (isSuccess) {
        newStation.status = 'Completed';
        newStation.temperature_c = undefined;
        newStation.inflow_l = undefined;
        
        newNotifications.push({
          type: 'completion',
          stationId: newStation.id,
          message: `Station ${newStation.slot_code} completed ${newStation.program_name} program`
        });
      } else {
        newStation.status = 'Fault';
        newStation.temperature_c = undefined;
        newStation.inflow_l = undefined;
        
        newNotifications.push({
          type: 'fault',
          stationId: newStation.id,
          message: `Station ${newStation.slot_code} encountered a fault - requires maintenance`
        });
      }
    }
    
    newStation.updated_at = new Date().toISOString();
    return newStation;
  });
  
  return { updatedStations, newNotifications };
};