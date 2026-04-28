import { createContext, useContext, useState, useEffect, type ReactNode, type SetStateAction, type Dispatch, useRef, type RefObject } from "react";
import * as PM from '../components/PageManager';
import { ProductsPage } from '../components/ProductsPage';
import { useAuth } from "./AuthContext";

type DeviceType = 'mobile' | 'tablet' | 'desktop' | null;

interface PageContextType {
  currentDevice: DeviceType;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  pageElementsActive: boolean;
  setPageElementsActive: Dispatch<SetStateAction<boolean>>;
  currentProductInView: {productID: number, is_deleted: 0 | 1} | null,
  setCurrentProductInView: Dispatch<SetStateAction<{productID: number, is_deleted: 0 | 1} | null>>;
  tlIsClosing: boolean,
  // setTlIsClosing: Dispatch<SetStateAction<boolean>>;

  secondLayerPageIsActive: PageState,
  CloseSecondLayer: () => void;
  slPageRef: RefObject<HTMLDivElement | null>;
  setSecondLayerPageIsActive: (isActive: boolean, content: ReactNode, refreshPage?: number) => void;

  thirdLayerPageIsActive: PageState;
  CloseThirdLayerPage: () => void;
  tlPageRef: RefObject<HTMLDivElement | null>;
  setThirdLayerPageIsActive: (isActive: boolean, content: ReactNode, refreshPage?: number) => void;

  fourthLayerPageIsActive: PageState;
  CloseFourthLayerPage: () => void;
  flPageRef: RefObject<HTMLDivElement | null>;
  setFourthLayerPageIsActive: (isActive: boolean, content: ReactNode, refreshPage?: number) => void;

