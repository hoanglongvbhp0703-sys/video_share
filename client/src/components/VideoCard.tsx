import { Video } from "@shared/types";
import { Eye, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useLocation } from "wouter";

interface VideoCardProps {
  video: Video & { channelName?: string | null };
}

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoCard({ video }: VideoCardProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    navigate(`/watch/${video.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer flex flex-col gap-2"
    >
      {/* Thumbnail */}
      <div className="relative w-full bg-muted rounded-lg overflow-hidden aspect-video group-hover:rounded-none transition-all">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <div className="text-primary/50">No thumbnail</div>
          </div>
        )}

        {/* Duration Badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex gap-3 px-0">
        {/* Channel Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">
            {video.channelName?.charAt(0).toUpperCase() || "V"}
          </span>
        </div>

        {/* Title and Metadata */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{video.channelName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{formatViewCount(video.viewCount)} lượt xem</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(video.createdAt), { locale: vi, addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
