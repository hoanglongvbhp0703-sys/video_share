import { useState, useCallback, useRef } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImageCropDialogProps {
  open: boolean;
  imageUrl: string;
  type: "avatar" | "banner";
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
      "image/jpeg",
      0.92,
    );
  });
}

export default function ImageCropDialog({ open, imageUrl, type, onConfirm, onCancel }: ImageCropDialogProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isAvatar = type === "avatar";
  const aspect = isAvatar ? 1 : 16 / 4;

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels);
      onConfirm(blob);
    } catch {
      // silently ignore crop error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle>
            {isAvatar ? t("channel.cropAvatarTitle") : t("channel.cropBannerTitle")}
          </DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div
          className="relative w-full bg-black"
          style={{ height: isAvatar ? 360 : 280 }}
        >
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={isAvatar ? "round" : "rect"}
            showGrid={!isAvatar}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
            }}
          />
        </div>

        {/* Controls */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t("channel.cropHint")}
          </p>
        </div>

        <DialogFooter className="px-6 pb-5 flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="mr-auto gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            {t("channel.cropReset")}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            {t("channel.cropCancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? t("channel.cropProcessing") : t("channel.cropConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
