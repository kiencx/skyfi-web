"use client";

import { useEffect, useState } from 'react';

// Each travel eSIM tab (national / regional / global) remembers the last screen
// opened in it, e.g. the package picker of the chosen country, so switching
// tabs and coming back reopens that screen instead of the destination list.
const SCREENS_KEY = 'travelEsimTabScreens';
// Where the tab bar sat in the viewport when a tab was clicked, so the next
// screen opens with the tab bar in the same place instead of at the page top.
const TAB_BAR_KEY = 'travelEsimTabBar';

const readSession = (key, fallback) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const writeSession = (key, value) => {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (e.g. private mode): tabs fall back to their lists.
  }
};

export const travelEsimListHref = (tab, src) => `/travel-esim?type=${tab}&src=${src}`;

/**
 * Tab links for the travel eSIM list and package screens. Hrefs have no locale prefix.
 * `currentHref` is the current screen and `activeTab` the tab it belongs to;
 * each `src` (skyfi, vj) keeps its own screens.
 */
export default function useTravelEsimTabs({ src, activeTab, currentHref, tabBarRef }) {
  const [screens, setScreens] = useState({});

  useEffect(() => {
    const nextScreens = { ...readSession(SCREENS_KEY, {}), [`${src}:${activeTab}`]: currentHref };
    writeSession(SCREENS_KEY, nextScreens);
    setScreens(nextScreens);

    const tabBar = readSession(TAB_BAR_KEY, null);
    writeSession(TAB_BAR_KEY, null);
    if (tabBar?.href === currentHref && tabBarRef.current) {
      window.scrollTo(0, window.scrollY + tabBarRef.current.getBoundingClientRect().top - tabBar.top);
    }
  }, [src, activeTab, currentHref, tabBarRef]);

  // The active tab leads back to its list; the other tabs reopen their last screen.
  const tabHref = (tab) => (tab !== activeTab && screens[`${src}:${tab}`]) || travelEsimListHref(tab, src);

  const onTabClick = (tab) => {
    if (!tabBarRef.current) return;
    writeSession(TAB_BAR_KEY, { href: tabHref(tab), top: tabBarRef.current.getBoundingClientRect().top });
  };

  return { tabHref, onTabClick };
}
