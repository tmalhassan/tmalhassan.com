import { createContext } from "react";

export interface Notification {
  id: number;
  message: string;
  duration: number;
}

type NotifyFn = (notification: {
  message: string;
  duration: number;
}) => void;

export const NotificationContext = createContext<{ Notify: NotifyFn } | undefined>(undefined);