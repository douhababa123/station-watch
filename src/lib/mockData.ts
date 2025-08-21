import type { Station, StationStatus } from '@/types/station';

const DEVICE_MODELS = ['QMT-300', 'QMT-500', 'WD-Pro', 'HD-Max'];
const PROGRAMS = ['Magic Daily', 'Maximum Cleaning', 'Quick Washer', 'ECO', 'Glass Washer'];

const generateDeviceSN = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
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

export const generateMockStations = (): Station[] => {
  const stations: Station[] = [];
  const sections = ['A', 'B', 'C'] as const;
  
  sections.forEach(section => {
    for (let i = 1; i <= 8; i++) {
      const id = `${section}${i.toString().padStart(2, '0')}`;
      const slotCode = `${section}-${i}`;
      
      // Random status distribution
      const statusWeights = {
        'Running': 0.4,
        'Idle': 0.3,
        'Completed': 0.15,
        'Fault': 0.1,
        'Disconnected': 0.05
      };
      
      const rand = Math.random();
      let status: StationStatus = 'Idle';
      let cumulative = 0;
      
      for (const [s, weight] of Object.entries(statusWeights)) {
        cumulative += weight;
        if (rand <= cumulative) {
          status = s as StationStatus;
          break;
        }
      }
      
      const deviceModel = DEVICE_MODELS[Math.floor(Math.random() * DEVICE_MODELS.length)];
      const deviceSN = generateDeviceSN();
      const totalTime = 45 + Math.floor(Math.random() * 75); // 45-120 minutes
      
      let timeRemaining = 0;
      if (status === 'Running') {
        timeRemaining = Math.floor(Math.random() * totalTime);
      }
      
      const station: Station = {
        id,
        section,
        slot_code: slotCode,
        device_model: Math.random() > 0.1 ? deviceModel : undefined, // 10% chance of no device
        device_sn: Math.random() > 0.1 ? deviceSN : undefined,
        status,
        time_remaining: timeRemaining,
        total_time: totalTime,
        cycles: Math.floor(Math.random() * 1000) + 1,
        program_name: status !== 'Idle' && status !== 'Disconnected' 
          ? PROGRAMS[Math.floor(Math.random() * PROGRAMS.length)]
          : undefined,
        temperature_c: status === 'Running' ? 65 + Math.floor(Math.random() * 20) : undefined,
        inflow_l: status === 'Running' ? 2.5 + Math.random() * 1.5 : undefined,
        updated_at: new Date().toISOString()
      };
      
      stations.push(station);
    }
  });
  
  return stations;
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