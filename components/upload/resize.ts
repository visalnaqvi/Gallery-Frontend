import EXIF from "exif-js";

export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) return reject("File read error");
      img.src = e.target.result as string;

      img.onload = () => {
        // Default orientation
        let orientation = 1;

        // EXIF.getData mutates `this`, so we must cast it
        EXIF.getData(img as any, function (this: any) {
          orientation = EXIF.getTag(this, "Orientation") || 1;
        });

        const { width, height } = getAspectRatioSize(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        const needsSwap = orientation === 6 || orientation === 8;
        const canvas = document.createElement("canvas");
        canvas.width = needsSwap ? height : width;
        canvas.height = needsSwap ? width : height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context not available");

        // Apply EXIF orientation transforms
        applyOrientation(ctx, canvas.width, canvas.height, orientation);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject("Failed to create thumbnail blob"),
          "image/jpeg",
          0.9
        );
      };

      img.onerror = reject;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Preserve aspect ratio
function getAspectRatioSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
) {
  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

// Apply EXIF orientation
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  orientation: number
) {
  switch (orientation) {
    case 2: // Horizontal flip
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // 180°
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4: // Vertical flip
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5: // Vertical flip + 90° right
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6: // 90° right
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      break;
    case 7: // Horizontal flip + 90° right
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      break;
    case 8: // 90° left
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }
}
