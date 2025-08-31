import pica from "pica";

export async function resizeImage(file: File): Promise<Blob> {
  // Load image
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  // Always set width = 100, adjust height to preserve aspect ratio
  const targetWidth = 100;
  const aspectRatio = img.height / img.width;
  const targetHeight = Math.round(targetWidth * aspectRatio);

  // Prepare canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Use pica for better resize quality
  await pica().resize(img, canvas);

  // Return as Blob (can also return base64 if needed)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject("Resize failed")),
      "image/jpeg",
      0.9
    );
  });
}
