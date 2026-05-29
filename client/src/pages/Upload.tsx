import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload as UploadIcon, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { SESSION_TOKEN_KEY } from "@shared/const";

async function uploadFileDirect(
  fileKey: string,
  file: File | Blob,
  mimeType: string
): Promise<{ url: string; key: string }> {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  const params = new URLSearchParams({ key: fileKey, mimeType });
  const resp = await fetch(`/api/upload-file?${params}`, {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": mimeType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${resp.status})`);
  }
  return resp.json();
}

function extractFirstFrame(file: File): Promise<{ thumbFile: File; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    let duration = 0;

    video.addEventListener("loadedmetadata", () => {
      duration = Math.round(video.duration) || 0;
      video.currentTime = Math.min(1, video.duration / 2);
    }, { once: true });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve({ thumbFile: new File([blob], "thumbnail.jpg", { type: "image/jpeg" }), duration });
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.85
      );
    }, { once: true });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Video load error"));
    }, { once: true });
  });
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.addEventListener("loadedmetadata", () => {
      resolve(Math.round(video.duration) || 0);
      URL.revokeObjectURL(url);
    }, { once: true });
    video.addEventListener("error", () => {
      resolve(0);
      URL.revokeObjectURL(url);
    }, { once: true });
  });
}

export default function Upload() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0); // MB/s
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [videoDragActive, setVideoDragActive] = useState(false);
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isAutoThumbnail, setIsAutoThumbnail] = useState(false);

  const uploadPresignedUrlMutation = trpc.videos.uploadPresignedUrl.useMutation();
  const createWithUrlsMutation = trpc.videos.createWithUrls.useMutation();

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Vui lòng đăng nhập để upload video</p>
            <Button onClick={() => navigate("/")}>Quay lại trang chủ</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const validateVideoFile = (file: File): boolean => {
    if (file.size > 500 * 1024 * 1024) {
      toast.error("File video không được vượt quá 500MB");
      return false;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Vui lòng chọn file video hợp lệ");
      return false;
    }
    return true;
  };

  const validateThumbnailFile = (file: File): boolean => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File thumbnail không được vượt quá 5MB");
      return false;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh hợp lệ");
      return false;
    }
    return true;
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateVideoFile(file)) {
      setVideoFile(file);
      if (!thumbnailFile) {
        extractFirstFrame(file)
          .then(({ thumbFile, duration }) => {
            setVideoDuration(duration);
            setThumbnailFile(thumbFile);
            setThumbnailPreview(URL.createObjectURL(thumbFile));
            setIsAutoThumbnail(true);
          })
          .catch(() => {
            getVideoDuration(file).then(setVideoDuration);
          });
      } else {
        getVideoDuration(file).then(setVideoDuration);
      }
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateThumbnailFile(file)) {
      setThumbnailFile(file);
      setIsAutoThumbnail(false);
      const reader = new FileReader();
      reader.onload = (event) => {
        setThumbnailPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Video drag and drop handlers
  const handleVideoDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setVideoDragActive(true);
    } else if (e.type === "dragleave") {
      setVideoDragActive(false);
    }
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateVideoFile(file)) {
        setVideoFile(file);
        if (!thumbnailFile) {
          extractFirstFrame(file)
            .then(({ thumbFile, duration }) => {
              setVideoDuration(duration);
              setThumbnailFile(thumbFile);
              setThumbnailPreview(URL.createObjectURL(thumbFile));
              setIsAutoThumbnail(true);
            })
            .catch(() => {
              getVideoDuration(file).then(setVideoDuration);
            });
        } else {
          getVideoDuration(file).then(setVideoDuration);
        }
      }
    }
  };

  // Thumbnail drag and drop handlers
  const handleThumbnailDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setThumbnailDragActive(true);
    } else if (e.type === "dragleave") {
      setThumbnailDragActive(false);
    }
  };

  const handleThumbnailDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setThumbnailDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateThumbnailFile(file)) {
        setThumbnailFile(file);
        setIsAutoThumbnail(false);
        const reader = new FileReader();
        reader.onload = (event) => {
          setThumbnailPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Calculate remaining time
  const calculateETA = (): string => {
    if (uploadSpeed === 0 || uploadProgress === 0) return "--:--";
    const remainingBytes = totalBytes - uploadedBytes;
    const remainingSeconds = remainingBytes / (uploadSpeed * 1024 * 1024);

    if (remainingSeconds < 0) return "--:--";

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format bytes to MB
  const formatBytes = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề video");
      return;
    }

    if (!videoFile) {
      toast.error("Vui lòng chọn file video");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadSpeed(0);
    setUploadStartTime(Date.now());

    // Calculate total bytes
    const videoSize = videoFile.size;
    const thumbnailSize = thumbnailFile?.size || 0;
    const totalSize = videoSize + thumbnailSize;
    setTotalBytes(totalSize);

    try {
      // Step 1: Get presigned URLs for video and thumbnail
      const presignedUrls = await uploadPresignedUrlMutation.mutateAsync({
        videoFileName: videoFile.name,
        videoMimeType: videoFile.type,
        thumbnailFileName: thumbnailFile?.name,
        thumbnailMimeType: thumbnailFile?.type,
      });

      setUploadProgress(10);

      // Step 2: Upload video file directly (supports files up to 500 MB)
      const videoStartTime = Date.now();

      const videoUploadResult = await uploadFileDirect(
        presignedUrls.videoKey,
        videoFile,
        videoFile.type,
      );

      // Calculate video upload speed
      const videoUploadTime = (Date.now() - videoStartTime) / 1000; // seconds
      const videoSpeedMBps = videoSize / (1024 * 1024) / videoUploadTime;

      setUploadedBytes(videoSize);
      setUploadSpeed(videoSpeedMBps);
      setUploadProgress(60);

      // Step 3: Upload thumbnail if provided
      let thumbnailUrl: string | undefined;
      if (thumbnailFile && presignedUrls.thumbnailKey) {
        const thumbnailStartTime = Date.now();

        const thumbnailUploadResult = await uploadFileDirect(
          presignedUrls.thumbnailKey,
          thumbnailFile,
          thumbnailFile.type,
        );

        // Calculate thumbnail upload speed
        const thumbnailUploadTime = (Date.now() - thumbnailStartTime) / 1000;
        const thumbnailSpeedMBps = thumbnailSize / (1024 * 1024) / thumbnailUploadTime;

        // Average speed
        const avgSpeed = (videoSpeedMBps + thumbnailSpeedMBps) / 2;
        setUploadSpeed(avgSpeed);
        setUploadedBytes(videoSize + thumbnailSize);

        thumbnailUrl = thumbnailUploadResult.url;
      }

      setUploadProgress(80);

      // Step 4: Create video record with URLs
      await createWithUrlsMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUploadResult.url,
        thumbnailUrl: thumbnailUrl,
        duration: videoDuration,
        category: category || undefined,
      });

      setUploadProgress(100);
      toast.success("Video đã được upload thành công!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi upload video. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedBytes(0);
      setUploadSpeed(0);
      setUploadStartTime(null);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload video</h1>
        <p className="text-gray-600 mb-6">Chia sẻ video của bạn với cộng đồng</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video File Upload with Drag and Drop */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              File video *
            </label>
            <div
              onDragEnter={handleVideoDrag}
              onDragLeave={handleVideoDrag}
              onDragOver={handleVideoDrag}
              onDrop={handleVideoDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer group ${
                videoDragActive
                  ? "border-primary bg-primary/5 scale-105"
                  : "border-gray-300 hover:border-primary"
              }`}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
                id="video-input"
                disabled={isUploading}
              />
              <label htmlFor="video-input" className="cursor-pointer block">
                <UploadIcon
                  className={`w-12 h-12 mx-auto mb-2 transition-colors ${
                    videoDragActive
                      ? "text-primary"
                      : "text-gray-400 group-hover:text-primary"
                  }`}
                />
                <p className="text-gray-600 font-medium">
                  {videoFile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-green-600">✓</span>
                      {videoFile.name}
                    </span>
                  ) : (
                    "Kéo thả file video hoặc nhấp để chọn"
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">Tối đa 500MB</p>
              </label>
            </div>
            {videoFile && (
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Xóa file video
              </button>
            )}
          </Card>

          {/* Thumbnail Upload with Drag and Drop */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              Ảnh thu nhỏ (tùy chọn)
            </label>
            <div
              onDragEnter={handleThumbnailDrag}
              onDragLeave={handleThumbnailDrag}
              onDragOver={handleThumbnailDrag}
              onDrop={handleThumbnailDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer group ${
                thumbnailDragActive
                  ? "border-primary bg-primary/5 scale-105"
                  : "border-gray-300 hover:border-primary"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
                id="thumbnail-input"
                disabled={isUploading}
              />
              <label htmlFor="thumbnail-input" className="cursor-pointer block">
                <UploadIcon
                  className={`w-12 h-12 mx-auto mb-2 transition-colors ${
                    thumbnailDragActive
                      ? "text-primary"
                      : "text-gray-400 group-hover:text-primary"
                  }`}
                />
                <p className="text-gray-600 font-medium">
                  {thumbnailFile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-green-600">✓</span>
                      {thumbnailFile.name}
                    </span>
                  ) : (
                    "Kéo thả ảnh hoặc nhấp để chọn"
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">Tối đa 5MB</p>
              </label>
            </div>
            {thumbnailFile && (
              <div className="mt-4 space-y-3">
                {thumbnailPreview && (
                  <div className="relative w-full max-w-xs mx-auto">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-auto rounded-lg border border-gray-200"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {isAutoThumbnail
                        ? "Ảnh tự động từ giây đầu video (có thể thay thế)"
                        : "Preview ảnh thumbnail"}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                    setIsAutoThumbnail(false);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Xóa ảnh thumbnail
                </button>
              </div>
            )}
          </Card>

          {/* Title */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              Tiêu đề *
            </label>
            <Input
              type="text"
              placeholder="Nhập tiêu đề video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              maxLength={255}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/255</p>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              Mô tả (tùy chọn)
            </label>
            <Textarea
              placeholder="Nhập mô tả video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={5}
              maxLength={5000}
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/5000</p>
          </Card>

          {/* Category */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              Danh mục (tùy chọn)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
            >
              <option value="">-- Chọn danh mục --</option>
              <option value="music">Âm nhạc</option>
              <option value="gaming">Gaming</option>
              <option value="movies">Phim</option>
              <option value="live">Trực tiếp</option>
              <option value="sports">Thể thao</option>
              <option value="news">Tin tức</option>
            </select>
          </Card>

          {/* Upload Progress - Advanced */}
          {isUploading && (
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
              <div className="space-y-4">
                {/* Progress Percentage and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Đang upload... {uploadProgress}%
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)} MB
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {uploadSpeed.toFixed(2)} MB/s
                    </p>
                    <p className="text-xs text-gray-600">Thời gian còn lại: {calculateETA()}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-green-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white rounded-lg p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">Tiến độ</p>
                      <p className="text-sm font-bold text-primary">{uploadProgress}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">Tốc độ</p>
                      <p className="text-sm font-bold text-green-600">
                        {uploadSpeed.toFixed(1)} MB/s
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">Còn lại</p>
                      <p className="text-sm font-bold text-blue-600">{calculateETA()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isUploading || !videoFile || !title.trim()}
              className="flex-1"
            >
              {isUploading ? "Đang upload..." : "Upload video"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              disabled={isUploading}
            >
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
