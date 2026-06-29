import { createFileRoute } from "@tanstack/react-router";
import { StatusCards } from "@/components/dashboard/StatusCards";
import { EventsBarChart } from "@/components/dashboard/EventsBarChart";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CriticalAlarmListener } from "@/components/dashboard/CriticalAlarmListener";
import { CriticalAlarmsPanel } from "@/components/dashboard/CriticalAlarmsPanel";
import { AlarmSettingsControl } from "@/components/dashboard/AlarmSettings";
import { FloatingChatbot } from "@/components/chatbot/FloatingChatbot";
import { NeuButton } from "@/components/neu/NeuButton";
import { useServerFn } from "@tanstack/react-start";
import { simulateCriticalAlarm } from "@/lib/dashboard.functions";
import { Zap, Siren } from "lucide-react";
import { Toaster } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UETCL Grid Monitoring" },
      { name: "description", content: "Neumorphic real-time dashboard for events, alarms, and critical alarms across the grid." },
      { property: "og:title", content: "UETCL Grid Monitoring" },
      { property: "og:description", content: "Real-time grid events, alarms, and AI assistant." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const simulate = useServerFn(simulateCriticalAlarm);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8" style={{ background: "var(--neu-bg)" }}>
      <Toaster position="top-right" richColors />
      <CriticalAlarmListener />

      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="neu-raised-sm p-2.5 text-primary"><Zap className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display">UETCL Grid Monitor</h1>
            <p className="text-xs text-muted-foreground">Transmitting for transformation</p>
          </div>
        </div>
        <NeuButton onClick={() => simulate()} className="flex items-center gap-2 text-critical">
          <Siren className="h-4 w-4" /> Trigger test alarm
        </NeuButton>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        <StatusCards />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><EventsBarChart /></div>
          <ComparisonChart />
        </div>
        <ActivityFeed />
      </main>

      <FloatingChatbot />
    </div>
  );
}
