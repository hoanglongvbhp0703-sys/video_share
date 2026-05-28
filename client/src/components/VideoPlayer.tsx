import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
}

export default function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if src is empty or invalid
  const isValidSrc = src && src.trim() !== "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isValidSrc) return;

    setIsLoading(true);
    setError(null);

    const handleCanPlay = () => {
      setIsLoading(false);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setError("Không thể phát video. Vui lòng kiểm tra lại file video.");
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    if (video) {
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("error", handleError);
      video.addEventListener("loadstart", handleLoadStart);
    }

    return () => {
      if (video) {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("error", handleError);
        video.removeEventListener("loadstart", handleLoadStart);
      }
    };
  }, [src, isValidSrc]);

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">
      {!isValidSrc ? (
        <div className="flex flex-col items-center justify-center gap-3 text-white">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-center">Không có video để phát</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 text-white">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-center">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : null}
      {isValidSrc && (
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          title={title}
          controls
          className="w-full h-full"
          controlsList="nodownload"
        />
      )}
    </div>
  );
}
