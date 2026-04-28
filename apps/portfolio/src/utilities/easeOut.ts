// const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function easeOut(t: number, power: number = 2) {
  return 1 - Math.pow(1 - t, power)
};