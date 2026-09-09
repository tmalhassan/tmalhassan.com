import { useEffect, useRef, useState, type ReactNode } from "react";
import { DeviceContext } from "./DeviceContext";
import type { DeviceTypes } from "../../types/DeviceTypes";

interface Props {
  children: ReactNode;
}

function getDeviceType(width: number): DeviceTypes {
  if (width < 601) return "mobile";
  if (width < 1025) return "tablet";
  return "laptop";
}

export default function DeviceProvider({ children }: Props) {
  const setScreenDimensions = () => {
    screenDimensionsRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  const [device, setDevice] = useState(() => getDeviceType(window.innerWidth));
  const screenDimensionsRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

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

    onResize();
    setScreenDimensions();

    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
    };
  }, []);

  function getScreenDimensions() {
    return screenDimensionsRef.current;
  }

  return (
    <DeviceContext.Provider value={{ device, getScreenDimensions }}>
      {children}
    </DeviceContext.Provider>
  );
}
