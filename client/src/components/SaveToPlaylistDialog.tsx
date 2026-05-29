import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ListVideo, Plus, Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

interface SaveToPlaylistDialogProps {
  videoId: number;
  open: boolean;
  onClose: () => void;
}

export default function SaveToPlaylistDialog({ videoId, open, onClose }: SaveToPlaylistDialogProps) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: playlists, isLoading } = trpc.playlists.getMyPlaylists.useQuery(
    undefined,
    { enabled: isAuthenticated && open }
  );

  const addVideoMutation = trpc.playlists.addVideo.useMutation({
    onSuccess: (_, vars) => {
      const playlist = playlists?.find(p => p.id === vars.playlistId);
      toast.success(t("channel.savedToPlaylist", { name: playlist?.name ?? "" }));
      utils.playlists.getMyPlaylists.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const createMutation = trpc.playlists.create.useMutation({
    onSuccess: (playlist) => {
      addVideoMutation.mutate({ playlistId: playlist.id, videoId });
      setCreatingNew(false);
      setNewName("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("channel.saveToPlaylistTitle")}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">{t("channel.loginToSave")}</p>
            <Button onClick={() => { onClose(); navigate("/login"); }}>{t("common.login")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("channel.saveToPlaylistTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !playlists?.length ? (
            <div className="text-center py-6">
              <ListVideo className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("channel.noPlaylistsYet")}</p>
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => addVideoMutation.mutate({ playlistId: playlist.id, videoId })}
                disabled={addVideoMutation.isPending}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <ListVideo className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm truncate">{playlist.name}</span>
                <span className="text-xs text-muted-foreground">{playlist.videoCount}</span>
                {addVideoMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border pt-3">
          {creatingNew ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                createMutation.mutate({ name: newName.trim(), isPublic: true });
              }}
              className="flex gap-2"
            >
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("playlists.namePlaceholder")}
                maxLength={255}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setCreatingNew(false); setNewName(""); }}>
                ✕
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              {t("channel.createPlaylistFirst")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
