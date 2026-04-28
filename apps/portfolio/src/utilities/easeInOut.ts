export default function easeInOut(t: number, power: number = 2) {
  return t < 0.5 
    ? Math.pow(t * 2, power) / 2 
    : 1 - Math.pow(2 - t * 2, power) / 2;
};