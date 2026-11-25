"use client";

import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Link } from '../../i18n/navigation';
import { useUserState } from '../stores/user';
import LanguageSwitcher from "./LanguageSwitcher";
import UserDropdown from "./UserDropdown";

export default function Header() {
  const router = useRouter();
  const userButtonRef = useRef( null );
  const t = useTranslations();
  const [ isUserDropdownOpen, setIsUserDropdownOpen ] = useState( false );
  const [ userHoverTimeout, setUserHoverTimeout ] = useState( null );
  const { isLoggedIn } = useUserState();

  const closeUserDropdown = () => {
    setIsUserDropdownOpen( false );
    if (userHoverTimeout) {
      clearTimeout(userHoverTimeout);
      setUserHoverTimeout(null);
    }
  };

  const handleUserHover = () => {
    if (isLoggedIn && window.innerWidth >= 1024) {
      // Clear any existing timeout
      if (userHoverTimeout) {
        clearTimeout(userHoverTimeout);
        setUserHoverTimeout(null);
      }
      setIsUserDropdownOpen( true );
    }
  };

  const handleUserLeave = () => {
    if (window.innerWidth >= 1024) {
      // Set a timeout to close the dropdown
      const timeout = setTimeout(() => {
        setIsUserDropdownOpen( false );
      }, 150);
      setUserHoverTimeout(timeout);
    }
  };

  const handleDropdownHover = () => {
    if (window.innerWidth >= 1024) {
      // Clear the timeout when hovering over dropdown
      if (userHoverTimeout) {
        clearTimeout(userHoverTimeout);
        setUserHoverTimeout(null);
      }
    }
  };



  const handleUserClick = () => {
    if (isLoggedIn) {
      if (window.innerWidth < 1024) {
        // On mobile/tablet, toggle dropdown on click
        setIsUserDropdownOpen( !isUserDropdownOpen );
      }
    }
  };

  return (
    <header className="w-full flex sticky top-0 left-0 z-50 items-center justify-between px-4 sm:px-6 lg:px-20 h-[80px] bg-white border-b border-[#F1F1F1] " style={ { fontFamily: 'Inter' } }>
      {/* Logo */ }
      <div className="flex items-center cursor-pointer" onClick={ () => router.push( '/' ) }>
        <Image src="/assets/logo.svg" alt="SkyFi Logo" width={ 120 } height={ 40 } priority className="max-w-[100px] sm:max-w-[120px]" />
      </div>

      {/* Actions - Icons only on mobile/tablet, text+icons on desktop */ }
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 justify-end">
        {/* User/Login - Icon only on mobile and tablet, with text on desktop */ }
        <div
          className="flex items-center gap-1 p-2 lg:px-3 lg:py-2 border border-neutral-300 cursor-pointer hover:bg-gray-50 rounded-lg relative"
          ref={ userButtonRef }
          onMouseEnter={ handleUserHover }
          onMouseLeave={ handleUserLeave }
          onClick={ handleUserClick }
        >
          { !isLoggedIn ? (
             // Same entry as "Truy cập SIM của bạn": email or ICCID login (self-care), not the legacy email-only /login.
             <Link href={'/login-sim'} className="flex items-center gap-1">
              <Image src="/assets/user-circle.svg" alt="User" width={ 24 } height={ 24 } />
              <span className="hidden xl:inline text-[#333]  font-normal" style={ { fontFamily: 'Inter' } }>
                { t( 'common.login' ) }
              </span>
             </Link>

          ) : (
              <div className="flex items-center gap-1">
                <Image src="/assets/user-circle.svg" alt="User" width={ 24 } height={ 24 } />
                <span className="hidden xl:inline text-[#333]   font-normal" style={ { fontFamily: 'Inter' } }>
                  { t( 'common.myEssim' ) }
                </span>
                {/* Dropdown arrow for visual indication on larger screens */}
                <svg
                  className="hidden lg:block w-4 h-4 text-gray-400 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
          )}

          {/* User Dropdown */ }
          { isLoggedIn && (
            <UserDropdown
              isOpen={ isUserDropdownOpen }
              closeDropdown={ closeUserDropdown }
              userButtonRef={ userButtonRef }
              onMouseEnter={ handleDropdownHover }

            />
          ) }
        </div>

        {/* Language Switcher - Hidden on small mobile, icon only on tablet, with text on desktop */ }
        <LanguageSwitcher />
      </div>
    </header>
  );
}
