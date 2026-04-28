import React, { isValidElement, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usePage, pages } from '../contexts/PageContext';
import { navButtons } from "./NavMenu";
import loadingImage from '../../../../shared/assets/loading.gif';
import EditProductPage from './EditProductPage';
import useDataFetch from "../hooks/useDataFetch";
import ProductEditProvider, { nullableAttributes } from "../contexts/ProductEditContext";
import useDataSend from "../hooks/useDataSend";
import { ProductsPage } from "./ProductsPage";
import ImageUrl from "../tools/ImageUrl";
import { API_ROUTES } from "shared/constants/apiRouts";
import serializeParams from "../tools/SerializeParams.ts";
import type { ServerApiResponse } from "shared/types/ServerResponseTypes.ts";
import { useNotificationManager } from "./NotificationManager.tsx";
import { ShowHidePasswordIcon } from "../components/LoginForm.tsx";

interface AppContainerProps {
    setMRouterPageIsFocused: (value: boolean) => void;
    setNavExtended: Dispatch<SetStateAction<boolean>>;
    setNotifContainerActive: Dispatch<SetStateAction<boolean>>;
}

export function AppContainer({ setNavExtended, setMRouterPageIsFocused, setNotifContainerActive }: AppContainerProps) {
    const { setIsSubmitting, currentDevice, currentPage, setCurrentPage, pageElementsActive, setPageElementsActive, currentProductInView, setCurrentProductInView, secondLayerPageIsActive, CloseSecondLayer, thirdLayerPageIsActive, setThirdLayerPageIsActive, fourthLayerPageIsActive, topLayerIsActive, setTopLayerIsActive } = usePage();
    const { data, sendData } = useDataSend<ServerApiResponse>();
    const { Notify } = useNotificationManager();
    const [searchActive, setSearchActive] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState('');
    const inputFieldRef = useRef<HTMLInputElement | null>(null);
    const delayRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (currentDevice !== 'mobile' && currentPage === 7) {
            setCurrentPage(0);
        }
    }, [currentDevice]);

    useEffect(() => {
        if (!data) return;
        
        if (data.code === 'OK_UPDATED') {
            setCurrentProductInView((curr) => {
                if (!curr) return curr;

                return { ...curr, is_deleted: curr!.is_deleted === 0 ? 1 : 0 }
            });
        }

        Notify({ type: data.type, message: data.message, duration: 3000 });
        setIsSubmitting(false);
    }, [data]);

    function ReturnToManagePage() {
        setPageElementsActive(false);
        const delay = setTimeout(() => { setMRouterPageIsFocused(true); setCurrentPage(7); }, 300);
        delayRef.current = delay;
    }

    function HandleBackButtonClick() {
        if (secondLayerPageIsActive.isActive) {
            CloseSecondLayer();
        } else {
            ReturnToManagePage();
            setMRouterPageIsFocused(true);
            setSearchInputValue('');
        }
    }

    function toggleNavExtended() {
        setNavExtended(prevState => !prevState);
    }

    async function ToggleHideUnhideProduct(value: 0 | 1) {
        if (!currentProductInView) return;

        const result: boolean = await (() => {
            return new Promise((resolve) => {
                setTopLayerIsActive(true, 'dialog', { title: `${currentProductInView.is_deleted === 0 ? 'Disable' : 'Enable'} this product?`,
                    message: (currentProductInView.is_deleted === 1 ?
                        "Enabling this product will mark it and all it's variants as visibile and it will re-appear on any related future searches. Would you like to proceed?"
                        :
                        "Disabling this product will mark it and all it's variants as invisibile and it will not appear on any related future searches. Would you like to proceed?"),
                    trueButton: `${currentProductInView.is_deleted === 0 ? 'Disable' : 'Enable'} product`
                }, resolve);
            });
        })();

        if (!result) return;

        setIsSubmitting(true);

        sendData('PUT', API_ROUTES.PRODUCTS.TOGGLE_PRODUCT, { pID: currentProductInView.productID, isDeleted: value });
    }

    function handleNotifButtonClick() {
        setNotifContainerActive(true);
    }

    return(
        <div className='app-container' inert={thirdLayerPageIsActive.isActive || fourthLayerPageIsActive.isActive || topLayerIsActive.isActive}>
            <div className="status-bar">
                <div className="status-bar-buttons-container">
                    {currentDevice === "tablet" &&
                        <button onClick={toggleNavExtended}>
                            <img className="button-icon" src={ImageUrl('ui-images/menu-icon.svg')} alt=''/>
                        </button>
                    }
                    {((pageElementsActive && currentDevice === 'mobile') || (secondLayerPageIsActive.isActive && currentDevice !== 'mobile')) &&
                        <button className="sl-back-button" onClick={HandleBackButtonClick}>
                            <img className="button-icon" src={ImageUrl('ui-images/small-arrow-icon.svg')} alt=''/>
                        </button>
                    }
                </div>
                <h1 data-searchison={searchActive.toString()}>{(currentPage === 7) ? 'manage alura' : pages[currentPage].name}</h1>
                {((pageElementsActive && !secondLayerPageIsActive.isActive) && searchActive) && 
                    <div className="status-bar-search-input-container" onClick={() => inputFieldRef.current?.focus()}>
                        <input ref={inputFieldRef} type="text" value={searchInputValue} onChange={(e) => {if (searchActive) setSearchInputValue(e.currentTarget.value)}} placeholder={`Search ${pages[currentPage].name}...`} onBlur={() => {if (!searchInputValue) setSearchActive(false)}} autoFocus />
                        <button className="search-bar-clear-button" disabled={!searchInputValue} onClick={(e) => (e.stopPropagation(), setSearchInputValue(''))}>
                            <img src={ImageUrl('ui-images/x-circle-icon.svg')} alt=''/>
                        </button>
                    </div>
                }
                <div className="status-bar-buttons-container">
                    {(pageElementsActive && !secondLayerPageIsActive.isActive) &&
                        <button className="sl-search-button" data-isactive={searchActive.toString()} onClick={() => setSearchActive(true)}>
                            <img className="button-icon" src={ImageUrl('ui-images/search-icon.svg')} alt=''/>
                        </button>
                    }
                    {currentDevice !== 'mobile' &&
                        <button onClick={handleNotifButtonClick}>
                            <img className="nav-button-icon" src={ImageUrl('ui-images/notifications-icon.svg')} alt=''/>
                        </button>
                    }
                    {(secondLayerPageIsActive.isActive && pageElementsActive) &&
                        <>
                        <button className="sl-edit-product-button button-icon hide-show-button" onClick={() => ToggleHideUnhideProduct(currentProductInView?.is_deleted === 0 ? 1 : 0)}>
                            <ShowHidePasswordIcon style={{ width: 'clamp(20px, 80%, 25px)' }} passwordHidden={currentProductInView?.is_deleted === 0 ? false : true}/>
                        </button>
                        <button className="sl-edit-product-button" onClick={() => setThirdLayerPageIsActive(true, <EditProductPage edit={true} productID={currentProductInView!.productID} title="edit product"/>)}>
                            <img className="button-icon" src={ImageUrl('ui-images/edit-icon.svg')} alt=''/>
                        </button>
                        </>
                    }
                    {currentDevice !== 'mobile' && ((currentPage === 1 || currentPage === 4 || currentPage === 6)) &&
                        <button disabled={(!pageElementsActive || pageElementsActive === null) ? true : false} onClick={() => {if (currentPage === 1) setThirdLayerPageIsActive(true, <EditProductPage edit={false} productID={null} title={'add new product'} />)}}>
                            <img className="nav-button-icon" src={ImageUrl(`ui-images/add-icon.svg`)} alt='' />
                        </button>
                    }
                </div>
            </div>
            {currentPage === 1 ? 
                <ProductsPage searchInputValue={searchInputValue} searchActive={searchActive}/>
                :
                currentPage === 7 ? null : pages[currentPage].component
            }
        </div>
    )
}

