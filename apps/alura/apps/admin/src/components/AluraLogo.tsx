import aluraLogo from 'shared/assets/logo-light.svg';
import aluraWhiteLogo from 'shared/assets/logo-dark.svg';
import { useTheme } from '../contexts/ThemeContext';

export default function AluraLogo() {
    const { theme } = useTheme();

    return (
        <div className="logos-container">
            <img src={aluraLogo} alt="Alura logo" data-isactive={theme === 'light'} />
            <img src={aluraWhiteLogo} alt="Alura logo" data-isactive={theme === 'dark'} />
        </div>
    );
}