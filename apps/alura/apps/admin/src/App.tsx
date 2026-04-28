// import './MobileApp.css';
import { useState, useRef, useEffect } from 'react';
import { usePage } from './contexts/PageContext';
// import { useTheme } from './contexts/ThemeContext';
import { SettingsDialog } from './components/SettingsDialog';
import { AppContainer, MobileRouterPage, SecondLayerAppPage, ThirdLayerAppPage, FourthLayerAppPage, TopLayerAppPage, NotificationsPageContainer } from './components/PageManager';
import NavMenu from './components/NavMenu';
// import { Route, Routes, Link, Outlet } from 'react-router-dom';

// export const LOCAL_HOST_IP = import.meta.env.VITE_API_BASE_URL; // '192.168.1.' + 29 + ':' + 3000;
// export const LOCAL_HOST_IP = 'localhost:' + 3000;

export default function App() {
  const { currentDevice, currentPage, secondLayerPageIsActive, thirdLayerPageIsActive, fourthLayerPageIsActive, topLayerIsActive } = usePage();
  // const { theme } = useTheme();
  const [mRouterPageIsActive, setMRouterPageIsActive] = useState((currentPage === 7) ? true : false);
  const [mRouterPageIsFocused, setMRouterPageIsFocused] = useState((currentPage === 7) ? true : false);
  // const [slCloseAnimationFinished, setSlCloseAnimationFinished] = useState(false);
  const [navExtended, setNavExtended] = useState(true);
  const [notifContainerActive, setNotifContainerActive] = useState(false);
  const [settingsDialogActive, setSettingsDialogActive] = useState(false);
  const notifPageRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  
  const mobileRouterPages = [1, 2, 3, 4, 5, 6];
  
  // useEffect(() => {
  //   document.body.setAttribute('theme', theme);
  // }, [theme]);

  useEffect(() => {
    if (secondLayerPageIsActive.isActive || thirdLayerPageIsActive.isActive) {
      document.documentElement.setAttribute('preventscroll', 'true');
      document.body.setAttribute('preventscroll', 'true');
    }
    else {
      document.documentElement.removeAttribute('preventscroll');
      document.body.removeAttribute('preventscroll');
    }
  }, [secondLayerPageIsActive.isActive, thirdLayerPageIsActive.isActive]);

  useEffect(() => {
    if (currentDevice === 'mobile') {
      if (currentPage === 7) {
        setMRouterPageIsActive(true);
        setMRouterPageIsFocused(true);
      } else if (mobileRouterPages.some(page => currentPage === page)) {
        setMRouterPageIsActive(true);
      } else {
        setMRouterPageIsActive(false);
        setMRouterPageIsFocused(false);
      }
    } else {
      setMRouterPageIsActive(false);
      setMRouterPageIsFocused(false);
    }
  }, [currentPage, currentDevice]);
    
  useEffect(() => {
      window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <div className="App">
      <AppContainer setNavExtended={setNavExtended} setMRouterPageIsFocused={setMRouterPageIsFocused} setNotifContainerActive={setNotifContainerActive}/>
      <NavMenu navExtended={navExtended} setNavExtended={setNavExtended} setMRouterPageIsFocused={setMRouterPageIsFocused} setSettingsDialogActive={setSettingsDialogActive} setNotifContainerActive={setNotifContainerActive}></NavMenu> {/* navButtons={navButtons[currentDevice === 'mobile' ? 'mobile' : 'desktop']} */}
      {(mRouterPageIsActive) && <MobileRouterPage mRouterPageIsFocused={mRouterPageIsFocused} setMRouterPageIsFocused={setMRouterPageIsFocused} />}
      {secondLayerPageIsActive.isActive && <SecondLayerAppPage>{secondLayerPageIsActive.content}</SecondLayerAppPage>}
      {thirdLayerPageIsActive.isActive && <ThirdLayerAppPage>{thirdLayerPageIsActive.content}</ThirdLayerAppPage>}
      {fourthLayerPageIsActive.isActive && <FourthLayerAppPage>{fourthLayerPageIsActive.content}</FourthLayerAppPage>}
      {notifContainerActive && <NotificationsPageContainer ref={notifPageRef} setNotifContainerActive={setNotifContainerActive}/>}
      {settingsDialogActive && <SettingsDialog ref={dialogRef} setSettingsDialogActive={setSettingsDialogActive}/>}
      {topLayerIsActive.isActive && <TopLayerAppPage />}
    </div>
  );
}