export function DashboardPage() {
    return(
        // <div className="dashboard-page">
        //     {/* {'dashboard page'} */}
        // </div>
        <PreviewBuildPage />
    )
}

export function PurchasesPage() {
    return(
        // <div className="purchases-page">
        //     {'purchases page'}
        // </div>
        <PreviewBuildPage />
    )
}

export function UsersPage() {
    return(
        // <div className="purchases-page">
        //     {'users page'}
        // </div>
        <PreviewBuildPage />
    )
}

export function CouponsPage() {
    return(
        // <div className="purchases-page">
        //     {'coupons page'}
        // </div>
        <PreviewBuildPage />
    )
}

export function ReviewsPage() {
    return(
        // <div className="purchases-page">
        //     {'reviews page'}
        // </div>
        <PreviewBuildPage />
    )
}

export function ModelsPage() {
    return(
        // <div className="purchases-page">
        //     {'models page'}
        // </div>
        <PreviewBuildPage />
    )
}

function PreviewBuildPage() {
    const { setCurrentPage, setPageElementsActive } = usePage();

    function HandleButtonClick() {
        setCurrentPage(1);
        setPageElementsActive(true);
    }

    return(
        <div className="preview-page">
            <p>{'This version of the app was built for viewing purposes only. It includes the full functions of the Products page.'}</p>
            <button onClick={HandleButtonClick}>Take me there!</button>
        </div>
    )
}

