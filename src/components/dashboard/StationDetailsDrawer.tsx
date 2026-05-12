import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from './StatusBadge';
import { DishwasherModel3D } from './DishwasherModel3D';
import { formatStationSlotCode } from '@/lib/utils';
import {
  Clock,
  RotateCcw,
  Calendar,
  Cog,
  Save,
  X,
  Cpu,
  Hash,
  Layers,
} from 'lucide-react';
import type { Station } from '@/types/station';
import type { StationRegistryPatch } from '@/lib/stationRegistry';

interface StationDetailsDrawerProps {
  station: Station | null;
  isOpen: boolean;
  onClose: () => void;
  onRegistrySave: (stationId: string, patch: StationRegistryPatch) => Promise<void>;
}

export const StationDetailsDrawer: React.FC<StationDetailsDrawerProps> = ({
  station,
  isOpen,
  onClose,
  onRegistrySave,
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    vib: '',
    snr: '',
    haId: '',
    cycles: 0,
  });

  useEffect(() => {
    if (station) {
      setFormData({
        vib: station.device_model || '',
        snr: station.device_sn || '',
        haId: station.binding_haId || '',
        cycles: station.cycles,
      });
    }
    setIsEditing(false);
  }, [station]);

  if (!station) return null;

  const isLiveHomeConnectStation = station.data_source === 'home-connect';
  const displaySlotCode = formatStationSlotCode(station.slot_code);
  const progressPercentage = station.total_time > 0
    ? ((station.total_time - station.time_remaining) / station.total_time) * 100
    : 0;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onRegistrySave(station.id, {
        group: station.group,
        slotCode: station.slot_code,
        vib: formData.vib,
        snr: formData.snr,
        haId: formData.haId,
        cycles: formData.cycles,
      });
      setIsEditing(false);

      toast({
        title: 'Registry Updated',
        description: `Station ${displaySlotCode} registry has been successfully updated.`,
      });
    } catch {
      toast({
        title: 'Update Failed',
        description: 'Failed to update registry entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      vib: station.device_model || '',
      snr: station.device_sn || '',
      haId: station.binding_haId || '',
      cycles: station.cycles,
    });
    setIsEditing(false);
  };

  const metricCards = [
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
      wide: true,
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
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:w-[560px] overflow-y-auto p-0">
        <div className="relative px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-white to-muted/60">
          <div className="flex items-start justify-between mb-1">
            <div>
              <SheetTitle className="text-xl font-bold">{displaySlotCode}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Group {station.group} · {station.device_model || 'No VIB'} · {station.binding_haId || station.device_sn || 'No HAID/SNR'}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {isLiveHomeConnectStation && (
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  Home Connect
                </Badge>
              )}
              <StatusBadge status={station.status} />
            </div>
          </div>

          <div className="mt-2">
            <DishwasherModel3D status={station.status} progress={progressPercentage} />
          </div>

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
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Metrics</p>
            <div className="grid grid-cols-2 gap-3">
              {metricCards.map(({ label, value, icon: Icon, grad, shadow, wide }) => (
                <div key={label} className={`bg-muted border border-border rounded-xl p-3 flex items-center gap-3 ${wide ? 'col-span-2' : ''}`}>
                  <span
                    className={`flex items-center justify-center rounded-xl flex-shrink-0 ${wide ? 'w-11 h-11 rounded-2xl' : 'w-9 h-9'}`}
                    style={{
                      background: grad,
                      boxShadow: `2px 2px 6px ${shadow}, -1px -1px 2px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)`,
                    }}
                  >
                    <Icon className={`${wide ? 'h-5 w-5' : 'h-4 w-4'} text-white`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className={`${wide ? 'text-base' : 'text-sm'} font-bold text-foreground truncate`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Device Info</p>
            <div className="bg-muted border border-border rounded-xl divide-y divide-border overflow-hidden">
              {[
                { icon: Hash, label: 'Station ID', value: station.id },
                { icon: Cpu, label: 'VIB', value: station.device_model || 'N/A' },
                { icon: Hash, label: 'SNR', value: station.device_sn || 'N/A', mono: true },
                { icon: Hash, label: 'HAID', value: station.binding_haId || 'N/A', mono: true },
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

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Registry</p>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Registry
                </Button>
              )}
            </div>

            {isLiveHomeConnectStation && !isEditing && (
              <div className="bg-muted border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground mb-3">
                This station is bound to a live Home Connect appliance. Runtime status, program, and remaining time are synchronized automatically. Registry fields below remain editable.
              </div>
            )}

            {isEditing ? (
              <div className="bg-muted border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">VIB</Label>
                    <Input className="h-8 text-xs" value={formData.vib}
                      onChange={(e) => setFormData((previous) => ({ ...previous, vib: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">SNR</Label>
                    <Input className="h-8 text-xs" value={formData.snr}
                      onChange={(e) => setFormData((previous) => ({ ...previous, snr: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">HAID</Label>
                    <Input className="h-8 text-xs" value={formData.haId}
                      onChange={(e) => setFormData((previous) => ({ ...previous, haId: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Cycles</Label>
                    <Input className="h-8 text-xs" type="number" min="0" value={formData.cycles}
                      onChange={(e) => setFormData((previous) => ({ ...previous, cycles: parseInt(e.target.value, 10) || 0 }))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSave} size="sm" className="flex-1" disabled={isSaving}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                    <X className="h-3.5 w-3.5 mr-1.5" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground">
                Click <span className="font-semibold text-foreground">Edit Registry</span> to modify VIB, SNR, HAID, or cycle count.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
