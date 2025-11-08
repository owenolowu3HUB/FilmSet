import React, { useState, useEffect, useRef } from 'react';
import { PaintBrushIcon } from './icons';

interface ThemeSelectorProps {
  theme: string;
  setTheme: (theme: string) => void;
}

const themes = {
  'dark-mode': 'Dark Mode',
  'light-mode': 'Light Mode',
  'cyberpunk-neon': 'Cyberpunk Neon',
  'film-noir': 'Film Noir',
  'vintage-sepia': 'Vintage Sepia',
};

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ theme, setTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setIsOpen(false);
  };
  
  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label="Select Theme"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        className="p-2 rounded-full bg-bg-secondary hover:bg-surface border border-border-color text-text-secondary hover:text-accent transition-all duration-300 flex items-center gap-2"
      >
        <PaintBrushIcon className="w-5 h-5" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-border-color rounded-lg shadow-lg z-10 animate-fade-in-down">
          <div className="p-2">
            {Object.entries(themes).map(([key, name]) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                  theme === key
                    ? 'bg-accent text-bg-primary font-semibold'
                    : 'text-text-primary hover:bg-bg-secondary'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;