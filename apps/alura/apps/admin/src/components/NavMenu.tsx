import { usePage } from '../contexts/PageContext';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import EditProductPage from './EditProductPage';
import ImageUrl from '../tools/ImageUrl';
import AluraLogo from './AluraLogo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface NavMenuProps {
  setMRouterPageIsFocused: (value: boolean) => void;
  setSettingsDialogActive: Dispatch<SetStateAction<boolean>>;
  navExtended: boolean;
  setNavExtended: Dispatch<SetStateAction<boolean>>;
  setNotifContainerActive: Dispatch<SetStateAction<boolean>>;
}

export default function NavMenu(props: NavMenuProps) {
  const { currentDevice } = usePage();
  return (
    <>
      {currentDevice === 'mobile' ? <MobileNav {...props} /> : <DesktopTabletNav {...props} />}
    </>
  )
}

interface DesktopTabletNavProps {
  setSettingsDialogActive: Dispatch<SetStateAction<boolean>>;
  navExtended: boolean;
  setNavExtended: Dispatch<SetStateAction<boolean>>;
}

function DesktopTabletNav({ setSettingsDialogActive, navExtended, setNavExtended }: DesktopTabletNavProps) {
  const { userPfp, setIsLoggingOut } = useAuth();
  const { userData } = useAuth();
  const { theme } = useTheme();
  const { isSubmitting, CloseSecondLayer, thirdLayerPageIsActive, CloseThirdLayerPage, fourthLayerPageIsActive, topLayerIsActive, setTopLayerIsActive } = usePage();
  const { currentPage, currentDevice, setCurrentPage, setPageElementsActive, secondLayerPageIsActive } = usePage();
  const [userPfpIcon, setUserPfpIcon] = useState(userPfp ?? ImageUrl(`ui-images/pfp.svg`));
  const navBarRef = useRef<HTMLDivElement | null>(null);
  const listenerAttached = useRef(false);

  useEffect(() => {
    setUserPfpIcon(userPfp ?? ImageUrl(`ui-images/pfp.svg`));
  }, [userPfp]);

  useEffect(() => {
    if (currentDevice === 'tablet' && !listenerAttached.current) {
      document.addEventListener("mousedown", toggleNavExtended);
      document.addEventListener('focusin', toggleNavExtended);
      
      listenerAttached.current = true;
    }

    if (currentDevice !== 'tablet' && listenerAttached.current) {
      document.removeEventListener("mousedown", toggleNavExtended);
      document.addEventListener('focusin', toggleNavExtended);

      listenerAttached.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (listenerAttached.current) {
        document.removeEventListener("mousedown", toggleNavExtended);
        document.removeEventListener('focusin', toggleNavExtended);
        
        listenerAttached.current = false;
      }
    };
  }, [currentDevice]); 

  function toggleNavExtended(event: MouseEvent | FocusEvent) {
    const target = event.target;
    if (!(target instanceof Node)) return;

    if (!navBarRef.current) return;

    if (!navBarRef.current.contains(target)) setNavExtended(false);
    else setNavExtended(true);
  }

  async function HandlePageButtonClick(pageId: number) {
    if (thirdLayerPageIsActive.isActive) {
      const result: boolean = await (() => {
          return new Promise((resolve) => {
              setTopLayerIsActive(true, 'dialog', { title: 'Discard Changes?', message: "Are you sure you want to leave? All unsaved changes will be discarded.", trueButton: 'Discard changes' }, resolve);
          });
      })();
      // console.log('force submit? ', result);

      if (!result) return;

      CloseThirdLayerPage();
    }

    setCurrentPage(pageId);
    
    if (pageId === 0) setPageElementsActive(false);
    else setPageElementsActive(true);

    if (secondLayerPageIsActive.isActive) {
      CloseSecondLayer();
    }
  }

  function HandleLogoutButtonClick() {
    setIsLoggingOut(true);
  }

  return (
    <div className='nav' ref={navBarRef} data-extended={navExtended} inert={fourthLayerPageIsActive.isActive || topLayerIsActive.isActive || isSubmitting}>
      <AluraLogo />
      <ul>
        {navButtons['desktop'].map(listPage => {
          return (
            <li key={listPage.id}>
              <button data-active={navButtons['desktop'][currentPage]?.name === listPage.name ? 'true' : 'false'} onClick={() => HandlePageButtonClick(listPage.id)}>
                <img className='nav-button-icon' src={ImageUrl(`ui-images/${listPage.icon}`)} alt={listPage.name + ' icon'}></img>
                <div>
                  <p>{listPage.name}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      <div className='user-profile' onClick={() => setSettingsDialogActive(true)}>
        <button className='user-img-container'>
          <img alt='user profile' src={userPfpIcon} style={{ transform: userPfp ? 'scale(100%)' : 'scale(80%)', filter: userPfp ? 'none' : theme === 'light' ? 'invert(1) brightness(80%)' : 'invert(1) opacity(70%) brightness(100%)'  }}/>
        </button>
        <div className='user-name-and-actions-wrapper'>
          <div className='user-name-container'>
            <span></span>
            <p>{userData?.displayName}</p>
            <span></span>
          </div>
          <div className='user-profile-actions'>
            <button>
              <img className='button-icon' alt='' src={ImageUrl('ui-images/settings-icon.svg')} />
            </button>
            <button onClick={(e) => (e.stopPropagation(), HandleLogoutButtonClick())}>
              <img className='button-icon' alt='' src={ImageUrl('ui-images/logout-icon.svg')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MobileNavProps {
  setMRouterPageIsFocused: (value: boolean) => void;
  setSettingsDialogActive: Dispatch<SetStateAction<boolean>>;
  setNotifContainerActive: Dispatch<SetStateAction<boolean>>;
}

function MobileNav({ setMRouterPageIsFocused, setSettingsDialogActive, setNotifContainerActive }: MobileNavProps) {
  const { userPfp } = useAuth();
  const { theme } = useTheme();
  const { isSubmitting, CloseSecondLayer, thirdLayerPageIsActive, fourthLayerPageIsActive, topLayerIsActive } = usePage();
  const { currentPage, setCurrentPage, pageElementsActive, setPageElementsActive, setThirdLayerPageIsActive } = usePage();
  const [addButtonIsActive, setAddButtonIsActive] = useState((!pageElementsActive || pageElementsActive === null || currentPage === 2 || currentPage === 3 || currentPage === 5) ? false : true);
  const [userPfpIcon, setUserPfpIcon] = useState(userPfp ?? ImageUrl(`ui-images/pfp.svg`));

  useEffect(() => {
    setUserPfpIcon(userPfp ?? ImageUrl(`ui-images/pfp.svg`));
  }, [userPfp]);
  
  useEffect(() => {
    if (((!pageElementsActive) && !addButtonIsActive) || (currentPage === 2 || currentPage === 3 || currentPage === 5))
      return

    if ((pageElementsActive) && (currentPage === 1 || currentPage === 4 || currentPage === 6)) {
      setAddButtonIsActive(true);
      return;
    }

    const delay = setTimeout(() => {
      setAddButtonIsActive(false);
    }, 150);

    return () => clearTimeout(delay);
  }, [pageElementsActive]);

  function HandleNavButtonClick(btnID: number) {
    if (btnID === 8) {
      setNotifContainerActive(true);
      return;
    }

    if (btnID === 9) {
      setSettingsDialogActive(true);
      return;
    }
    else setCurrentPage(btnID);

    if (pageElementsActive) setPageElementsActive(false);

    if (btnID === 7) {
      setMRouterPageIsFocused(true);
      CloseSecondLayer();
    } else {
      CloseSecondLayer();
    }
  }

  return (
    <div className='mobile-nav' inert={thirdLayerPageIsActive.isActive || fourthLayerPageIsActive.isActive || topLayerIsActive.isActive || isSubmitting}>
      <ul>
        {navButtons['mobile'].map((btn) => {
          return ((btn.id === 10) ?
            ((!addButtonIsActive || currentPage === 2 || currentPage === 3 || currentPage === 5) ?
              null
              :
              <li key={btn.id} className='add-new-item-button-container' data-active={pageElementsActive.toString()}>
                <button className='add-new-item-button' disabled={(!pageElementsActive || pageElementsActive === null) ? true : false} onClick={() => { if (currentPage === 1) setThirdLayerPageIsActive(true, <EditProductPage edit={false} productID={null} title={'add new product'} />)}}>
                  <img src={ImageUrl(`ui-images/${btn.icon}`)} alt='' />
                </button>
              </li>
            )
            :
            <li key={btn.id}>
              <button data-active={(currentPage === btn.id) || ((btn.id === 7) && (currentPage === 1 || currentPage === 2 || currentPage === 3 || currentPage === 4 || currentPage === 5 || currentPage === 6)) ? 'true' : 'false'} onClick={() => HandleNavButtonClick(btn.id)}>
                <img className={btn.id === 9 ? '' : 'nav-button-icon'} src={btn.id === 9 ? userPfpIcon : ImageUrl(`ui-images/${btn.icon}`)} alt='' style={{ filter: btn.id === 9 ? userPfp ? 'none' : theme === 'light' ? 'invert(17%) brightness(94%) contrast(88%)' : 'invert(1) opacity(70%) brightness(100%)' : undefined }} />
                <div>
                  <p>{btn.name}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ["dashboard", "purchases", "products", "users", "coupons", "reviews", "currency", "models"]
export const navButtons = {
  desktop: [
    {
      id: 0,
      name: 'dashboard',
      icon: 'dashboard-icon.svg'
    },
    {
      id: 1,
      name: 'products',
      icon: 'dress-icon.svg'
    },
    {
      id: 2,
      name: 'purchases',
      icon: 'wallet-icon.svg'
    },
    {
      id: 3,
      name: 'users',
      icon: 'account-icon.svg'
    },
    {
      id: 4,
      name: 'coupons',
      icon: 'coupon-icon.svg'
    },
    {
      id: 5,
      name: 'reviews',
      icon: 'star-icon.svg'
    },
    {
      id: 6,
      name: 'models',
      icon: 'model-icon.svg'
    }
  ],
  mobile: [
    {
      id: 0,
      name: 'dashboard',
      icon: 'dashboard-icon.svg'
    },
    {
      id: 7,
      name: 'manage',
      icon: 'manage-icon.svg'
    },
    {
      id: 10,
      name: 'add',
      icon: 'add-icon.svg'
    },
    {
      id: 8,
      name: 'notifications',
      icon: 'notifications-icon.svg'
    },
    {
      id: 9,
      name: 'settings',
      icon: 'account-icon.svg'
    }
  ]
}