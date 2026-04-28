import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { usePage } from '../contexts/PageContext';
import ImageUrl from '../tools/ImageUrl';
import { useAuth } from '../contexts/AuthContext';

interface SettingsDialogProps {
    ref: RefObject<HTMLDialogElement | null>;
    setSettingsDialogActive: Dispatch<SetStateAction<boolean>>;
    // toggleDialog: () => void;
}

export function SettingsDialog({ ref, setSettingsDialogActive }: SettingsDialogProps) {
    const { setTopLayerIsActive } = usePage();
    const { userData, userPfp, setIsLoggingOut, setNewProfilePic } = useAuth();
    const { currentDevice } = usePage();
    const { theme, toggleTheme } = useTheme();
    const [selectedImage, setSelectedImage] = useState<{ link: string | null, blob: File | null }>({ link: null, blob: null });
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [userPfpIcon, setUserPfpIcon] = useState(processedImage ?? userPfp ?? ImageUrl(`ui-images/pfp.svg`));
    const imgInputRef = useRef<HTMLInputElement | null>(null);
    const blobUrls: string[] = [];

    useEffect(() => {
        ref.current?.showModal();
    }, []);

    useEffect(() => {
            // Clean up Blob URLs when component unmounts
            return () => {
                blobUrls.forEach((url) => URL.revokeObjectURL(url));
                blobUrls.length = 0;
            };
        }, []);

    useEffect(() => {
        setUserPfpIcon(processedImage ?? userPfp ?? ImageUrl(`ui-images/pfp.svg`));
    }, [processedImage, userPfp]);

    function CloseDialog() {
        ref.current?.setAttribute('data-isactive', 'false');
        setTimeout(() => {
            setSettingsDialogActive(false);
        }, 300);
    }

    function HandleLogoutButtonClick() {
        CloseDialog();
        setIsLoggingOut(true);
    }

    function HandleImageSelect(newImage: FileList) {
        const file = Array.from(newImage)[0];

        setSelectedImage({ link: null, blob: file });
    }

    const convertAndResizeImage = (fileOrUrl: string | File): Promise<{url: string; file: File}>  => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            if (typeof fileOrUrl === "string") {
                img.src = fileOrUrl; // URL case
            } else {
                // File object case - use FileReader
                const reader = new FileReader();
                reader.onload = () => {
                    const str = reader.result?.toString();
                    if (str) img.src = str; // Use Data URL as img source
                };
                reader.onerror = () => reject(new Error("File reading failed"));
                reader.readAsDataURL(fileOrUrl);
            }

            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = 250;
                    canvas.height = 250;

                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject(new Error("Canvas context could not be created"));

                    ctx.drawImage(img, 0, 0, 250, 250);

                    canvas.toBlob((blob) => {
                        if (!blob) return reject(new Error("Blob creation failed"));

                        const file = new File([blob], "converted.webp", {
                            type: "image/webp",
                            lastModified: Date.now(),
                        });

                        const webpUrl = URL.createObjectURL(file);
                        resolve({ url: webpUrl, file });
                    }, "image/webp", 0.95);
                } catch (err) {
                    reject(err);
                }
            };
    
            img.onerror = () => reject(new Error("Possibly caused by an unsupported format... Make sure to use JPG, PNG, or WebP and try again"));
        });
    };

    useEffect(() => {
        // console.log(selectedImage);
        if (!selectedImage) return;

        const image = selectedImage.link === null ? selectedImage.blob : selectedImage.link;

        if (image) {
            if (typeof image === "string") {
                SetImageUrl(image);
            } else {
                convertAndResizeImage(image)
                .then(({ url: webpUrl, file }) => {
                    SetImageUrl(webpUrl);
                    setSelectedImage({link: webpUrl, blob: file});

                    // send to server
                    setNewProfilePic(file);

                    // console.log(selectedImage);
                    blobUrls.push(webpUrl);
                    // console.log(blobUrls);
                })
                .catch(async (error) => {
                    if (!(error instanceof Error)) return;
        
                    await new Promise((resolve) => {
                        setTopLayerIsActive(true, 'alert', { title: 'Error processing image', message: error.message }, resolve);
                    });

                    setSelectedImage({link: null, blob: null});
                });
            }
        }

        function SetImageUrl(webpUrl: string) {
            setProcessedImage(webpUrl);
        }
    }, [selectedImage]);

    return(
        <dialog className='settings-dialog' ref={ref} data-isactive={true} onClick={(e) => {if (e.currentTarget === e.target) CloseDialog()}}>
            <div className="settings-page-header">
                {/* <p>settings</p> */}
                <button className='close-settings-button' onClick={CloseDialog}>
                    <img className='button-icon' alt='close settings' src={ImageUrl('ui-images/x-icon.svg')} />
                </button>
                <button className='theme-toggle-button' onClick={toggleTheme}>
                    <img className='button-icon' alt='theme toggle' src={ImageUrl(theme === 'light' ? 'ui-images/dark-icon.svg' : 'ui-images/light-icon.svg')} />
                </button>
                <button className='user-img-button' onClick={() => undefined}>
                    <label htmlFor="user-pfp-image-input" className="edit-button-container" > {/* tabIndex={0} */}
                        <img className='button-icon' src={ImageUrl('ui-images/edit-icon.svg')} alt='edit profile' />
                    </label>
                    <input ref={imgInputRef} style={{ display: "none" }} type="file" id={'user-pfp-image-input'} accept="image/*" onChange={(e) => {if (e.currentTarget.files) HandleImageSelect(e.currentTarget.files)}}/>
                    <img alt='user profile' src={userPfpIcon} style={{ filter: userPfp ? 'none' : theme === 'light' ? 'invert(1) brightness(80%)' : 'invert(1) opacity(70%) brightness(100%)' }}/>
                </button>
            </div>
            <div className="settings-page-body">
                <div className="settings-page-body-section">
                    <p>account information</p>
                    <div>
                        <EditInfoCard title={'display name'} value={userData?.displayName ?? 'Guest'} />
                        <EditInfoCard title={'email'} value={userData?.email ?? 'guestemail@gmail.com'} />
                        <EditInfoCard title={'username'} value={userData?.username ?? 'guest1'} />
                        <EditInfoCard title={'password'} value={''} />
                        <EditInfoCard title={'phone'} value={userData?.phoneNumber ?? '+201011241200'} />
                    </div>
                </div>
                <div className="settings-page-body-section">
                    <p>general</p>
                    <div>
                        <EditInfoCard title={'language'} value={'English'} />
                        <EditInfoCard title={'currency'} value={'USD'} />
                        <EditInfoCard title={'remember me'} value={'true'} type={'checkbox'} />
                    </div>
                </div>
                {currentDevice === 'mobile' &&
                    <div className="settings-page-body-section">
                        <button className="mobile-logout-button" onClick={HandleLogoutButtonClick}>
                            <img alt='logout' src={ImageUrl('ui-images/logout-icon.svg')} />
                            <p>log out</p>
                        </button>
                    </div>
                }
            </div>
        </dialog>
    )
}