  topLayerIsActive: TopLayerPageState;
  CloseTopLayerPage: () => void;
  topLayerRef: RefObject<HTMLDialogElement | null>;
  setTopLayerIsActive: (isActive: boolean, type: TopLayerPageType, content: Record<string, string> | null, result: ((res: boolean) => void) | null) => void;

  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  refreshAppContainer: number;
  setRefreshAppContainer: Dispatch<SetStateAction<number>>;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

interface props {
  children: ReactNode;
}

type PageState = {
  isActive: boolean;
  content: ReactNode | null;
  refreshPage: number;
};

type TopLayerPageType = 'dialog' | 'alert' | 'notif' | 'view' | null;

type TopLayerPageState = {
  isActive: boolean;
  type: TopLayerPageType;
  content: Record<string, string> | null;
  result: ((res: boolean) => void) | null;
}

export default function PageProvider({ children }: props) {
  const { sessionKey } = useAuth();
  const [currentDevice, setCurrentDevice] = useState(getDeviceType(window.innerWidth));
  const [currentPage, setCurrentPage] = useState(0);
  const [pageElementsActive, setPageElementsActive] = useState(false);
  const [tlIsClosing, setTlIsClosing] = useState(false);
  const [currentProductInView, setCurrentProductInView] = useState<{productID: number, is_deleted: 0 | 1} | null>(null);
  const [secondLayerPageIsActive, setSecondLayerPageIsActive] = useState<PageState>({ isActive: false, content: null, refreshPage: 0 });
  const [thirdLayerPageIsActive, setThirdLayerPageIsActive] = useState<PageState>({ isActive: false, content: null, refreshPage: 0 });
  const [fourthLayerPageIsActive, setFourthLayerPageIsActive] = useState<PageState>({ isActive: false, content: null, refreshPage: 0 });
  const [topLayerIsActive, setTopLayerIsActive] = useState<TopLayerPageState>({ isActive: false, type: null, content: null, result: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshAppContainer, setRefreshAppContainer] = useState(0);

  const slPageRef = useRef<HTMLDivElement | null>(null);
  const tlPageRef = useRef<HTMLDivElement | null>(null);
  const flPageRef = useRef<HTMLDivElement | null>(null);
  const topLayerRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    let resizeRafId: number | null = null;

    const handleResize = () => {
      if (resizeRafId) return;
  
      resizeRafId = requestAnimationFrame(() => {
        const newDevice = getDeviceType(window.innerWidth);

        setCurrentDevice((prev) => {
          return prev === newDevice ? prev : newDevice;
        });
        
        resizeRafId = null;
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Ensure initial setup is correct
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // useEffect(() => {
  //   console.log(currentDevice);
  // }, [currentDevice]);

  useEffect(() => {
    if (!sessionKey) return;

    resetAppContext();
  }, [sessionKey]);

  useEffect(() => {
    if (topLayerIsActive.isActive && topLayerRef !== null) {
      topLayerRef.current?.showModal();
      topLayerRef.current?.setAttribute('data-isactive', 'true');
    }
  }, [topLayerIsActive.isActive]);

  function getDeviceType(width: number): DeviceType {
    if (width <= 600) return 'mobile';
    if (width >= 601 && width < 1025) return 'tablet';
    return 'desktop';
  }

  // -----------------------------------------------------------------------  Layer pages Functions  -----------------------------------------------------------------------
  
  function CloseSecondLayer() {
    slPageRef.current?.setAttribute('data-isactive', 'false');

    setTimeout(() => {
      setSecondLayerPageIsActive({ isActive: false, content: null, refreshPage: 0 });
    }, 300);
  }

  function CloseThirdLayerPage() {
    setTlIsClosing(true);
    tlPageRef.current?.setAttribute('data-isactive', 'false');

    setTimeout(() => {
      setTlIsClosing(false);
      setThirdLayerPageIsActive({ isActive: false, content: null, refreshPage: 0 });
    }, 300);
  }

  function CloseFourthLayerPage() {
    flPageRef.current?.setAttribute('data-isactive', 'false');

    setTimeout(() => {
      setFourthLayerPageIsActive({ isActive: false, content: null, refreshPage: 0 });
    }, 300);
  }

  function CloseTopLayerPage() {
    topLayerRef.current?.setAttribute('data-isactive', 'false');

    setTimeout(() => {
      topLayerRef.current?.close();
      setTopLayerIsActive({ isActive: false, type: null, content: null, result: null })
    }, 200);
  }

  const resetAppContext = () => {
    setCurrentDevice(getDeviceType(window.innerWidth));
    setCurrentPage(0);
    setPageElementsActive(false);
    setTlIsClosing(false);
    setCurrentProductInView(null);
    setSecondLayerPageIsActive({ isActive: false, content: null, refreshPage: 0 });
    setThirdLayerPageIsActive({ isActive: false, content: null, refreshPage: 0 });
    setFourthLayerPageIsActive({ isActive: false, content: null, refreshPage: 0 });
    setTopLayerIsActive({ isActive: false, type: null, content: null, result: null });
    setIsSubmitting(false);
    setRefreshAppContainer(0);
  };

  return (
    <PageContext value={{
      currentDevice,
      currentPage,
      setCurrentPage,
      pageElementsActive,
      setPageElementsActive,
      currentProductInView,
      setCurrentProductInView,
      tlIsClosing,
      // setTlIsClosing,
      secondLayerPageIsActive,
      CloseSecondLayer,
      slPageRef,
      setSecondLayerPageIsActive: (isActive: boolean, content: ReactNode, refreshPage: number = 0) => setSecondLayerPageIsActive({ isActive, content, refreshPage }),
      thirdLayerPageIsActive,
      CloseThirdLayerPage,
      tlPageRef,
      setThirdLayerPageIsActive: (isActive: boolean, content: ReactNode, refreshPage: number = 0) => setThirdLayerPageIsActive({ isActive, content, refreshPage }),
      fourthLayerPageIsActive,
      CloseFourthLayerPage,
      flPageRef,
      setFourthLayerPageIsActive: (isActive: boolean, content: ReactNode, refreshPage: number = 0) => setFourthLayerPageIsActive({ isActive, content, refreshPage }),
      topLayerIsActive,
      CloseTopLayerPage,
      topLayerRef,
      setTopLayerIsActive: (isActive: boolean, type: TopLayerPageType, content: Record<string, string> | null, result: ((res: boolean) => void) | null) => setTopLayerIsActive((prevState) => ({ ...prevState, isActive, type, content, result })),
      setIsSubmitting,
      isSubmitting,
      refreshAppContainer,
      setRefreshAppContainer,
    }}>
      {children}
    </PageContext>
  )
}

export const usePage = () => {
  const context = useContext(PageContext);
  if (!context) throw new Error("usePage must be used inside PageProvider");
  return context;
};

interface PagesContent {
  name: string;
  component: ReactNode;
}

type PagesType = Record<number, PagesContent>;

export const pages: PagesType = {
  0: { name: 'dashboard', component: <PM.DashboardPage /> },
  1: { name: 'products', component: <ProductsPage /> },
  2: { name: 'purchases', component: <PM.PurchasesPage /> },
  3: { name: 'users', component: <PM.UsersPage /> },
  4: { name: 'coupons', component: <PM.CouponsPage />  },
  5: { name: 'reviews', component: <PM.ReviewsPage />  },
  6: { name: 'models', component: <PM.ModelsPage />  },
  7: { name: 'manage', component: <PM.MobileRouterPage /> },
  // 8: { name: 'notifications', component: <PM.MobileNotificationsPage /> },
  // 9: { name: 'settings', component: <PM.MobileUserSettingsPage /> }
}