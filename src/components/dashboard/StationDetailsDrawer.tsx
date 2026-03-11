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
import { 
  Clock, 
  Thermometer, 
  Droplets, 
  RotateCcw, 
  Calendar,
  Cog,
  Save,
  X
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
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">
                Station {station.slot_code}
              </SheetTitle>
              <SheetDescription>
                Detailed information and controls
              </SheetDescription>
            </div>
            <StatusBadge status={station.status} />
          </div>

          <Separator />
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cog className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Station ID</Label>
                  <div className="font-medium">{station.id}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Group</Label>
                  <div className="font-medium">Group {station.group}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Device Model</Label>
                  <div className="font-medium">{station.device_model || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Device SN</Label>
                  <div className="font-medium font-mono text-xs">{station.device_sn || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Last updated: {formatDateTime(station.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Current Status</span>
                </CardTitle>
                {!isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, status: value as StationStatus }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Running">Running</SelectItem>
                        <SelectItem value="Idle">Idle</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Fault">Fault</SelectItem>
                        <SelectItem value="Disconnected">Disconnected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Remaining */}
                  <div>
                    <Label htmlFor="timeRemaining">Time Remaining (minutes)</Label>
                    <Input
                      id="timeRemaining"
                      type="number"
                      min="0"
                      value={formData.time_remaining}
                      onChange={(e) => 
                        setFormData(prev => ({ ...prev, time_remaining: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>

                  {/* Program Name */}
                  <div>
                    <Label htmlFor="programName">Program Name</Label>
                    <Select
                      value={formData.program_name}
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, program_name: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Magic Daily">Magic Daily</SelectItem>
                        <SelectItem value="Maximum Cleaning">Maximum Cleaning</SelectItem>
                        <SelectItem value="Quick Washer">Quick Washer</SelectItem>
                        <SelectItem value="ECO">ECO</SelectItem>
                        <SelectItem value="Glass Washer">Glass Washer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cycles */}
                  <div>
                    <Label htmlFor="cycles">Cycles</Label>
                    <Input
                      id="cycles"
                      type="number"
                      min="0"
                      value={formData.cycles}
                      onChange={(e) => 
                        setFormData(prev => ({ ...prev, cycles: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <Label htmlFor="temperature">Temperature (℃)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.temperature_c}
                      onChange={(e) => 
                        setFormData(prev => ({ ...prev, temperature_c: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </div>

                  {/* Inflow */}
                  <div>
                    <Label htmlFor="inflow">Inflow (L)</Label>
                    <Input
                      id="inflow"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.inflow_l}
                      onChange={(e) => 
                        setFormData(prev => ({ ...prev, inflow_l: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground">Current Status</Label>
                      <div><StatusBadge status={station.status} /></div>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground">Time Remaining</Label>
                      <div className="font-medium">
                        {station.time_remaining} minutes
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Program</Label>
                      <div className="font-medium">
                        {station.program_name || 'None'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground flex items-center space-x-1">
                        <RotateCcw className="h-3 w-3" />
                        <span>Cycles</span>
                      </Label>
                      <div className="font-medium">
                        {station.cycles.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground flex items-center space-x-1">
                        <Thermometer className="h-3 w-3" />
                        <span>Temperature</span>
                      </Label>
                      <div className="font-medium">
                        {station.temperature_c ? `${Math.round(station.temperature_c)}℃` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground flex items-center space-x-1">
                        <Droplets className="h-3 w-3" />
                        <span>Inflow</span>
                      </Label>
                      <div className="font-medium">
                        {station.inflow_l ? `${station.inflow_l.toFixed(1)}L` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar for Running Stations */}
              {station.status === 'Running' && station.total_time > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-dashboard-progress rounded-full h-2">
                    <div 
                      className="bg-status-running h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};