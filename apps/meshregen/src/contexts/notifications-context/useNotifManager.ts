import { useContext } from "react";
import { NotificationContext } from "./NotifContext";

export const useNotificationManager = () => {
  const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotificationManager must be used within a NotificationManagerProvider");
    return context;
};