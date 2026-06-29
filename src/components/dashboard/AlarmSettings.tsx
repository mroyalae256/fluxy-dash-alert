import { useAlarmSettings } from "@/hooks/use-alarm-settings";
import { Volume2, VolumeX, Settings } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AlarmSettingsControl() {
  const { settings, update } = useAlarmSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Alarm sound settings"
        className="neu-raised-sm neu-press p-2.5 text-foreground hover:text-primary"
      >
        <Settings className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 neu-raised p-4 z-40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Alarm sound</span>
            <button
              onClick={() => update({ soundEnabled: !settings.soundEnabled })}
              className={cn(
                "neu-raised-sm neu-press px-2 py-1 text-xs",
                settings.soundEnabled ? "text-primary" : "text-muted-foreground",
              )}
            >
              {settings.soundEnabled ? "On" : "Off"}
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Volume</span>
              <span className="text-xs tabular-nums">{Math.round(settings.volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <VolumeX className="h-3 w-3 text-muted-foreground" />
              <input
                type="range" min={0} max={1} step={0.05}
                value={settings.volume}
                onChange={(e) => update({ volume: Number(e.target.value) })}
                disabled={!settings.soundEnabled}
                className="flex-1 accent-primary"
              />
              <Volume2 className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Settings saved in this browser. Email is sent to operators after the alarm sound finishes.
          </p>
        </div>
      )}
    </div>
  );
}
