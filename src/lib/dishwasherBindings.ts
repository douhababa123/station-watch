export interface DishwasherBinding {
  haId: string;
  stationId: string;
  stationSlotCode: string;
  displaySlotCode: string;
}

export const DISHWASHER_BINDINGS: DishwasherBinding[] = [
  {
    haId: '296010398026007511',
    stationId: '3-05',
    stationSlotCode: '3-5',
    displaySlotCode: '3-05',
  },
  {
    haId: '80013177660000482616000000827',
    stationId: 'A09',
    stationSlotCode: 'A9',
    displaySlotCode: 'A-9',
  },
];

export const BOUND_DISHWASHER_HAIDS = new Set(
  DISHWASHER_BINDINGS.map((binding) => binding.haId),
);

export const BOUND_DISHWASHER_STATION_IDS = new Set(
  DISHWASHER_BINDINGS.map((binding) => binding.stationId),
);

export function findDishwasherBindingByStation(stationId: string, slotCode: string) {
  return DISHWASHER_BINDINGS.find(
    (binding) => binding.stationId === stationId || binding.stationSlotCode === slotCode,
  );
}

export function findDishwasherBindingByHaId(haId: string) {
  return DISHWASHER_BINDINGS.find((binding) => binding.haId === haId);
}

export function isBoundDishwasherStation(stationId: string) {
  return BOUND_DISHWASHER_STATION_IDS.has(stationId);
}