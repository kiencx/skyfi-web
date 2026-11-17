'use client';

import { forwardRef } from 'react';

// Icons from Figma (Update Homepage 17/11, node 12267:5394), recoloured with currentColor
// so the active tab is red and the others grey.
const IconNational = (props) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M30 14H28C27.9974 11.3486 26.9429 8.80665 25.0681 6.93186C23.1934 5.05707 20.6514 4.00265 18 4V2C21.1815 2.00371 24.2316 3.26918 26.4812 5.51881C28.7308 7.76844 29.9963 10.8185 30 14Z" />
    <path d="M26 14H24C23.9981 12.4093 23.3654 10.8842 22.2406 9.75941C21.1158 8.63459 19.5907 8.00185 18 8V6C20.1209 6.00265 22.1542 6.84635 23.6539 8.34607C25.1536 9.84579 25.9974 11.8791 26 14ZM16 28V24.96C17.3053 25.0953 18.6244 24.9698 19.8807 24.5908C21.137 24.2117 22.3054 23.5867 23.318 22.752C23.5177 22.5891 23.6811 22.3863 23.7979 22.1566C23.9147 21.9269 23.9821 21.6753 23.996 21.418C24.0083 21.1673 23.968 20.9168 23.8778 20.6826C23.7876 20.4484 23.6493 20.2356 23.472 20.058L18.414 15L21 12.414L19.586 11L17 13.586L11.942 8.527C11.7636 8.35084 11.5507 8.21346 11.3166 8.12346C11.0826 8.03346 10.8325 7.99279 10.582 8.004C10.3246 8.018 10.073 8.08563 9.84326 8.20256C9.61354 8.31948 9.41078 8.48313 9.248 8.683C7.88006 10.3507 7.09047 12.4174 6.99796 14.5724C6.90545 16.7274 7.51501 18.8542 8.735 20.633L6.28 28H2V30H30V28H16ZM10.68 10.094L21.906 21.32C20.3665 22.5143 18.4442 23.1058 16.4996 22.9835C14.555 22.8613 12.7219 22.0336 11.3441 20.6559C9.96638 19.2781 9.13873 17.445 9.01645 15.5004C8.89418 13.5558 9.48569 11.6335 10.68 10.094ZM14 28H8.387L10.263 22.373C11.3356 23.3601 12.6111 24.1007 14 24.543V28Z" />
  </svg>
);

const IconRegional = (props) => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <g transform="translate(1.876 1.666)">
      <path d="M14.933 20.7267C16.965 18.9053 22.1237 13.8173 22.1237 9C22.1237 6.87827 21.2808 4.84344 19.7805 3.34315C18.2803 1.84285 16.2454 1 14.1237 1C12.002 1 9.96712 1.84285 8.46683 3.34315C6.96654 4.84344 6.12369 6.87827 6.12369 9C6.12369 13.8173 11.2837 18.9053 13.3144 20.7267C13.5468 20.9042 13.8312 21.0004 14.1237 21.0004C14.4162 21.0004 14.7006 20.9042 14.933 20.7267Z" />
      <path d="M4.08902 18.3333H3.82635C3.53006 18.3333 3.2422 18.432 3.00824 18.6138C2.77428 18.7957 2.60754 19.0502 2.53435 19.3373L1.07169 25.1373C0.990053 25.434 0.977957 25.7454 1.03634 26.0475C1.09472 26.3496 1.222 26.6341 1.40829 26.879C1.59458 27.1238 1.83484 27.3224 2.11039 27.4593C2.38595 27.5961 2.68936 27.6675 2.99702 27.668L25.249 27.6667C25.5568 27.6666 25.8603 27.5954 26.1361 27.4588C26.4119 27.3222 26.6524 27.1239 26.8389 26.8791C27.0255 26.6344 27.1531 26.3499 27.2117 26.0478C27.2703 25.7457 27.2585 25.4341 27.177 25.1373L25.713 19.3373C25.6398 19.0502 25.4731 18.7957 25.2391 18.6138C25.0052 18.432 24.7173 18.3333 24.421 18.3333H24.1584" />
      <path d="M14.1237 11.6667C15.5964 11.6667 16.7904 10.4728 16.7904 9C16.7904 7.52724 15.5964 6.33333 14.1237 6.33333C12.6509 6.33333 11.457 7.52724 11.457 9C11.457 10.4728 12.6509 11.6667 14.1237 11.6667Z" />
    </g>
  </svg>
);

const IconGlobal = (props) => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <g transform="translate(1.667 1.667)">
      <path d="M14.3333 27.6667C21.6971 27.6667 27.6667 21.6971 27.6667 14.3333C27.6667 6.96954 21.6971 1 14.3333 1C6.96954 1 1 6.96954 1 14.3333C1 21.6971 6.96954 27.6667 14.3333 27.6667Z" />
      <path d="M9 14.3333C9 21.6971 11.3878 27.6667 14.3333 27.6667C17.2789 27.6667 19.6667 21.6971 19.6667 14.3333C19.6667 6.96954 17.2789 1 14.3333 1C11.3878 1 9 6.96954 9 14.3333Z" />
      <path d="M1 14.3333H27.6667" />
    </g>
  </svg>
);

const ICONS = { national: IconNational, regional: IconRegional, global: IconGlobal };

/**
 * National / regional / global tab bar (Figma node 12267:5393): icon + label tabs split by
 * thin dividers over a grey rule; the active tab is red with a red underline.
 * `renderLink(tab, { className, children })` renders the router link for a tab.
 */
const TravelEsimTabBar = forwardRef(function TravelEsimTabBar({ tabs, isActive, renderLink, ariaLabel, className = '' }, ref) {
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      className={`w-full overflow-x-auto border-b-2 border-[#d9d9d9] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div className="flex w-max min-w-full items-center gap-1 min-[390px]:gap-1.5 min-[420px]:gap-2 sm:gap-4 md:gap-6 lg:gap-9">
        {tabs.map((tab, index) => {
          const active = isActive(tab.id);
          const Icon = ICONS[tab.id];
          return (
            <div key={tab.id} className="flex shrink-0 items-center gap-1 min-[390px]:gap-1.5 min-[420px]:gap-2 sm:gap-4 md:gap-6 lg:gap-9">
              {index > 0 && <span aria-hidden="true" className="h-4 w-px shrink-0 bg-[#d9d9d9] sm:h-6 lg:h-8" />}
              {renderLink(tab, {
                className: `relative -mb-[2px] flex h-11 items-center gap-1 whitespace-nowrap font-inter text-[12px] min-[390px]:text-[13px] min-[420px]:text-[14px] font-semibold transition-colors sm:h-12 sm:gap-2 sm:text-[17px] md:text-[20px] lg:text-[28px] ${
                  active ? 'text-[#de2710]' : 'text-[#a5a5a4] hover:text-[#666]'
                }`,
                'aria-current': active ? 'page' : undefined,
                children: (
                  <>
                    {Icon && <Icon className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 ${tab.id === 'national' && active ? 'text-[#ed1b2f]' : ''}`} />}
                    {tab.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-1 rounded-full bg-[#ed1b2f] ${active ? '' : 'hidden'}`}
                    />
                  </>
                ),
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
});

export default TravelEsimTabBar;
