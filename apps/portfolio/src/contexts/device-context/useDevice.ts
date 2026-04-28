import { useContext } from "react";
import { DeviceContext } from "./DeviceContext";

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) throw new Error("useDevice must be used inside DeviceProvider");
  return context;
};