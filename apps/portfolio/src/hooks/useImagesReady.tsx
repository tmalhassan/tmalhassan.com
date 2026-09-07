import { useEffect, useState } from "react";

export default function useImagesReady(srcs: string[]) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (srcs.length === 0) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    preloadImages(srcs).then(() => {
      if (!cancelled) {
        console.log(`${srcs.length} images were loaded successfully!!`);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [srcs]);

  return { imagesReady: ready };
}

async function preloadImages(srcs: string[]): Promise<void> {
  console.log(`loading ${srcs.length} images`);
  await Promise.all(
    srcs.map(
      src => new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = src;
      })
    )
  );
}