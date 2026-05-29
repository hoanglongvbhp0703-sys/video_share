import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Video, Users, Send, Square, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function waitForIceComplete(pc: RTCPeerConnection, timeoutMs = 8000): Promise<void> {
  return new Promise(resolve => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    const timer = setTimeout(resolve, timeoutMs);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") { clearTimeout(timer); resolve(); }
    };
  });
}

export default function GoLive() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [livestreamId, setLivestreamId] = useState<number | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chats, setChats] = useState<Array<{ id: number; userName: string; message: string }>>([]);
  const [lastChatId, setLastChatId] = useState(0);
  const [lastSignalId, setLastSignalId] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<number, RTCPeerConnection>());
  const processedSignals = useRef(new Set<number>());

  const startMutation = trpc.livestreams.start.useMutation();
  const endMutation = trpc.livestreams.end.useMutation();
  const sendAnswerMutation = trpc.livestreams.sendStreamerAnswer.useMutation();
  const sendChatMutation = trpc.livestreams.sendChat.useMutation();
  const updateCountMutation = trpc.livestreams.updateViewerCount.useMutation();

  const { data: signals } = trpc.livestreams.getStreamerSignals.useQuery(
    { livestreamId: livestreamId ?? 0, afterId: lastSignalId },
    { enabled: isLive && !!livestreamId, refetchInterval: 2000, staleTime: 0 }
  );

  const { data: newChats } = trpc.livestreams.getChats.useQuery(
    { livestreamId: livestreamId ?? 0, afterId: lastChatId },
    { enabled: isLive && !!livestreamId, refetchInterval: 2000, staleTime: 0 }
  );

  useEffect(() => {
    if (!signals?.length) return;
    const stream = localStream.current;
    if (!stream) return;

    (async () => {
      for (const sig of signals) {
        if (processedSignals.current.has(sig.id)) continue;
        processedSignals.current.add(sig.id);
        setLastSignalId(prev => Math.max(prev, sig.id));
        if (sig.type === "offer" && !peers.current.has(sig.viewerId)) {
          await handleViewerOffer(sig.viewerId, sig.payload, stream);
        }
      }
    })();
  }, [signals, livestreamId]);

  useEffect(() => {
    if (!newChats?.length) return;
    const fresh = newChats.filter(c => c.id > lastChatId);
    if (!fresh.length) return;
    setChats(prev => [...prev, ...fresh]);
    setLastChatId(fresh[fresh.length - 1].id);
  }, [newChats]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const updateCount = (id: number, map: Map<number, RTCPeerConnection>) => {
    const count = map.size;
    setViewerCount(count);
    updateCountMutation.mutate({ id, count });
  };

  const handleViewerOffer = async (
    viewerId: number,
    offerSdp: string,
    stream: MediaStream
  ) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peers.current.set(viewerId, pc);

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        updateCount(livestreamId!, peers.current);
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        peers.current.delete(viewerId);
        updateCount(livestreamId!, peers.current);
      }
    };

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceComplete(pc);

    await sendAnswerMutation.mutateAsync({
      livestreamId: livestreamId!,
      viewerId,
      payload: pc.localDescription!.sdp!,
    });
  };

  const handleStart = async () => {
    if (!title.trim()) { toast.error(t("golive.titleRequired")); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      const result = await startMutation.mutateAsync({ title: title.trim() });
      setLivestreamId(result.id);
      setIsLive(true);
      toast.success(t("golive.startedLive"));
    } catch (err: any) {
      toast.error(
        err.name === "NotAllowedError"
          ? t("golive.cameraError")
          : `${err.message}`
      );
    }
  };

  const handleEnd = async () => {
    peers.current.forEach(pc => pc.close());
    peers.current.clear();
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (livestreamId) await endMutation.mutateAsync({ id: livestreamId });
    setIsLive(false);
    setLivestreamId(null);
    setViewerCount(0);
    setChats([]);
    setLastChatId(0);
    setLastSignalId(0);
    processedSignals.current.clear();
    toast.success(t("golive.endedLive"));
  };

  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !livestreamId) return;
    setChatInput("");
    await sendChatMutation.mutateAsync({ livestreamId, message: msg });
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">{t("golive.loginRequired")}</p>
            <Button onClick={() => navigate("/login")}>{t("golive.login")}</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Radio className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold text-foreground">{t("golive.title")}</h1>
          {isLive && (
            <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              LIVE
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-3">
                  <Video className="w-14 h-14" />
                  <p className="text-sm">{t("golive.cameraPreview")}</p>
                </div>
              )}
              {isLive && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    LIVE
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                    <Users className="w-3.5 h-3.5" />
                    {viewerCount}
                  </span>
                </div>
              )}
            </div>

            {!isLive ? (
              <div className="space-y-3">
                <Input
                  placeholder={t("golive.titlePlaceholder")}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleStart()}
                  maxLength={255}
                  disabled={startMutation.isPending}
                />
                <Button
                  onClick={handleStart}
                  disabled={startMutation.isPending || !title.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
                  size="lg"
                >
                  <Radio className="w-4 h-4" />
                  {startMutation.isPending ? t("golive.starting") : t("golive.start")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
                <div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Users className="w-4 h-4" />
                    {viewerCount} {t("golive.watching")}
                  </p>
                </div>
                <Button
                  onClick={handleEnd}
                  variant="destructive"
                  disabled={endMutation.isPending}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  {t("golive.end")}
                </Button>
              </div>
            )}
          </div>

          {/* Live chat */}
          <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden h-[500px] lg:h-auto lg:max-h-[560px]">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              <p className="font-semibold text-sm text-foreground">{t("golive.liveChat")}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {chats.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">{t("golive.noChats")}</p>
              )}
              {chats.map(c => (
                <div key={c.id} className="text-sm">
                  <span className="font-semibold text-primary">{c.userName}: </span>
                  <span className="text-foreground break-words">{c.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-border flex gap-2">
              <Input
                placeholder={isLive ? t("golive.chatPlaceholder") : t("golive.chatDisabled")}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChat()}
                maxLength={500}
                disabled={!isLive || sendChatMutation.isPending}
                className="text-sm h-9"
              />
              <Button
                size="sm"
                onClick={handleSendChat}
                disabled={!isLive || !chatInput.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
