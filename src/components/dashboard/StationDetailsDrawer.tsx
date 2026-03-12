import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from './StatusBadge';
import { DishwasherModel3D } from './DishwasherModel3D';
import { 
  Clock, 
  Thermometer, 
  Droplets, 
  RotateCcw, 
  Calendar,
  Cog,
  Save,
  X,
  Cpu,
  Hash,
  Layers
} from 'lucide-react';
import type { Station, StationStatus } from '@/types/station';

interface StationDetailsDrawerProps {
  station: Station | null;
  isOpen: boolean;
  onClose: () => void;
  onStationUpdate: (station: Station) => void;
}

export const StationDetailsDrawer: React.FC<StationDetailsDrawerProps> = ({
  station,
  isOpen,
  onClose,
  onStationUpdate
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Station>>({});

  // Reset form when station changes
  useEffect(() => {
    if (station) {
      setFormData({
        status: station.status,
        time_remaining: station.time_remaining,
        cycles: station.cycles,
        program_name: station.program_name || '',
        temperature_c: station.temperature_c || 0,
        inflow_l: station.inflow_l || 0
      });
    }
    setIsEditing(false);
  }, [station]);

  if (!station) return null;

  const handleSave = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedStation: Station = {
        ...station,
        ...formData,
        updated_at: new Date().toISOString()
      };

      onStationUpdate(updatedStation);
      setIsEditing(false);
      
      toast({
        title: "Station Updated",
        description: `Station ${station.slot_code} has been successfully updated.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update station. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      status: station.status,
      time_remaining: station.time_remaining,
      cycles: station.cycles,
      program_name: station.program_name || '',
      temperature_c: station.temperature_c || 0,
      inflow_l: station.inflow_l || 0
    });
    setIsEditing(false);
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const progressPercentage = station.total_time > 0 
    ? ((station.total_time - station.time_remaining) / station.total_time) * 100 
    : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:w-[560px] overflow-y-auto p-0">

        {/* â”€â”€ Coloured header band â”€â”€ */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-white to-muted/60">
          <div className="flex items-start justify-between mb-1">
            <div>
              <SheetTitle className="text-xl font-bold">{station.slot_code}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Group {station.group} Â· {station.device_model || 'No device'} Â· {station.device_sn ? station.device_sn.slice(-8) : 'â€”'}
              </SheetDescription>
            </div>
            <StatusBadge status={station.status} />
          </div>

          {/* 3D Dishwasher visual */}
          <div className="mt-2">
            <DishwasherModel3D status={station.status} progress={progressPercentage} />
          </div>

          {/* Progress bar for Running */}
          {station.status === 'Running' && station.total_time > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-semibold text-foreground">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">

          {/* â”€â”€ Live Metrics Grid â”€â”€ */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Metrics</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Cycles',
                  value: station.cycles.toLocaleString(),
                  icon: RotateCcw,
                  grad: 'linear-gradient(145deg,#818cf8,#4f46e5)',
                  shadow: 'rgba(79,70,229,0.35)',
                },
                {
                  label: 'Program',
                  value: station.program_name || 'None',
                  icon: Cog,
                  grad: 'linear-gradient(145deg,#34d399,#059669)',
                  shadow: 'rgba(5,150,105,0.35)',
                },
                {
                  label: 'Temperature',
                  value: station.temperature_c ? `${Math.round(station.temperature_c)}â„ƒ` : '--',
                  icon: Thermometer,
                  grad: 'linear-gradient(145deg,#fb923c,#dc2626)',
                  shadow: 'rgba(220,38,38,0.35)',
                },
                {
                  label: 'Inflow',
                  value: station.inflow_l ? `${station.inflow_l.toFixed(1)} L` : '--',
                  icon: Droplets,
                  grad: 'linear-gradient(145deg,#38bdf8,#0284c7)',
                  shadow: 'rgba(2,132,199,0.35)',
                },
                {
                  label: 'Time Remaining',
                  value: station.time_remaining ? `${station.time_remaining} min` : '--',
                  icon: Clock,
                  grad: 'linear-gradient(145deg,#a78bfa,#7c3aed)',
                  shadow: 'rgba(124,58,237,0.35)',
                },
                {
                  label: 'Total Time',
                  value: station.total_time ? `${station.total_time} min` : '--',
                  icon: Layers,
                  grad: 'linear-gradient(145deg,#94a3b8,#475569)',
                  shadow: 'rgba(71,85,105,0.35)',
                },
              ].map(({ label, value, icon: Icon, grad, shadow }) => (
                <div key={label} className="bg-muted border border-border rounded-xl p-3 flex items-center gap-3">
                  <span
                    className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                    style={{
                      background: grad,
                      boxShadow: `2px 2px 6px ${shadow}, -1px -1px 2px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)`,
                    }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold text-foreground truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* â”€â”€ Device Info â”€â”€ */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Device Info</p>
            <div className="bg-muted border border-border rounded-xl divide-y divide-border overflow-hidden">
              {[
                { icon: Hash, label: 'Station ID', value: station.id },
                { icon: Cpu, label: 'Device Model', value: station.device_model || 'N/A' },
                { icon: Hash, label: 'Device SN', value: station.device_sn || 'N/A', mono: true },
                { icon: Calendar, label: 'Last Updated', value: new Date(station.updated_at).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              ].map(({ icon: Icon, label, value, mono }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
                  <span className={`text-xs font-medium text-foreground truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* â”€â”€ Edit Controls â”€â”€ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Controls</p>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="bg-muted border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v as StationStatus }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Running','Idle','Completed','Fault','Disconnected'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Program</Label>
                    <Select value={formData.program_name} onValueChange={(v) => setFormData(p => ({ ...p, program_name: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['Magic Daily','Maximum Cleaning','Quick Washer','ECO','Glass Washer'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Time Remaining (min)</Label>
                    <Input className="h-8 text-xs" type="number" min="0" value={formData.time_remaining}
                      onChange={(e) => setFormData(p => ({ ...p, time_remaining: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Cycles</Label>
                    <Input className="h-8 text-xs" type="number" min="0" value={formData.cycles}
                      onChange={(e) => setFormData(p => ({ ...p, cycles: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Temperature (â„ƒ)</Label>
                    <Input className="h-8 text-xs" type="number" min="0" max="100" value={formData.temperature_c}
                      onChange={(e) => setFormData(p => ({ ...p, temperature_c: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Inflow (L)</Label>
                    <Input className="h-8 text-xs" type="number" min="0" step="0.1" value={formData.inflow_l}
                      onChange={(e) => setFormData(p => ({ ...p, inflow_l: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSave} size="sm" className="flex-1">
                    <Save className="h-3.5 w-3.5 mr-1.5" />Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-3.5 w-3.5 mr-1.5" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground">
                Click <span className="font-semibold text-foreground">Edit</span> to modify station parameters.
              </div>
            )}
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
};
