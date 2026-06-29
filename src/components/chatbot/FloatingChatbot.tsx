import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuToggle } from "@/components/neu/NeuToggle";

type ChatFilter = "24h" | "7d" | "critical";

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("24h");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ filter }),
    }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open assistant"
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full neu-raised neu-press",
          "flex items-center justify-center text-primary transition-transform",
          open && "scale-90",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[min(380px,calc(100vw-3rem))] h-[520px]",
          "neu-raised flex flex-col origin-bottom-right transition-all duration-200",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
        )}
      >
        <div className="flex items-center gap-2 p-4 border-b border-border/40">
          <div className="neu-inset-sm p-2 text-primary"><Bot className="h-4 w-4" /></div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Grid Assistant</h4>
            <p className="text-[11px] text-muted-foreground">Cites the records it uses</p>
          </div>
        </div>
        <div className="px-4 pt-3">
          <NeuToggle<ChatFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
              { value: "critical", label: "Critical" },
            ]}
          />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <p>Ask things like:</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="neu-inset-sm px-3 py-2">"How many critical alarms today?"</li>
                <li className="neu-inset-sm px-3 py-2">"What happened in the last 24 hours?"</li>
                <li className="neu-inset-sm px-3 py-2">"Show me the latest events"</li>
              </ul>
            </div>
          )}
          {messages.map((m: UIMessage) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] text-sm whitespace-pre-wrap",
                  isUser
                    ? "neu-raised-sm px-3 py-2 bg-primary text-primary-foreground"
                    : "text-foreground",
                )}
                  style={isUser ? { background: "var(--primary)", color: "var(--primary-foreground)" } : {}}
                >
                  {text}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="text-xs text-muted-foreground animate-pulse">Thinking...</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t border-border/40 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the grid..."
            className="flex-1 neu-inset-sm px-3 py-2 text-sm bg-transparent outline-none"
            disabled={isLoading}
          />
          <NeuButton type="submit" disabled={isLoading || !input.trim()} className="!px-3">
            <Send className="h-4 w-4" />
          </NeuButton>
        </form>
      </div>
    </>
  );
}
