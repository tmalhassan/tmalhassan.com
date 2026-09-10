export async function rasterizeSVG(
  svgUrl: string,
  width: number,
  height: number
): Promise<ImageData> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create OffscreenCanvas context");
  }

  return new Promise<ImageData>((resolve, reject) => {
    const img = new Image();
    
    img.crossOrigin = "anonymous";

    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load or decode SVG from URL: ${svgUrl}`));
    };
    
    img.src = svgUrl;
  });
}
