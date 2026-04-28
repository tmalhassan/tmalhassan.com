export default function lerpHue(a: number, b: number, t: number) {
  const d = ((b - a + 540) % 360) - 180; 
  return (a + d * t + 360) % 360;
}