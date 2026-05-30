import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface VideoResult {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  channelName?: string | null;
  channelAvatarUrl?: string | null;
  duration?: number | null;
  viewCount: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  videos?: VideoResult[];
}

function VideoResults({ videos }: { videos: VideoResult[] }) {
  if (!videos.length) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {videos.map((v) => (
        <Link key={v.id} href={`/watch/${v.id}`}>
          <div className="rounded-lg overflow-hidden border border-border hover:border-primary/60 transition-all cursor-pointer group bg-background shadow-sm">
            <div className="aspect-video bg-muted relative overflow-hidden">
              {v.thumbnailUrl ? (
                <img
                  src={v.thumbnailUrl}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-[10px]">No thumbnail</span>
                </div>
              )}
            </div>
            <div className="p-1.5">
              <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight">
                {v.title}
              </p>
              {v.channelName && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {v.channelName}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function VideoChatBot() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showPulse, setShowPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  // Stop pulse after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Send greeting on first open
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      setMessages([
        {
          role: "assistant",
          content: t("chatbot.greeting"),
          videos: [],
        },
      ]);
    }
  }, [isOpen, hasGreeted, t]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    try {
      const result = await chatMutation.mutateAsync({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        language: i18n.language,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.message,
          videos: result.videos,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("chatbot.error"), videos: [] },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleToggle = () => {
    setIsOpen((v) => !v);
    setShowPulse(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {isOpen && (
        <div
          className="w-80 sm:w-96 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          style={{ height: "500px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{t("chatbot.title")}</p>
                <p className="text-[10px] opacity-70 leading-tight">{t("chatbot.subtitle")}</p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" ? (
                  <div className="max-w-[88%] space-y-1.5">
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-foreground leading-relaxed">
                      {msg.content}
                    </div>
                    {msg.videos && <VideoResults videos={msg.videos} />}
                  </div>
                ) : (
                  <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3.5 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chatbot.inputPlaceholder")}
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                disabled={chatMutation.isPending}
                maxLength={300}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || chatMutation.isPending}
                className="w-7 h-7 bg-primary rounded-full flex items-center justify-center disabled:opacity-40 transition-all hover:bg-primary/90 active:scale-95 flex-shrink-0"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <div className="relative">
        {showPulse && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
        )}
        <button
          onClick={handleToggle}
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95",
            isOpen
              ? "bg-muted text-foreground"
              : "bg-primary text-primary-foreground"
          )}
          aria-label={t("chatbot.title")}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageCircle className="w-6 h-6" />
              <Sparkles className="w-3 h-3 absolute top-1 right-1 text-yellow-300" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
