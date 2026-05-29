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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
  const [uploadSpeed, setUploadSpeed] = useState(0);
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
            <p className="text-gray-600 mb-4">{t("upload.loginRequired")}</p>
            <Button onClick={() => navigate("/")}>{t("upload.goHome")}</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const validateVideoFile = (file: File): boolean => {
    if (file.size > 500 * 1024 * 1024) {
      toast.error(t("upload.videoTooLarge"));
      return false;
    }
    if (!file.type.startsWith("video/")) {
      toast.error(t("upload.invalidVideoType"));
      return false;
    }
    return true;
  };

  const validateThumbnailFile = (file: File): boolean => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("upload.thumbnailTooLarge"));
      return false;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(t("upload.invalidThumbnailType"));
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

  const calculateETA = (): string => {
    if (uploadSpeed === 0 || uploadProgress === 0) return "--:--";
    const remainingBytes = totalBytes - uploadedBytes;
    const remainingSeconds = remainingBytes / (uploadSpeed * 1024 * 1024);
    if (remainingSeconds < 0) return "--:--";
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatBytes = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t("upload.titleRequired"));
      return;
    }
    if (!videoFile) {
      toast.error(t("upload.videoRequired"));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadSpeed(0);
    setUploadStartTime(Date.now());

    const videoSize = videoFile.size;
    const thumbnailSize = thumbnailFile?.size || 0;
    const totalSize = videoSize + thumbnailSize;
    setTotalBytes(totalSize);

    try {
      const presignedUrls = await uploadPresignedUrlMutation.mutateAsync({
        videoFileName: videoFile.name,
        videoMimeType: videoFile.type,
        thumbnailFileName: thumbnailFile?.name,
        thumbnailMimeType: thumbnailFile?.type,
      });

      setUploadProgress(10);

      const videoStartTime = Date.now();
      const videoUploadResult = await uploadFileDirect(
        presignedUrls.videoKey,
        videoFile,
        videoFile.type,
      );

      const videoUploadTime = (Date.now() - videoStartTime) / 1000;
      const videoSpeedMBps = videoSize / (1024 * 1024) / videoUploadTime;

      setUploadedBytes(videoSize);
      setUploadSpeed(videoSpeedMBps);
      setUploadProgress(60);

      let thumbnailUrl: string | undefined;
      if (thumbnailFile && presignedUrls.thumbnailKey) {
        const thumbnailStartTime = Date.now();
        const thumbnailUploadResult = await uploadFileDirect(
          presignedUrls.thumbnailKey,
          thumbnailFile,
          thumbnailFile.type,
        );
        const thumbnailUploadTime = (Date.now() - thumbnailStartTime) / 1000;
        const thumbnailSpeedMBps = thumbnailSize / (1024 * 1024) / thumbnailUploadTime;
        const avgSpeed = (videoSpeedMBps + thumbnailSpeedMBps) / 2;
        setUploadSpeed(avgSpeed);
        setUploadedBytes(videoSize + thumbnailSize);
        thumbnailUrl = thumbnailUploadResult.url;
      }

      setUploadProgress(80);

      await createWithUrlsMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUploadResult.url,
        thumbnailUrl: thumbnailUrl,
        duration: videoDuration,
        category: category || undefined,
      });

      setUploadProgress(100);
      toast.success(t("upload.successMsg"));
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("upload.errorMsg"));
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("upload.title")}</h1>
        <p className="text-gray-600 mb-6">{t("upload.subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video File */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              {t("upload.videoFile")}
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
                    videoDragActive ? "text-primary" : "text-gray-400 group-hover:text-primary"
                  }`}
                />
                <p className="text-gray-600 font-medium">
                  {videoFile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-green-600">✓</span>
                      {videoFile.name}
                    </span>
                  ) : (
                    t("upload.dropVideo")
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t("upload.maxVideoSize")}</p>
              </label>
            </div>
            {videoFile && (
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                {t("upload.removeVideo")}
              </button>
            )}
          </Card>

          {/* Thumbnail */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              {t("upload.thumbnailFile")}
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
                    thumbnailDragActive ? "text-primary" : "text-gray-400 group-hover:text-primary"
                  }`}
                />
                <p className="text-gray-600 font-medium">
                  {thumbnailFile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="text-green-600">✓</span>
                      {thumbnailFile.name}
                    </span>
                  ) : (
                    t("upload.dropThumbnail")
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">{t("upload.maxThumbnailSize")}</p>
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
                      {isAutoThumbnail ? t("upload.autoThumbnail") : t("upload.thumbnailPreview")}
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
                  {t("upload.removeThumbnail")}
                </button>
              </div>
            )}
          </Card>

          {/* Title */}
          <Card className="p-6">
            <label className="block mb-2 font-medium text-gray-900">
              {t("upload.videoTitle")}
            </label>
            <Input
              type="text"
              placeholder={t("upload.titlePlaceholder")}
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
              {t("upload.description")}
            </label>
            <Textarea
              placeholder={t("upload.descPlaceholder")}
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
              {t("upload.category")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
            >
              <option value="">{t("upload.categoryPlaceholder")}</option>
              <option value="music">{t("upload.categoryMusic")}</option>
              <option value="gaming">{t("upload.categoryGaming")}</option>
              <option value="movies">{t("upload.categoryMovies")}</option>
              <option value="live">{t("upload.categoryLive")}</option>
              <option value="sports">{t("upload.categorySports")}</option>
              <option value="news">{t("upload.categoryNews")}</option>
            </select>
          </Card>

          {/* Upload Progress */}
          {isUploading && (
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t("upload.uploadingStatus", { percent: uploadProgress })}
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
                    <p className="text-xs text-gray-600">{t("upload.remainingTime", { time: calculateETA() })}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-green-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white rounded-lg p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">{t("upload.progressLabel")}</p>
                      <p className="text-sm font-bold text-primary">{uploadProgress}%</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">{t("upload.speedLabel")}</p>
                      <p className="text-sm font-bold text-green-600">
                        {uploadSpeed.toFixed(1)} MB/s
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-200">
                      <p className="text-xs text-gray-600">{t("upload.remainingLabel")}</p>
                      <p className="text-sm font-bold text-blue-600">{calculateETA()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isUploading || !videoFile || !title.trim()}
              className="flex-1"
            >
              {isUploading ? t("upload.uploadingBtn") : t("upload.uploadBtn")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              disabled={isUploading}
            >
              {t("upload.cancel")}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
