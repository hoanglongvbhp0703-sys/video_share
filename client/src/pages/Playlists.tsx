import { Link } from "wouter";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ListVideo, Plus, Lock, Globe, Trash2, User } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/lib/useDateLocale";

export default function Playlists() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const { data: playlists, isLoading } = trpc.playlists.getMyPlaylists.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);

  const createPlaylist = trpc.playlists.create.useMutation({
    onSuccess: () => {
      toast.success(t("playlists.createdSuccess"));
      utils.playlists.getMyPlaylists.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewIsPublic(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePlaylist = trpc.playlists.delete.useMutation({
    onSuccess: () => {
      toast.success(t("playlists.deletedSuccess"));
      utils.playlists.getMyPlaylists.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center py-16">
          <ListVideo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("playlists.notLoggedIn")}</h2>
          <p className="text-gray-500 mb-6">{t("playlists.notLoggedInDesc")}</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t("playlists.login")}
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-gray-700" />
            <h1 className="text-xl font-bold text-gray-900">{t("playlists.title")}</h1>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                {t("playlists.createNew")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("playlists.createTitle")}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newName.trim()) return;
                  createPlaylist.mutate({ name: newName.trim(), description: newDescription || undefined, isPublic: newIsPublic });
                }}
                className="space-y-4 mt-2"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("playlists.nameLabel")}</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("playlists.namePlaceholder")}
                    maxLength={255}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("playlists.descLabel")}</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder={t("playlists.descPlaceholder")}
                    maxLength={1000}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewIsPublic(!newIsPublic)}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    {newIsPublic
                      ? <><Globe className="w-4 h-4 text-green-500" /> {t("playlists.public")}</>
                      : <><Lock className="w-4 h-4 text-gray-400" /> {t("playlists.private")}</>
                    }
                  </button>
                </div>
                <Button type="submit" disabled={createPlaylist.isPending || !newName.trim()} className="w-full">
                  {createPlaylist.isPending ? t("playlists.creating") : t("playlists.create")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : !playlists || playlists.length === 0 ? (
          <div className="text-center py-16">
            <ListVideo className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">{t("playlists.noPlaylists")}</p>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("playlists.createFirst")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                <Link href={`/playlist/${playlist.id}`} className="block">
                  <div className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                    {playlist.thumbnailUrl
                      ? <img src={playlist.thumbnailUrl} alt={playlist.name} className="w-full h-full object-cover" />
                      : <ListVideo className="w-12 h-12 text-primary/30" />
                    }
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {playlist.videoCount} {t("playlists.videos")}
                    </div>
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/playlist/${playlist.id}`} className="block group-hover:text-primary transition-colors">
                    <h3 className="font-semibold text-gray-900 truncate">{playlist.name}</h3>
                  </Link>
                  {playlist.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{playlist.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      {playlist.isPublic
                        ? <><Globe className="w-3 h-3" /> {t("playlists.public")}</>
                        : <><Lock className="w-3 h-3" /> {t("playlists.private")}</>
                      }
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(playlist.createdAt), "dd/MM/yyyy", { locale: dateLocale })}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(t("playlists.confirmDelete", { name: playlist.name }))) {
                          deletePlaylist.mutate({ id: playlist.id });
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
