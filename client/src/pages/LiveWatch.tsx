import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams, Link } from "wouter";
import { toast } from "sonner";
import { Users, Send, Loader2, WifiOff, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

function waitForIceComplete(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  return new Promise(resolve => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    const timer = setTimeout(resolve, timeoutMs);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") { clearTimeout(timer); resolve(); }
    };
  });
}

type ConnState = "idle" | "connecting" | "connected" | "failed";

export default function LiveWatch() {
  const { channelId } = useParams<{ channelId: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const [connState, setConnState] = useState<ConnState>("idle");
  const [chatInput, setChatInput] = useState("");
  const [chats, setChats] = useState<Array<{ id: number; userName: string; message: string }>>([]);
  const [lastChatId, setLastChatId] = useState(0);
  const [lastSignalId, setLastSignalId] = useState(0);
  const [offerSent, setOfferSent] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const processedSignals = useRef(new Set<number>());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const viewerId = user?.id ?? 0;

  const { data: livestream, isLoading } = trpc.livestreams.getActiveByChannel.useQuery(
    { channelId: parseInt(channelId || "0") },
    { enabled: !!channelId, refetchInterval: 5000, staleTime: 0 }
  );

  const sendOfferMutation = trpc.livestreams.sendViewerOffer.useMutation();
  const sendChatMutation = trpc.livestreams.sendChat.useMutation();

  const { data: signals } = trpc.livestreams.getViewerSignals.useQuery(
    { livestreamId: livestream?.id ?? 0, viewerId, afterId: lastSignalId },
    {
      enabled: !!livestream && isAuthenticated && offerSent && viewerId > 0,
      refetchInterval: 500,
      staleTime: 0,
    }
  );

  const { data: newChats } = trpc.livestreams.getChats.useQuery(
    { livestreamId: livestream?.id ?? 0, afterId: lastChatId },
    { enabled: !!livestream, refetchInterval: 2000, staleTime: 0 }
  );

  useEffect(() => {
    if (!livestream || !isAuthenticated || !user || offerSent || pcRef.current) return;
    initPeerConnection();
  }, [livestream?.id, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!signals?.length || !pcRef.current) return;
    for (const sig of signals) {
      if (processedSignals.current.has(sig.id)) continue;
      processedSignals.current.add(sig.id);
      setLastSignalId(prev => Math.max(prev, sig.id));

      if (sig.type === "answer" && pcRef.current.signalingState === "have-local-offer") {
        pcRef.current
          .setRemoteDescription({ type: "answer", sdp: sig.payload })
          .catch(console.error);
      }
    }
  }, [signals]);

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

  useEffect(() => {
    return () => {
      pcRef.current?.close();
    };
  }, []);

  const initPeerConnection = async () => {
    setConnState("connecting");

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    const remoteStream = new MediaStream();
    pc.ontrack = e => {
      e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      if (videoRef.current) videoRef.current.srcObject = remoteStream;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setConnState("connected");
      if (pc.connectionState === "failed" || pc.connectionState === "closed") setConnState("failed");
    };

    try {
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      await waitForIceComplete(pc);

      await sendOfferMutation.mutateAsync({
        livestreamId: livestream!.id,
        payload: pc.localDescription!.sdp!,
      });
      setOfferSent(true);
    } catch (err: any) {
      console.error("WebRTC offer error:", err);
      setConnState("failed");
    }
  };

  const handleRetry = () => {
    pcRef.current?.close();
    pcRef.current = null;
    processedSignals.current.clear();
    setOfferSent(false);
    setLastSignalId(0);
    setConnState("idle");
    setTimeout(() => initPeerConnection(), 100);
  };

  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !livestream) return;
    if (!isAuthenticated) { toast.error(t("livewatch.loginToChat")); return; }
    setChatInput("");
    await sendChatMutation.mutateAsync({ livestreamId: livestream.id, message: msg });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!livestream) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <WifiOff className="w-14 h-14 text-muted-foreground/40" />
          <p className="text-muted-foreground text-lg">{t("livewatch.noLivestream")}</p>
          <Button variant="outline" onClick={() => navigate(`/channel/${channelId}`)}>
            {t("livewatch.viewChannel")}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {connState === "connecting" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-black/80">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="text-sm">{t("livewatch.connecting")}</p>
                  <p className="text-xs text-white/50">{t("livewatch.connectingHint")}</p>
                </div>
              )}

              {connState === "failed" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-black/80">
                  <WifiOff className="w-10 h-10" />
                  <p className="text-sm">{t("livewatch.connectionFailed")}</p>
                  <Button size="sm" variant="outline" onClick={handleRetry}>
                    {t("livewatch.retry")}
                  </Button>
                </div>
              )}

              {connState === "connected" && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    LIVE
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                    <Users className="w-3.5 h-3.5" />
                    {livestream.viewerCount}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3">
              <Link href={`/channel/${livestream.channelId}`}>
                <Avatar className="w-10 h-10 flex-shrink-0 cursor-pointer">
                  {livestream.channelAvatarUrl && (
                    <AvatarImage src={livestream.channelAvatarUrl} />
                  )}
                  <AvatarFallback>
                    {livestream.channelName?.charAt(0).toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <h1 className="font-semibold text-foreground leading-tight">{livestream.title}</h1>
                <Link
                  href={`/channel/${livestream.channelId}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {livestream.channelName}
                </Link>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {t("livewatch.loginRequired")}
                </p>
                <Button size="sm" onClick={() => navigate("/login")}>
                  {t("livewatch.login")}
                </Button>
              </div>
            )}
          </div>

          {/* Live chat */}
          <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden h-[420px] lg:h-auto">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-red-500" />
              <p className="font-semibold text-sm text-foreground">{t("livewatch.liveChat")}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {chats.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">{t("livewatch.noChats")}</p>
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
                placeholder={isAuthenticated ? t("livewatch.chatPlaceholder") : t("livewatch.chatLoginPlaceholder")}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChat()}
                maxLength={500}
                disabled={!isAuthenticated || sendChatMutation.isPending}
                className="text-sm h-9"
              />
              <Button
                size="sm"
                onClick={handleSendChat}
                disabled={!chatInput.trim() || !isAuthenticated}
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
