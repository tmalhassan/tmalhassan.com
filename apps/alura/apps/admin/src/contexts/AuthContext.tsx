import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { API_ROUTES } from "shared/constants/apiRouts";
import useDataSend from '../hooks/useDataSend';
import useDataFetch from "../hooks/useDataFetch";
import type { ServerApiResponse } from "shared/types/ServerResponseTypes";
import { useNotificationManager } from "../components/NotificationManager";

interface UserSession {
    id: number | null;
    email: string | null;
    username: string;
    displayName: string,
    phoneNumber: string | null,
    adminLevel: number;
    pfpCounter: number;
}

interface AuthContextType {
    userData: UserSession | null;
    setUserData: Dispatch<SetStateAction<UserSession | null>>;
    loading: boolean;
    error: Error | null;
    handleLogin: (username: string, password: string) => void;
    handleAutoLogin: () => void;
    handleLogout: () => void;
    setNewProfilePic: (image: Blob) => void;
    autoLoginLoading: boolean;
    userPfp: string | null;
    isLoggingOut: boolean;
    setIsLoggingOut: Dispatch<SetStateAction<boolean>>;
    logoutLoading: boolean;
    sessionKey: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
    const { Notify } = useNotificationManager();
    const { data, loading, error, sendData } = useDataSend<UserSession>();
    const { data: autoData, loading: autoLoginLoading, sendData: sendAutoData } = useDataFetch(true, API_ROUTES.AUTH.GET_USER);
    const { data: pfpInfo, sendData: fetchPfp } = useDataFetch<{ img: string, pfp_counter: number }>(false, API_ROUTES.AUTH.GET_PFP);
    const { loading: logoutLoading, sendData: sendLogoutData } = useDataSend();
    const { sendData: sendSetPfpData } = useDataSend<ServerApiResponse>();
    const [userData, setUserData] = useState<UserSession | null>(null);
    const [userPfp, setUserPfp] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [sessionKey, setSessionKey] = useState<string | null>(`${Date.now() + Math.random()}${userData?.id}`);

    const sendPfpData = useCallback(async () => {
        fetchPfp();
    }, [userData]);

    useEffect(() => {
        // console.log(userData);
        const localPfpCounter = localStorage.getItem('pfp_counter');
        const intLocalPfpCounter = localPfpCounter ? parseInt(localPfpCounter) : undefined;

        if (localStorage.getItem('user_pfp') && userData?.id && intLocalPfpCounter && (userData?.pfpCounter === intLocalPfpCounter)) {
            setUserPfp(`${localStorage.getItem('user_pfp')}`);
            return;
        }
        else if (!userData?.id) {
            setUserPfp(null);
            return;
        }

        // console.log('fetching image!!!');
        sendPfpData();
    }, [userData]);

    useEffect(() => {
        // console.log(pfpInfo);
        if (!pfpInfo?.img || pfpInfo?.pfp_counter === undefined) return;

        // Set local storage...
        localStorage.setItem('user_pfp', pfpInfo.img);
        localStorage.setItem('pfp_counter', `${pfpInfo.pfp_counter}`);

        setUserPfp(`${pfpInfo.img}`);
    }, [pfpInfo]);

    useEffect(() => {
        setUserData(autoData as UserSession);
    }, [autoData]);

    useEffect(() => {
        setUserData(data);
    }, [data]);

    function handleLogin(username: string, password: string) {
        sendData('POST', API_ROUTES.AUTH.LOGIN, { username, password });
    }

    function handleAutoLogin() {
        sendAutoData('');
    }

    function handleLogout() {
        setUserData(null);
        setSessionKey(`${Date.now() + Math.random()}${userData?.id}`);
        sendLogoutData('POST', API_ROUTES.AUTH.LOGOUT, {});
    }

    async function setNewProfilePic(image: Blob) {
        let pfpCounter: number | undefined;

        if (userData?.id) {
            const formData = new FormData();

            formData.append('user_pfp', image);
            const res = await sendSetPfpData('POST', API_ROUTES.AUTH.SET_PFP, formData);
            pfpCounter = res?.data.data!.pfpCounter;
            
            if (res?.data) Notify({ type: res.data.type, message: res.data.message, duration: 3000 });
        }

        blobToBase64(image).then(base64 => {
            // Set local storage...
            localStorage.setItem('user_pfp', base64);
            localStorage.setItem('pfp_counter', `${(pfpCounter ?? 0) + 1}`);

            setUserPfp(`${base64}`);
            // console.log('updated image locally!');
        });
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob); // Reads blob as Base64
        });
    }

    return(
        <AuthContext.Provider value={{
            userData,
            setUserData,
            loading,
            error,
            handleLogin,
            handleAutoLogin,
            handleLogout,
            setNewProfilePic,
            autoLoginLoading,
            userPfp,
            isLoggingOut,
            setIsLoggingOut,
            logoutLoading,
            sessionKey
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthContext.Provider");
    return context;
};