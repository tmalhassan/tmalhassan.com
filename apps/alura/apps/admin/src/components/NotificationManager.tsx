import { createContext, useContext, useEffect, useRef, useState } from "react"
import ImageUrl from "../tools/ImageUrl";

type NotificationType = 'success' | 'warning' | 'error' | 'default';

interface Notification {
    id: number;
    type: NotificationType;
    message: string;
    duration: number;
}

type NotifyFn = (notification: {
    type: NotificationType;
    message: string;
    duration: number;
}) => void;

const NotificationContext = createContext<{ Notify: NotifyFn } | undefined >(undefined);

export default function NotificationManagerProvider({ children }: { children: React.ReactNode }) {
    const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
    // const notifTypes: NotificationType[] = ['success', 'warning', 'error', 'default'];

    function Notify({ type, message, duration }: { type: NotificationType; message: string; duration: number }) {
        const id = Date.now() + Math.random();
        const newNotification: Notification = { id, type, message, duration };
        setNotificationsList(prev => [...prev, newNotification]);
    }

    return (
        <NotificationContext.Provider value={{ Notify }}>
            {children}
            <div className="notification-manager-overlay">
                {/* <button onClick={() => Notify({ type: notifTypes[Math.floor(Math.random() * 4)], message: 'lolololol', duration: 3000 })}>add notif</button> */}
                {notificationsList.map((n) => (
                    <NotificationToast key={n.id} setNotificationsList={setNotificationsList} {...n} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
}


function NotificationToast({ id, type, message, duration, setNotificationsList } : Notification & { setNotificationsList: React.Dispatch<React.SetStateAction<Notification[]>> }) {
    // const [animateOpen, setAnimateOpen] = useState(false);
    const [animateClose, setAnimateClose] = useState(false);
    const notifContainerRef = useRef<HTMLDivElement | null>(null);
    const typesIcons: Partial<Record<NotificationType, string>> = {
        'error': 'x-circle-icon',
        'success': 'checkmark-circle-icon',
        'warning': 'exclamation-triangle-icon'
    };

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

    return(
        <div className="notification-toast" ref={notifContainerRef} data-anim={animateClose} data-type={type}>
            {type !== 'default' && <img src={ImageUrl(`ui-images/${typesIcons[type]}.svg`)} alt='' />}
            <p>{message}</p>
        </div>
    )
}

export const useNotificationManager = () => {
  const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotificationManager must be used within a NotificationManagerProvider");
    return context;
};