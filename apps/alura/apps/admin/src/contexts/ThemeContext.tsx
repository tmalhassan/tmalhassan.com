import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface props {
    children: ReactNode;
}

export default function ThemeProvider({ children }: props) {
    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem("theme") as Theme | null;
        return storedTheme ?? "light";
    });

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    useEffect(() => {
        localStorage.setItem("theme", theme);
        document.body.setAttribute('theme', theme);
    }, [theme]);

    return (
        <ThemeContext value={{
            theme,
            toggleTheme
        }}>
            {children}
        </ThemeContext>
    )
}

// export const useTheme = () => useContext(ThemeContext);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};