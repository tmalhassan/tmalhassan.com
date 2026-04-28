import { useEffect, useRef, useState, type ReactNode } from "react";
import { DeviceContext } from "./DeviceContext";
import type { DeviceTypes } from "../../types/DeviceTypes";
import { getDevicePerformance, getDeviceTier } from "../../components/benchmark/benchmarkDevice";

interface Props {
  children: ReactNode;
}

export default function DeviceProvider({ children }: Props) {
  const [device, setDevice] = useState(getDeviceType(window.innerHeight));
  const [tier, setTier] = useState(() => {
    const s = localStorage.getItem("perf-ema");
    return s ? getDeviceTier(parseFloat(s)) : 'mid'; // default value 'mid' if no score found
  });
  const screenDimensionsRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    setTimeout(() => {
      getDevicePerformance().then(res => setTier(getDeviceTier(res)));
    }, 3500);
  }, []);

  useEffect(() => {
    let resizeRafId: number | null = null;

    const onResize = () => {
      if (resizeRafId) return;

      resizeRafId = requestAnimationFrame(() => {
        setScreenDimensions();

        setDevice((prev) => {
          const currDevice = getDeviceType(window.innerWidth);
          return currDevice !== prev ? currDevice : prev;
        });

        resizeRafId = null;
      });
    };

    setScreenDimensions();

    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
    };
  }, [device]);

  const setScreenDimensions = () => {
    screenDimensionsRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  const getScreenDimensions = () => {
    return screenDimensionsRef.current;
  };

  function getDeviceType(width: number): DeviceTypes {
    if (width < 601) return "mobile";
    if (width < 1025) return "tablet";
    return "laptop";
  }

  return (
    <DeviceContext.Provider value={{ device, tier, getScreenDimensions }}>
      {children}
    </DeviceContext.Provider>
  );
}
