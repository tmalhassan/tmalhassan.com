import { createContext } from "react";
import type { DeviceTypes } from "../../types/DeviceTypes";

interface DeviceContextType {
  device: DeviceTypes;
  getScreenDimensions: () => { width: number; height: number };
}

export const DeviceContext = createContext<DeviceContextType | undefined>(undefined);