interface MobileRouterPageProps {
    mRouterPageIsFocused?: boolean;
    setMRouterPageIsFocused?: (value: boolean) => void;
}

export function MobileRouterPage({ mRouterPageIsFocused, setMRouterPageIsFocused }: MobileRouterPageProps) {
    const { setCurrentPage, pageElementsActive, setPageElementsActive } = usePage();

    function HandlePageButtonClick(pageId: number) {
        setCurrentPage(pageId);
        setPageElementsActive(true);
    }

    return(
        <div className="mobile-router-page" data-isactive={mRouterPageIsFocused?.toString()} inert={pageElementsActive}>
            <ul>
                {navButtons['desktop'].filter(item => item.name !== 'dashboard').map(listPage => {
                    return(
                        <li key={listPage.id}>
                            <button onClick={() => {HandlePageButtonClick(listPage.id); if (setMRouterPageIsFocused) setMRouterPageIsFocused(false)}}>
                                <img className='nav-button-icon' src={ImageUrl(`ui-images/${listPage.icon}`)} alt={listPage.name + ' icon'}></img>
                                <div>
                                    <p>{listPage.name}</p>
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export function NotificationsPageContainer({ ref, setNotifContainerActive }: { ref: React.RefObject<HTMLDivElement | null>; setNotifContainerActive: React.Dispatch<React.SetStateAction<boolean>>; }) {
    const [isActive, setIsActive] = useState(false);

    useLayoutEffect(() => {
        requestAnimationFrame(() => setIsActive(true));
    }, []);

    function closeNotificationContainer() {
        setIsActive(false);

        const delay = setTimeout(() => {
            // do soemthing
            setNotifContainerActive(false);
        }, 300);

        return () => clearTimeout(delay);
    }

    return(
        <>
        <div className="notifications-page-backdrop" data-isactive={isActive} onClick={closeNotificationContainer}/>
        <div className='notifications-page' ref={ref} data-isactive={isActive}>
            <div className="np-header" style={{ width: '100%' }}>
                <button onClick={() => (setIsActive(false), closeNotificationContainer())}>
                    <img className='button-icon' src={ImageUrl('ui-images/x-icon.svg')} alt='' />
                </button>
                <p>{'Notifications'}</p>
            </div>
            <div className="np-body">
                <div className="np-no-notifications">
                    <img src={ImageUrl('ui-images/alura-sleeping-avatar.webp')} alt='' />
                    <p>{"It's too quiet in here..."}</p>
                </div>
            </div>
        </div>
        </>
    )
}


export function SecondLayerAppPage({ children }: { children: ReactNode; }) {
    const { slPageRef, secondLayerPageIsActive, thirdLayerPageIsActive, fourthLayerPageIsActive, topLayerIsActive } = usePage();
    return(
        <div className="second-layer-page" ref={slPageRef} inert={thirdLayerPageIsActive.isActive || fourthLayerPageIsActive.isActive || topLayerIsActive.isActive} data-isactive={(secondLayerPageIsActive.isActive).toString()}>
            {children}
        </div>
    )
}

export function ThirdLayerAppPage({ children }: { children: ReactNode; }) {
    const { tlPageRef, isSubmitting, CloseThirdLayerPage, fourthLayerPageIsActive, topLayerIsActive } = usePage();
    const [isActive, setIsActive] = useState(false);

    useLayoutEffect(() => {
        requestAnimationFrame(() => setIsActive(true));
    }, []);

    return(
        <>
        <div className="third-layer-page-backdrop" data-isactive={isActive}/>
        <div className='third-layer-page' ref={tlPageRef} data-isactive={isActive} inert={fourthLayerPageIsActive.isActive || topLayerIsActive.isActive || isSubmitting}>
            <div style={{ width: '100%' }}>
                <button onClick={() => (setIsActive(false), CloseThirdLayerPage())}>
                    <img className='button-icon' src={ImageUrl('ui-images/x-icon.svg')} alt='' />
                </button>
                {isValidElement(children) && (
                    <p>{(children as React.ReactElement<{ title: string }>).props.title}</p>
                )}
            </div>
            <ProductEditProvider>
                {children}
            </ProductEditProvider>
        </div>
        </>
    )
}

export function FourthLayerAppPage({ children }: { children: ReactNode; }) {
    const { flPageRef, CloseFourthLayerPage, topLayerIsActive } = usePage();
    const [isActive, setIsActive] = useState(false);

    useLayoutEffect(() => {
        requestAnimationFrame(() => setIsActive(true));
    }, []);

    return(
        <>
        <div className="fourth-layer-page-backdrop" data-isactive={isActive} onClick={() => (setIsActive(false), CloseFourthLayerPage())}/>
        <div className='fourth-layer-page' ref={flPageRef} data-isactive={isActive} inert={topLayerIsActive.isActive}>
            <div className='fourth-layer-page-content'>
                {React.cloneElement(children as React.ReactElement)}
            </div>
            <button onClick={() => (setIsActive(false), CloseFourthLayerPage())}>
                <img className='button-icon' src={ImageUrl('ui-images/x-icon.svg')} alt=''/>
            </button>
        </div>
        </>
    )
}

export function TopLayerAppPage() {
    const { topLayerRef, topLayerIsActive, CloseTopLayerPage } = usePage();
    const [inTouch, setInTouch] = useState(false);
    const [inZoom, setInZoom] = useState(false);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const lastTouchDistance = useRef(0);
    const lastTouchPosition = useRef<{x: number; y: number} | null>(null);
    const [trasformOrigin, setTransformOrigin] = useState<{x: number; y: number} | null>(null);


    useEffect(() => {
        const viewContainer = document.querySelector(".toplayer-view-container");
        if (!(viewContainer instanceof HTMLElement)) return;

        const handleTouchStartWrapper = (e: TouchEvent) => handleTouchStart(e);
        const handleTouchMoveWrapper = (e: TouchEvent) => handleTouchMove(e);
        const handleTouchEndWrapper = () => handleTouchEnd();
        const handleWheelZoomWrapper = (e: WheelEvent) => handleWheelZoom(e);

        viewContainer.addEventListener("touchstart", handleTouchStartWrapper, { passive: false });
        viewContainer.addEventListener("touchmove", handleTouchMoveWrapper, { passive: false });
        viewContainer.addEventListener("touchend", handleTouchEndWrapper, { passive: false });
        viewContainer.addEventListener("wheel", handleWheelZoomWrapper, { passive: false });

        return () => {
            viewContainer.removeEventListener("touchstart", handleTouchStartWrapper);
            viewContainer.removeEventListener("touchmove", handleTouchMoveWrapper);
            viewContainer.removeEventListener("touchend", handleTouchEndWrapper);
            viewContainer.removeEventListener("wheel", handleWheelZoomWrapper);
        };
    }, []);

    const handleWheelZoom = (e: WheelEvent) => {
        e.preventDefault();
        setInZoom(true);

        setTransformOrigin({ x: e.clientX, y: e.clientY });

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((prev) => Math.max(1, prev + delta));
    };

    const handleTouchStart = (e: TouchEvent) => {
        // e.preventDefault();
        
        setInTouch(true);
        if (e.touches.length === 2) {
            setInZoom(true);
            // Pinch-to-zoom: Track distance between two fingers
            const distance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            const midpointX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midpointY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            setTransformOrigin({ x: midpointX, y: midpointY });

            lastTouchPosition.current = { x: midpointX, y: midpointY };
            lastTouchDistance.current = distance;
        } else if (e.touches.length === 1) {
            // Panning: Track single touch position
            lastTouchPosition.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();

        if (e.touches.length === 2) {
            // Pinch-to-zoom
            // const currentTouchPosition = {
            //     x: e.touches[0].clientX - e.touches[1].clientX,
            //     y: e.touches[0].clientY - e.touches[1].clientY,
            // };

            const distance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            const scaleChange = distance / lastTouchDistance.current;

            const newMidpointX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const newMidpointY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            const deltaX = (newMidpointX - (lastTouchPosition.current ? lastTouchPosition.current.x : 0)) / scale;
            const deltaY = (newMidpointY - (lastTouchPosition.current ? lastTouchPosition.current.y : 0)) / scale;
            
            setTranslate((prev) => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY,
            }));
                
            setScale((prev) => Math.max(1, prev * scaleChange));

            lastTouchPosition.current = { x: newMidpointX, y: newMidpointY };
            lastTouchDistance.current = distance;
        } else if (e.touches.length === 1) {
            // Panning
            const currentTouchPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };
    
            const deltaX = (currentTouchPosition.x - (lastTouchPosition.current ? lastTouchPosition.current.x : 0));
            const deltaY = (currentTouchPosition.y - (lastTouchPosition.current ? lastTouchPosition.current.y : 0));
    
            setTranslate((prev) => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY,
            }));
    
            lastTouchPosition.current = currentTouchPosition;
        }
    };

    const handleTouchEnd = () => {
        // e.preventDefault();

        setScale(1);
        setTranslate({ x: 0,  y: 0 });

        lastTouchPosition.current = null;
        lastTouchDistance.current = 0;
        setInTouch(false);
        setInZoom(false);
        setTransformOrigin(null);
    };

    return(
        <dialog className='mobile-toplayer-page' data-type={topLayerIsActive.type} data-isactive='false' ref={topLayerRef} onClick={(e) => {if (e.currentTarget === e.target && topLayerIsActive.type === 'view')  CloseTopLayerPage()}}>
            <div className='mobile-toplayer-page-content'>
                {topLayerIsActive.type === 'view' &&
                <>
                    <div className="toplayer-view-container">
                        <img src={topLayerIsActive.content?.image} alt="product image view" style={{ transformOrigin: inZoom ? `${trasformOrigin?.x}px ${trasformOrigin?.y}px` : 'center' , transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`, transitionDuration: inTouch ? '0s' : '0.3s' }}/>
                    </div>
                    <button onClick={() => CloseTopLayerPage()}>
                        <img src={ImageUrl('ui-images/x-icon.svg')} alt='' />
                    </button>
                </>
                }
                {(topLayerIsActive.type === 'dialog' || topLayerIsActive.type === 'alert') &&
                    <div className="toplayer-dialog-container">
                        <p className="toplayer-dialog-title">{topLayerIsActive.content?.title}</p>
                        <p className="toplayer-dialog-message">{topLayerIsActive.content?.message}</p>
                        <div className="toplayer-dialog-buttons-container">
                            <button onClick={() => {if (topLayerIsActive.result !== null) {topLayerIsActive.result(false); CloseTopLayerPage()}}}>{topLayerIsActive.type === 'alert' ? 'Ok' : 'Cancel'}</button>
                            {topLayerIsActive.type === 'dialog' &&
                                <button style={{ color: 'rgb(215 63 52)' }} onClick={() => {if (topLayerIsActive.result !== null) {topLayerIsActive.result(true); CloseTopLayerPage()}}}>{topLayerIsActive.content?.trueButton ?? 'Confirm'}</button>  /* Yes, delete it! */
                            }
                        </div>
                    </div>
                }
                {topLayerIsActive.type === 'notif' &&
                <>
                    
                </>
                }
            </div>
        </dialog>
    )
}

interface SelectOptionsProps {
    selectFor: string;
    addEnabled: boolean;
    selectedValue: string | null | undefined;
    setSelectedValue: (value: string | undefined | null) => void;
    setSelectedCC: (value: string | undefined) => void;
    disabledColors: string[];
    setSelectedModel: React.Dispatch<React.SetStateAction<{
        'model-id': number | undefined;
        'model-f-name': string | undefined;
        'model-l-name': string | undefined;
        'model-tel-number': string | undefined;
        'model-bust': number | undefined;
        'model-hips': number | undefined;
        'model-waist': number | undefined;
        'model-height': number | undefined;
        'model-ig-acc': string | undefined;
        'model-pfp': string | undefined;
    } | undefined>>;
}

interface ColorAttrOptionsType {
    name: string;
    sc: string;
}
interface ModelOptionsType {
    ['model-id']: number;
    ['model-f-name']: string;
    ['model-l-name']: string;
    ['model-tel-number']: string;
    ['model-bust']: number;
    ['model-hips']: number;
    ['model-waist']: number;
    ['model-height']: number;
    ['model-pfp']: string;
    ['model-ig-acc']: string;
}

export function SelectOptionPage({ selectFor, addEnabled, selectedValue, setSelectedValue, setSelectedCC, disabledColors, setSelectedModel } : SelectOptionsProps) {
    const { Notify } = useNotificationManager();
    const { data, loading } = useDataFetch<ColorAttrOptionsType[] | ModelOptionsType[]>(true, API_ROUTES.PRODUCTS.GET_OPTIONS, serializeParams({ for: selectFor }));
    const { data: addData, sendData } = useDataSend<ServerApiResponse>();
    const [options, setOptions] = useState<ColorAttrOptionsType[] | ModelOptionsType[] | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | undefined | null>(selectedValue === undefined ? undefined : selectedValue);
    const [isAdding, setIsAdding] = useState(false);
    const [inputOneValue, setInputOneValue] = useState({value: '', valid: false});
    const [inputTwoValue, setInputTwoValue] = useState({value: '', valid: false});
    const [isSubmittingValue, setIsSubmittingValue] = useState(false);
    const inputOneRef = useRef<HTMLInputElement | null>(null);
    const inputTwoRef = useRef<HTMLInputElement | null>(null);
    const selectedOptionRef = useRef<HTMLButtonElement | null>(null);
    
    useEffect(() => {
        if (data) {
            setOptions(data);
        }
    }, [data, loading]);
    
    useEffect(() => {
        if (isAdding === false) return;
        
        inputOneRef.current?.focus();
    }, [isAdding]);
    
    useEffect(() => {
        let firstScroll = 0;

        if (!selectedOptionRef.current || firstScroll !== 0 || options === null) return;

        selectedOptionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        firstScroll = 1;
    }, [selectedOptionRef, options]);

    useEffect(() => {
        if (!addData || isModelOptionsTypeArray(options)) return;

        Notify({ type: addData.type, message: addData.message, duration: 3000 });

        if (addData.code === 'OK_CREATED') {
            setOptions([{ name: inputOneValue.value, sc: inputTwoValue.value }, ...options ?? []]);
            setIsAdding(false);
            setSelectedValue(inputOneValue.value);
            setSelectedOption(inputOneValue.value);
    
            if (selectFor === 'color') {
                setInputOneValue({value: '', valid: false});
                setInputTwoValue({value: '', valid: false});
            } else {
                setInputOneValue({value: '', valid: false});
            }
    
            setIsSubmittingValue(false);
        }
    }, [addData]);

    function isModelOptionsTypeArray(arr: ColorAttrOptionsType[] | ModelOptionsType[] | null): arr is ModelOptionsType[] {
        return (
            Array.isArray(arr) &&
            arr.length > 0 &&
            'model-id' in arr[0]
        );
    }

    useEffect(() => {
        if (isSubmittingValue === false) return;

        sendData('POST', API_ROUTES.PRODUCTS.ADD_OPTIONS, selectFor === 'color' ? { for: selectFor, name: inputOneValue.value, sc: inputTwoValue.value } : { for: selectFor, name: inputOneValue.value });
    }, [isSubmittingValue]);

    function InputOneValidateValue(val: string) {
        const allowedletters = /^[a-zA-Z\s\-_,.]+$/;
        const value = val.trim();

        if (!value.match(allowedletters) || value.length < 1) setInputOneValue({value: val, valid: false})
        else setInputOneValue({value: val, valid: true})
    }
    function InputTwoValidateValue(val: string) {
        const allowedletters = /^[a-zA-Z]+$/;
        const value = val.trim();

        if (!value.match(allowedletters) || value.length < 1) setInputTwoValue({value: val, valid: false})
        else setInputTwoValue({value: val.toUpperCase(), valid: true})
    }

    return(
       <>
        <div className="fourth-layer-page-top-bar">
            <div className="blank-div"></div>
            <p>select {selectFor}</p>
            {addEnabled ?
                <>
                    {isAdding ? 
                        <button className="fourth-layer-page-submit-button" disabled={selectFor === 'color' ? (inputOneValue.valid && inputTwoValue.valid ? false : true) : (inputOneValue.valid ? false : true)} onClick={() => setIsSubmittingValue(true)}>
                            <img className='button-icon' src={ImageUrl('ui-images/checkmark-icon.svg')} alt=''/>
                        </button>
                    :
                        <button className="fourth-layer-page-add-button" onClick={() => (setIsAdding(true))}>
                            <img className='button-icon' src={ImageUrl('ui-images/x-icon.svg')} alt=''/>
                        </button>
                    }
                </>
                :
                <div className="blank-div"></div>
            }
        </div>
        {options === null ?
            <img className="loading-image" src={loadingImage} alt=""/>
        :
            <div className="select-options-container">
                <button data-isactive={selectedOption === undefined ? 'true' : 'false'} onClick={() => (setSelectedValue(undefined), setSelectedOption(undefined), selectFor === 'model' ? setSelectedModel(undefined) : selectFor === 'color' ? setSelectedCC(undefined) : null)}>
                    <img src={ImageUrl('ui-images/checkmark-icon.svg')} alt=''/>
                    <p>no selection</p>
                </button>
                {nullableAttributes.has(selectFor) &&
                    <button data-isactive={selectedOption === null ? 'true' : 'false'} onClick={() => (setSelectedValue(null), setSelectedOption(null))}>
                        <img src={ImageUrl('ui-images/checkmark-icon.svg')} alt=''/>
                        <p>keep empty</p>
                    </button>
                }
                {isAdding &&
                    <>
                        {selectFor === 'color' ? 
                        <div className="add-new-option-inputs-container">
                            <input type="text" placeholder="color name" data-isvalid={inputOneValue.valid.toString()} value={inputOneValue.value} ref={inputOneRef} data-isfilled={(inputOneValue.value.length < 1) ? 'false' : 'true'} onChange={(e) => InputOneValidateValue(e.currentTarget.value)}/>
                            -
                            <input type="text" placeholder="color code" data-isvalid={inputTwoValue.valid.toString()} value={inputTwoValue.value} ref={inputTwoRef} data-isfilled={(inputTwoValue.value.length < 1) ? 'false' : 'true'} onChange={(e) => InputTwoValidateValue(e.currentTarget.value)} style={{textTransform: "uppercase"}}/>
                        </div>
                        :
                        <div className="add-new-option-inputs-container">
                            <input style={{ width: '70%' }} type="text" placeholder={selectFor + " name"} data-isvalid={inputOneValue.valid.toString()} value={inputOneValue.value} ref={inputOneRef} data-isfilled={(inputOneValue.value.length < 1) ? 'false' : 'true'} onChange={(e) => InputOneValidateValue(e.currentTarget.value)}/>
                        </div>
                        }
                    </>
                }
                {Object.entries(options).map(([id, value]) => {
                    return(
                        <button key={id} ref={selectedOption === value.name ? selectedOptionRef : null} disabled={disabledColors.indexOf(value.sc) === -1 ? false : true} data-isactive={selectFor === 'model' ? selectedOption === `${value['model-f-name']} ${value['model-l-name']}` ? 'true' : 'false' : selectedOption === value.name ? 'true' : 'false'} onClick={() => (disabledColors.indexOf(value.sc) === -1) ? (isAdding ? setIsAdding(false) : null, setSelectedValue(selectFor === 'model' ? `${value['model-f-name']} ${value['model-l-name']}` : value.name), setSelectedOption(selectFor === 'model' ? `${value['model-f-name']} ${value['model-l-name']}` : value.name), (selectFor === 'color' ? setSelectedCC(value.sc) : null), (selectFor === 'model' ? setSelectedModel(value) : null)) : null}>
                            <img src={ImageUrl('ui-images/checkmark-icon.svg')} alt=''/>
                            <p>{selectFor === 'color' ? `${value.name}  -  ${value.sc}` : selectFor === 'model' ? `${value['model-f-name']} ${value['model-l-name']}` : `${value.name}`}</p>
                        </button>
                    )
                })}
            </div>
        }
       </>
    )
}