import { createContext } from "react";
import type { DeviceTiers, DeviceTypes } from "../../types/DeviceTypes";

interface DeviceContextType {
  device: DeviceTypes;
  tier: DeviceTiers;
  getScreenDimensions: () => { width: number; height: number };
}

export const DeviceContext = createContext<DeviceContextType | undefined>(undefined);