import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ListVideo, Globe, Lock, ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

function VideoRow({ video, onRemove }: { video: any; onRemove?: () => void }) {
  return (
    <div className="flex gap-3 items-start p-3 rounded-lg hover:bg-gray-50 group">
      <a href={`/watch/${video.id}`} className="flex-shrink-0">
        <div className="w-36 h-20 rounded-lg overflow-hidden bg-gray-100">
          {video.thumbnailUrl
            ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center">
                <ListVideo className="w-8 h-8 text-gray-300" />
              </div>
          }
        </div>
      </a>
      <div className="flex-1 min-w-0">
        <a href={`/watch/${video.id}`} className="hover:text-primary transition-colors">
          <h3 className="font-medium text-gray-900 line-clamp-2 text-sm">{video.title}</h3>
        </a>
        {video.channelName && (
          <p className="text-xs text-gray-500 mt-1">{video.channelName}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {video.viewCount?.toLocaleString()} lượt xem •{" "}
          {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true, locale: vi })}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const playlistId = parseInt(id ?? "0", 10);
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: playlist, isLoading: playlistLoading } = trpc.playlists.getById.useQuery(
    { id: playlistId },
    { enabled: !!playlistId }
  );

  const { data: playlistVideos, isLoading: videosLoading } = trpc.playlists.getVideos.useQuery(
    { playlistId },
    { enabled: !!playlistId }
  );

  const removeVideo = trpc.playlists.removeVideo.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa video khỏi danh sách");
      utils.playlists.getVideos.invalidate({ playlistId });
      utils.playlists.getById.invalidate({ id: playlistId });
    },
    onError: (err) => toast.error(err.message),
  });

  const isOwner = user?.id === playlist?.userId;
  const isLoading = playlistLoading || videosLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-3 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-36 h-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!playlist) {
    return (
      <Layout>
        <div className="p-6 text-center py-16">
          <ListVideo className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Không tìm thấy danh sách phát.</p>
          <a href="/playlists" className="mt-4 inline-block text-primary text-sm hover:underline">
            ← Quay lại
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 flex items-center justify-center">
            <ListVideo className="w-8 h-8 text-primary/40" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-sm text-gray-500 mt-1">{playlist.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                {playlist.isPublic
                  ? <><Globe className="w-3 h-3" /> Công khai</>
                  : <><Lock className="w-3 h-3" /> Riêng tư</>
                }
              </span>
              <span className="text-xs text-gray-400">{playlist.videoCount} video</span>
            </div>
          </div>
          {isOwner && (
            <a href="/playlists">
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
                Quản lý
              </Button>
            </a>
          )}
        </div>

        {/* Video list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {!playlistVideos || playlistVideos.length === 0 ? (
            <div className="p-8 text-center">
              <ListVideo className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Danh sách phát chưa có video nào.</p>
            </div>
          ) : (
            playlistVideos.map((video) => (
              <VideoRow
                key={video.id}
                video={video}
                onRemove={isOwner
                  ? () => removeVideo.mutate({ playlistId, videoId: video.id })
                  : undefined
                }
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
