import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendTestEmail } from "@/lib/dashboard.functions";
import { useAlarmSettings } from "@/hooks/use-alarm-settings";
import { Settings, X, Volume2, VolumeX, Mail, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AlarmSettingsControl() {
  const { settings, update } = useAlarmSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [newEmail, setNewEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const testEmail = useServerFn(sendTestEmail);

  useEffect(() => { if (open) setDraft(settings); }, [open, settings]);

  const canSave = useMemo(() => draft.recipients.length > 0, [draft]);

  const playTest = () => {
    const audio = new Audio("/sounds/alarm.wav");
    audio.volume = draft.volume;
    audio.play().catch(() => toast.error("Could not play sound"));
  };

  const addRecipient = () => {
    const e = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Enter a valid email");
      return;
    }
    if (draft.recipients.includes(e)) {
      toast.message("Already added");
      return;
    }
    setDraft({ ...draft, recipients: [...draft.recipients, e] });
    setNewEmail("");
  };

  const removeRecipient = (email: string) => {
    setDraft({ ...draft, recipients: draft.recipients.filter((r) => r !== email) });
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const res = await testEmail({ data: { recipients: draft.recipients } });
      if (res.status === "sent") toast.success(`Test email sent to ${draft.recipients.length} recipient(s)`);
      else if (res.status === "stubbed") toast.message("Logged (stubbed)", {
        description: "Connect the Mailgun connector to deliver real email.",
      });
      else toast.error("Test email failed", { description: res.providerInfo?.error?.slice(0, 200) });
    } catch (e) {
      toast.error("Test email failed", { description: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    update(draft);
    toast.success("Preferences saved");
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Dashboard settings"
        className="neu-raised-sm neu-press p-2.5 text-foreground hover:text-primary"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className="neu-raised w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="neu-inset-sm p-2.5 text-primary"><Settings className="h-5 w-5" /></div>
                <h2 className="text-xl font-bold font-display">Dashboard Settings</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="neu-raised-sm neu-press p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sound section */}
            <div className="neu-inset p-4 mb-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Critical Alarm Sound</h3>
                  <p className="text-xs text-muted-foreground">Play an audible beep for new critical alarms</p>
                </div>
                <button
                  onClick={() => setDraft({ ...draft, soundEnabled: !draft.soundEnabled })}
                  className={cn(
                    "relative h-6 w-11 neu-inset-sm rounded-full transition-colors",
                    draft.soundEnabled && "bg-primary/20",
                  )}
                  aria-label="Toggle sound"
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full neu-raised-sm transition-transform",
                    draft.soundEnabled ? "translate-x-5 bg-primary" : "translate-x-0.5",
                  )} />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Alarm Volume</label>
                  <button
                    onClick={playTest}
                    disabled={!draft.soundEnabled}
                    className="neu-raised-sm neu-press px-2.5 py-1 text-xs text-primary font-semibold disabled:opacity-50"
                  >
                    Test Sound
                  </button>
                </div>
                <div className="flex items-center gap-2 neu-inset-sm px-3 py-2 rounded-md">
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={draft.volume}
                    onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })}
                    disabled={!draft.soundEnabled}
                    className="flex-1 accent-primary"
                  />
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs tabular-nums w-10 text-right">{Math.round(draft.volume * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Recipients section */}
            <div className="neu-inset p-4 mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Critical Alert Recipients</h3>
                </div>
                <button
                  onClick={runTest}
                  disabled={testing || draft.recipients.length === 0}
                  className="neu-raised-sm neu-press px-2.5 py-1 text-xs text-primary font-semibold flex items-center gap-1 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Send test email
                </button>
              </div>

              <ul className="space-y-2">
                {draft.recipients.map((r) => (
                  <li key={r} className="neu-raised-sm flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-sm text-primary font-medium truncate">{r}</span>
                    </div>
                    <button
                      onClick={() => removeRecipient(r)}
                      className="text-muted-foreground hover:text-critical p-1"
                      aria-label={`Remove ${r}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {draft.recipients.length === 0 && (
                  <li className="text-xs text-muted-foreground text-center py-2">No recipients configured</li>
                )}
              </ul>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
                  placeholder="add.email@uetcl.com"
                  className="flex-1 neu-inset-sm px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 focus:ring-primary rounded-md"
                />
                <button
                  onClick={addRecipient}
                  className="neu-raised-sm neu-press p-2 text-primary"
                  aria-label="Add recipient"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center pt-1">
                Recipients are stored in this browser
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="neu-raised-sm neu-press px-5 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                className="neu-raised-sm neu-press px-5 py-2 text-sm font-semibold text-primary disabled:opacity-50"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
