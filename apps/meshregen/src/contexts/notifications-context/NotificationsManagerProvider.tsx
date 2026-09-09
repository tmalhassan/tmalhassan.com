import { useEffect, useRef, useState } from "react"
import { type Notification, NotificationContext } from "./NotifContext";

export default function NotificationManagerProvider({ children }: { children: React.ReactNode }) {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  // const notifTypes: NotificationType[] = ['success', 'warning', 'error', 'default'];

  function Notify({ message, duration }: { message: string; duration: number }) {
    const id = Date.now() + Math.random();
    const newNotification: Notification = { id, message, duration };
    setNotificationsList(prev => [...prev, newNotification]);
  }

  return (
    <NotificationContext.Provider value={{ Notify }}>
      {children}
      <div className="notification-manager-overlay">
        {notificationsList.map((n) => (
          <NotificationToast key={n.id} setNotificationsList={setNotificationsList} {...n} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}


function NotificationToast({ id, message, duration, setNotificationsList }: Notification & { setNotificationsList: React.Dispatch<React.SetStateAction<Notification[]>> }) {
  const [animateClose, setAnimateClose] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const delay = setTimeout(() => {
      setAnimateClose(true);
    }, duration + 250);

    return () => { clearTimeout(delay); }
  }, []);

  useEffect(() => {
    if (animateClose === false) return;

    const delay = setTimeout(() => {
      setNotificationsList(prev => prev.filter(n => n.id !== id));
    }, 350);

    return () => { clearTimeout(delay); }
  }, [animateClose]);

  return (
    <div className="notification-toast" ref={notifContainerRef} data-anim={animateClose}>
      <p>{message}</p>
    </div>
  )
}

