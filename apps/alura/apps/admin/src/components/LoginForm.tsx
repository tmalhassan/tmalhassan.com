import { useRef, useState, type Dispatch, type SetStateAction } from "react"
// import { API_ROUTES } from "shared/constants/apiRouts";
import { useAuth } from "../contexts/AuthContext";
// import ImageUrl from "../tools/ImageUrl";
// import useDataSend from "src/hooks/useDataSend";

export default function LoginForm({ setIsSubmitting, error }: { setIsSubmitting: Dispatch<SetStateAction<boolean>>; error: boolean }) {
    const { handleLogin, setUserData } = useAuth();
    const [usernameInputValue, setUsernameInputValue] = useState('');
    const [passwordInputValue, setPasswordInputValue] = useState('');
    const [passwordHidden, setPasswordHidden] = useState(true);
    const usernameInputRef = useRef<HTMLInputElement | null>(null);
    const passwordInputRef = useRef<HTMLInputElement | null>(null);

    function handleUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
        const val = event.target.value;

        // console.log(val);
        setUsernameInputValue(val);
    }

    function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
        const val = event.target.value;

        // console.log(val);
        setPasswordInputValue(val);
    }

    function AdminLoginButtonClick(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); // Prevent form submission reload
        // console.log("user clicked login!!");

        setIsSubmitting(true);
        handleLogin(usernameInputValue, passwordInputValue);
    }

    function GuestLoginButtonClick() {
        // console.log("guest clicked login!!");

        setIsSubmitting(true);

        // give the guest access without perms
        setUserData({
            id: null,
            email: null,
            username: "Guest",
            displayName: "Guest",
            phoneNumber: null,
            adminLevel: 0,
            pfpCounter: 0
        });
    }

    return (
        <form onSubmit={AdminLoginButtonClick}>
            <div className="input-section" onClick={(e) => (e.stopPropagation(), usernameInputRef.current?.focus())}>
                <input ref={usernameInputRef} id="username" name="username" type="text" placeholder="Username or email" value={usernameInputValue} onChange={handleUsernameChange} autoComplete="off" required />
            </div>

            <div className="input-section" onClick={(e) => (e.stopPropagation(), passwordInputRef.current?.focus())}>
                <input ref={passwordInputRef} id="password" name="password" type={passwordHidden ? 'password' : 'text'} placeholder="Password" value={passwordInputValue} onChange={handlePasswordChange} autoComplete="off" required />
                <button className="button-icon" type='button' onClick={(e) => (e.stopPropagation(), setPasswordHidden(currState => !currState))}>
                    <ShowHidePasswordIcon passwordHidden={passwordHidden} />
                </button>
            </div>

            <div className='login-form-error-message' data-error={error}>
                <p>{'Your username/password combination is incorrect. Check your details and try again.'}</p>
            </div>

            <button className="login-button" type='submit'>
                <p>login</p>
            </button>
            <p>- or -</p>
            <button className="guest-button" type='button' onClick={GuestLoginButtonClick}>{'Continue as a guest (View mode)'}</button>
        </form>
    )
}

export function ShowHidePasswordIcon({ passwordHidden, style }: { passwordHidden: boolean; style?: object }) {
    return (
        <svg style={style} xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" id="Layer_3" x={0} y={0} viewBox="0 0 512 512">
            <g id="Default_Eye">
                <path d="M324.6 256c0-37.9-30.7-68.6-68.6-68.6-10.7 0-20.8 2.5-29.8 6.8l97.8 70.4c.4-2.8.6-5.7.6-8.6zM187.5 256c0 37.9 30.7 68.6 68.6 68.6 10.7 0 20.8-2.5 29.8-6.8L188 247.3c-.3 2.9-.5 5.8-.5 8.7z"
                    style={{ fill: '#231f20' }} />

                <path d="M258.1 364.6c-61.6 1.1-111.8-49-110.6-110.6.2-11.1 2.1-21.8 5.4-31.9l-63.9-46c-27 19.8-48.8 40.6-63.6 56-12.5 13-12.5 34.9 0 47.9C64.5 320.6 153 398.9 256 398.9c38 0 74-10.6 106.3-26.1L320.9 343c-17.7 13.1-39.4 21.1-62.8 21.6zM254 147.4c61.6-1.1 111.8 49 110.6 110.6-.2 11.1-2.1 21.8-5.4 31.9l63.9 46c26.9-19.8 48.7-40.5 63.5-55.8 12.6-13.1 12.6-35 0-48.1-39.2-40.8-127.7-118.9-230.6-118.9-38 0-74 10.6-106.3 26.1l41.4 29.8c17.7-13.1 39.4-21.1 62.9-21.6z"
                    style={{ fill: '#231f20' }} />
            </g>
            <g id="On_Show_Elements" style={{ opacity: passwordHidden ? '100%' : '0%', transitionDuration: '0.175s' }}>
                <path d="M152.9 222.1c7.1-21.3 20.6-39.8 38.3-53l-41.4-29.8c-22.2 10.6-42.6 23.5-60.7 36.9l63.8 45.9zM226.2 194.2c-20.4 9.9-35.2 29.7-38.2 53.1l97.8 70.4c20.4-9.9 35.2-29.7 38.2-53.1l-97.8-70.4zM359.1 289.9c-7.1 21.3-20.6 39.8-38.3 53l41.4 29.8c22.2-10.6 42.6-23.5 60.7-36.8l-63.8-46z"
                    style={{ fill: '#231f20' }} />
            </g>
            <path id="On_Hide_Elements" d="M470.9 423.3c5.9-8.2 4.1-19.7-4.2-25.6l-412-296.4c-8.2-5.9-19.7-4.1-25.6 4.2-5.9 8.2-4.1 19.7 4.2 25.6l412 296.4c8.2 5.9 19.7 4 25.6-4.2z"
                style={{ fill: '#231f20', opacity: passwordHidden ? '0%' : '100%', transform: passwordHidden ? 'scale(0)' : 'scale(1)', transitionDuration: '0.175s' }} />
        </svg>
    )
}