// export function MobileUserSettingsPage() {
//     const { currentDevice } = usePage();
//     const { theme, toggleTheme } = useTheme();

//     return(
//         <div className="mobile-settings-page">
//             <div className="mobile-settings-page-header">
//                 {/* <p>settings</p> */}
//                 <button className='close-settings-button' onClick={() => toggleDialog()}>
//                     <img className='button-icon' alt='close settings' src={ImageUrl('ui-images/x-icon.svg')}></img>
//                 </button>
//                 <button className='theme-toggle-button' onClick={toggleTheme}>
//                     <img className='button-icon' alt='theme toggle' src={ImageUrl(theme === 'light' ? 'ui-images/dark-icon.svg' : 'ui-images/light-icon.svg')}></img>
//                 </button>
//                 <button className='user-img-button'>
//                     <label htmlFor="user-img-button" className="edit-button-container">
//                         <img className='button-icon' src={ImageUrl('ui-images/edit-icon.svg')} alt='edit profile' />
//                     </label>
//                     <img alt='user profile' src={ImageUrl('ui-images/pfp.jpg')}></img>
//                 </button>
//             </div>
//             <div className="settings-page-body">
//                 <div className="settings-page-body-section">
//                     <p>account information</p>
//                     <div>
//                         <EditInfoCard title={'display name'} value={'Tarek M. Al-Hassan'}></EditInfoCard>
//                         <EditInfoCard title={'email'} value={'tmalhassan1995@gmail.com'}></EditInfoCard>
//                         <EditInfoCard title={'username'} value={'tmalhassan'}></EditInfoCard>
//                         <EditInfoCard title={'password'} value={''}></EditInfoCard>
//                         <EditInfoCard title={'phone'} value={'+201011241200'}></EditInfoCard>
//                     </div>
//                 </div>
//                 <div className="settings-page-body-section">
//                     <p>general</p>
//                     <div>
//                         <EditInfoCard title={'language'} value={'English'}></EditInfoCard>
//                         <EditInfoCard title={'currency'} value={'USD'}></EditInfoCard>
//                         <EditInfoCard title={'remember me'} value={'true'} type={'checkbox'}></EditInfoCard>
//                     </div>
//                 </div>
//                 {currentDevice === 'mobile' &&
//                     <div className="settings-page-body-section">
//                         <button className="mobile-logout-button">
//                             <img alt='logout' src={ImageUrl('ui-images/logout-icon.svg')}></img>
//                             <p>log out</p>
//                         </button>
//                     </div>
//                 }
//             </div>
//         </div>
//     )
// }

interface EditInfoCardProps {
    title: string;
    value: string;
    type?: string;
}

function EditInfoCard({title, value, type = ''}: EditInfoCardProps) {
    return(
        <>
        <button className='settings-edit-info-card'>
            <p className="title">{title}</p>
            {type === 'checkbox' ? 
                <>
                    <ModernCheckbox value={value}></ModernCheckbox>
                </>
            : 
                <>
                    <p className="value">{value}</p>
                    <img className='button-icon' src={ImageUrl('ui-images/small-arrow-icon.svg')} alt='edit'/>
                </>
            }
        </button>
        </>
    )
}

function ModernCheckbox({ value }: {value: string}) {
    const [toggleCheckbox, setToggleCheckbox] = useState(value);

    function handleCheckBox() {
        setToggleCheckbox(toggleCheckbox === 'true' ? 'false' : 'true');
    }
    
    return(
        <div className="modern-checkbox" data-ischecked={toggleCheckbox} onClick={handleCheckBox}>
            <div className="checkbox-handle"></div>
        </div>
    )
}