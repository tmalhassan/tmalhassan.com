import { useEffect, useRef, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import LoginForm from "./components/LoginForm";
import AluraLogo from "./components/AluraLogo";
import App from "./App";
import { useTheme } from "./contexts/ThemeContext";
import ImageUrl from "./tools/ImageUrl";
import SimpleLoading from "./components/SimpleLoading";

export default function MainAppRouter() {
    const { theme, toggleTheme } = useTheme();
    const { userData, loading, error, isLoggingOut, setIsLoggingOut, handleLogout, logoutLoading, sessionKey } = useAuth();
    const [bgIsActive, setBgIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginStage, setLoginStage] = useState<'initialcheck' | 'initial' | 'expanding' | 'loading' | 'fadeoutLogo' | 'fading' | 'hidden'>('initialcheck');
    const [logOutStage, setLogOutStage] = useState<'initial' | 'fadingIn' | 'fadingLogoIn' | 'logoutDone' | 'showForm' | 'end'>('initial');
    const loginContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // console.log(loginStage);
        if (loginStage === 'initialcheck') {
            const expandTimeout = setTimeout(() => {
                loginContainerRef.current?.setAttribute('data-enableanim', 'true');
                if (!userData && !loading) setLoginStage('initial');
                else setLoginStage('loading');
            }, 800);
            return () => clearTimeout(expandTimeout);
        }

        if (loginStage === 'expanding') {
            const expandTimeout = setTimeout(() => {
                setLoginStage('loading');
            }, 400);
            return () => clearTimeout(expandTimeout);
        }

        if (loginStage === 'loading') {
            if (userData && !loading) {
                const loadTimeout = setTimeout(() => {
                    setLoginStage('fadeoutLogo');
                }, 1000);
                return () => clearTimeout(loadTimeout);
            } else if (!userData && !loading) {
                const loadTimeout = setTimeout(() => {
                    setIsSubmitting(false);
                    setLoginStage('initial');
                }, 1000);
                return () => clearTimeout(loadTimeout);
            }
        }

        if (loginStage === 'fadeoutLogo') {
            const logoFadeTimeout = setTimeout(() => {
                setLoginStage('fading');
            }, 1000);
            return () => clearTimeout(logoFadeTimeout);
        }

        if (loginStage === 'fading') {
            const fadeTimeout = setTimeout(() => {
                setBgIsActive(false);
                setIsSubmitting(false);
                setLoginStage('hidden');
            }, 600);
            return () => clearTimeout(fadeTimeout);
        }
    }, [loginStage, userData, loading]);

    useEffect(() => {
        if (!isSubmitting) return;
        
        setLoginStage('expanding');
    }, [isSubmitting]);

    useEffect(() => {
        if (!userData) return;

        setIsSubmitting(true);
        setLoginStage('loading');
    }, [userData]);

    useEffect(() => {
        if (!isLoggingOut) return;
        // console.log('logOutStage ', logOutStage, 'loading ', logoutLoading);
        
        if (logOutStage === 'initial') {
            loginContainerRef.current?.setAttribute('data-enableanim', 'true');
            const fadeInTimeout = setTimeout(() => {
                setLogOutStage('fadingIn');
            }, 50);
            return () => clearTimeout(fadeInTimeout);
        }

        if (logOutStage === 'fadingIn') {
            const fadeInLogoTimeout = setTimeout(() => {
                setLogOutStage('fadingLogoIn');
            }, 350);
            return () => clearTimeout(fadeInLogoTimeout);
        }

        if (logOutStage === "fadingLogoIn" && logoutLoading === false) {
            handleLogout();
            setLogOutStage('logoutDone');
        }

        if (logOutStage === "logoutDone" && logoutLoading === false) {
            const showFormTimeout = setTimeout(() => {
                setBgIsActive(true);
                setLogOutStage('showForm');
            }, 600);
            return () => clearTimeout(showFormTimeout);
        }
        
        if (logOutStage === 'showForm') {
            setLogOutStage('end');
        }

        if (logOutStage === 'end') {
            const endLogoutTimeout = setTimeout(() => {
                setLoginStage("initial");
                setLogOutStage('initial')
                setIsLoggingOut(false);
            }, 50);
            return () => clearTimeout(endLogoutTimeout);
        }
    }, [logOutStage, isLoggingOut, logoutLoading]);

    return (
        <>
            {bgIsActive && 
                <div className="gradient-bg" data-show={loginStage === 'initial' || loginStage === 'expanding' || loginStage === 'loading' || (isLoggingOut && (logOutStage !== 'initial' && logOutStage !== 'fadingIn'))}>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            }
            {(loginStage !== 'hidden' || isLoggingOut) && 
                <div className="login-container" ref={loginContainerRef} data-initial={loginStage === 'initial'} data-initialcheck={loginStage === 'initialcheck'} data-expanded={loginStage === 'expanding' || loginStage === 'loading' || loginStage === 'fading' || loginStage === 'fadeoutLogo'} data-faded={loginStage === 'fading'} data-logofade={loginStage === 'fadeoutLogo'} data-enableanim={false}
                    data-lo-initial={logOutStage === 'initial'} data-lo-fadein={logOutStage === 'fadingIn'} data-lo-fadeinlogo={logOutStage === 'fadingLogoIn'} data-lo-logout-done={logOutStage === 'logoutDone'} data-is-logging-out={isLoggingOut} data-lo-expanded={isLoggingOut && (logOutStage !== 'end' && logOutStage !== 'showForm')} 
                >
                    <button className='theme-toggle-button' data-issubmitting={isSubmitting || (isLoggingOut && (logOutStage !== 'showForm' && logOutStage !== 'end')) } onClick={toggleTheme}>
                        <img className='button-icon' alt='theme toggle' src={ImageUrl(theme === 'light' ? 'ui-images/dark-icon.svg' : 'ui-images/light-icon.svg')}></img>
                    </button>
                    <div className="logo-container">
                        <AluraLogo />
                    </div>
                    <div className="form-container" data-issubmitting={isSubmitting || (isLoggingOut && (logOutStage !== 'showForm' && logOutStage !== 'end'))} data-error={error && loginStage === 'initial' && !loading ? true : false}>
                        <LoginForm setIsSubmitting={setIsSubmitting} error={error && loginStage === 'initial' && !loading ? true : false}/>
                    </div>
                    {(isSubmitting || loading) && <SimpleLoading endAnim={loginStage === 'fadeoutLogo' || loginStage === 'fading'} />}
                </div>
            }
            {(userData && (loginStage === 'hidden' || loginStage === 'fading') && (!isLoggingOut || (logOutStage !== 'fadingLogoIn' && logOutStage !== 'logoutDone' && logOutStage !== 'showForm' && logOutStage !== 'end'))) && <App key={sessionKey}/>}
        </>
    )
}