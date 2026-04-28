import type { DeviceTiers } from "../../types/DeviceTypes";

let cachedTier: number | null = null;
let pending: Promise<number> | null = null;

export function getDevicePerformance(): Promise<number> {
  if (cachedTier) return Promise.resolve(cachedTier);

  if (!pending) {
    pending = new Promise((resolve) => {
      const result = measureDevicePerformance();
      cachedTier = result;
      resolve(result);
    });
  }

  return pending;
}

function measureDevicePerformance(): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const size = 1024;
  canvas.width = size;
  canvas.height = size;

  const points = new Array(2000)
    .fill(0)
    .map(() => [Math.random() * size, Math.random() * size]);

  const runTest = () => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
  };

  // Warm-up (JIT + GPU)
  for (let i = 0; i < 2; i++) runTest();

  // Measure
  const runs = 7;
  const results = [];

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    runTest();
    results.push(performance.now() - start);
  }

  results.sort((a, b) => a - b);

  // remove extremes
  results.shift(); // lowest
  results.pop(); // highest

  // average of 5 runs after removing the extremes
  const avg = results.reduce((sum, v) => sum + v, 0) / results.length;

  // update EMA
  const score = updateEMA(avg);

  console.warn("Stable Score:", score);

  return score;
}

function updateEMA(newValue: number): number {
  const alpha = 0.2;

  const stored = localStorage.getItem("perf-ema");
  const oldAvg = stored ? parseFloat(stored) : newValue;

  const newAvg = oldAvg * (1 - alpha) + newValue * alpha;

  localStorage.setItem("perf-ema", newAvg.toString());

  return newAvg;
}

export function getDeviceTier(avgScore: number): DeviceTiers {
  if (avgScore < 1.3) return "high";
  if (avgScore < 2.2) return "mid";
  return "low";
}