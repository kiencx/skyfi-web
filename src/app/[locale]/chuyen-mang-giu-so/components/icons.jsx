// Bộ icon dùng riêng cho landing chuyển mạng giữ số, vẽ lại theo Figma.

export const PhoneIcon = ({ className = "w-6 h-6 text-[#808080]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="6" y="2" width="12" height="20" rx="3" />
    <path d="M11 18h2" strokeLinecap="round" />
  </svg>
);

export const MailIcon = ({ className = "w-6 h-6 text-[#EC242A]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LocationIcon = ({ className = "w-6 h-6 text-[#EC242A]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const UserIcon = ({ className = "w-6 h-6 text-[#EC242A]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
  </svg>
);

export const DataUsageIcon = ({ className = "w-[22px] h-[22px] text-[#EC242A]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M5 20V10M12 20V4M19 20v-6" strokeLinecap="round" />
  </svg>
);

export const ChevronDownIcon = ({ className = "w-6 h-6 text-[#333]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRightIcon = ({ className = "w-6 h-6 text-[#EC242A]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShieldIcon = ({ className = "w-6 h-6 text-[#363F54]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2 4 5v6c0 4.97 3.4 9.43 8 11 4.6-1.57 8-6.03 8-11V5l-8-3Zm3.6 7.2-4.5 5a1 1 0 0 1-1.46.04L7.4 12.4a1 1 0 0 1 1.4-1.42l1.5 1.48 3.8-4.22a1 1 0 0 1 1.5 1.33Z" />
  </svg>
);

/** Dấu chấm than trong vòng tròn - dùng cho các box cảnh báo/ghi chú. */
export const ExclamationBadge = ({ tone = "danger", className = "" }) => {
  const tones = {
    danger: "bg-[#EC242A] text-white border-transparent",
    muted: "bg-transparent text-[#C3C3C3] border-[#C3C3C3]",
  };
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${tones[tone]} ${className}`}
    >
      <svg className="h-[14px] w-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 6v8" strokeLinecap="round" />
        <circle cx="12" cy="18" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
};

export const CheckIcon = ({ className = "w-6 h-6 text-[#EC242A]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.55 17.1 4.4 11.95l1.62-1.63 3.53 3.52 8.43-8.43 1.62 1.63L9.55 17.1Z" />
  </svg>
);

export const ExternalLinkIcon = ({ className = "w-6 h-6 text-[#EC242A]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 5h6v6M19 5l-8 8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 14v3.5A2.5 2.5 0 0 1 15.5 20h-9A2.5 2.5 0 0 1 4 17.5v-9A2.5 2.5 0 0 1 6.5 6H10" strokeLinecap="round" />
  </svg>
);

export const SendIcon = ({ className = "w-5 h-5 text-white" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.4 20.4 22 12 2.4 3.6v6.53L16 12 2.4 13.87v6.53Z" />
  </svg>
);

export const SignatureIcon = ({ className = "w-6 h-6 text-[#D93843]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 18c3.5 0 4-12 7-12s1.5 12 4.5 12c1.6 0 2.2-2.5 3.5-2.5S20 18 21 18" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21h18" strokeLinecap="round" />
  </svg>
);

/** Icon 5 bước hướng dẫn. */
export const StepIcons = {
  request: ({ className = "w-11 h-11 text-[#EC242A]" }) => (
      <svg width="34" height="40" viewBox="0 0 34 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.2396 1.0083V8.39409C21.2396 9.39433 21.6178 10.3555 22.2869 11.0641C22.9596 11.7735 23.8704 12.1716 24.8197 12.1712H32.8197" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M33 30.5493V12.9516C32.9833 12.0955 32.7967 11.2528 32.4522 10.4782C32.1077 9.70357 31.6131 9.01445 31.0005 8.45563L25.2599 2.86494C24.0056 1.66273 22.3727 0.999843 20.681 1.00617H9.59927C8.50966 0.962908 7.42267 1.14742 6.40041 1.54917C5.37815 1.95092 4.44064 2.56204 3.64145 3.34761C2.84293 4.12955 2.19842 5.07112 1.74508 6.11806C1.29173 7.165 1.03851 8.2966 1 9.44766V30.5493C1.039 31.7078 1.295 32.8466 1.75312 33.8994C2.21124 34.9522 2.86234 35.8982 3.66861 36.6822C4.47801 37.467 5.42572 38.0749 6.45741 38.4711C7.48909 38.8672 8.58446 39.0438 9.68073 38.9908H24.4007C25.4903 39.0341 26.5773 38.8495 27.5996 38.4478C28.6219 38.046 29.5594 37.4349 30.3585 36.6494C31.1571 35.8674 31.8016 34.9258 32.2549 33.8789C32.7083 32.832 32.9615 31.7004 33 30.5493Z" fill="#EC242A"/>
          <path d="M8.55782 11.06H14.8899M8.55782 20.0005H25.4422M8.55782 28.9411H25.4422M33 12.9516V30.5493C32.9615 31.7004 32.7083 32.832 32.2549 33.8789C31.8016 34.9258 31.1571 35.8674 30.3585 36.6494C29.5594 37.4349 28.6219 38.046 27.5996 38.4478C26.5773 38.8495 25.4903 39.0341 24.4007 38.9908H9.68073C8.58446 39.0438 7.48909 38.8672 6.45741 38.4711C5.42572 38.0749 4.47801 37.467 3.66861 36.6822C2.86234 35.8982 2.21124 34.9522 1.75312 33.8994C1.295 32.8466 1.039 31.7078 1 30.5493V9.44766C1.03851 8.2966 1.29173 7.165 1.74508 6.11806C2.19842 5.07112 2.84293 4.12955 3.64145 3.34761C4.44064 2.56204 5.37815 1.95092 6.40041 1.54917C7.42267 1.14742 8.50966 0.962908 9.59927 1.00617H20.681C22.3727 0.999843 24.0056 1.66273 25.2599 2.86494L31.0005 8.45563C31.6131 9.01445 32.1077 9.70357 32.4522 10.4782C32.7967 11.2528 32.9833 12.0955 33 12.9516Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
  ),
  review: ({ className = "w-11 h-11 text-[#EC242A]" }) => (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.8333 40.3333H31.1666" stroke="#EC242A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.66663 31.1666V7.33329C3.66663 6.36083 4.05293 5.4282 4.74057 4.74057C5.4282 4.05293 6.36083 3.66663 7.33329 3.66663H36.6666C37.6391 3.66663 38.5717 4.05293 39.2593 4.74057C39.947 5.4282 40.3333 6.36083 40.3333 7.33329V31.1666C40.3333 32.1391 39.947 33.0717 39.2593 33.7593C38.5717 34.447 37.6391 34.8333 36.6666 34.8333H7.33329C6.36083 34.8333 5.4282 34.447 4.74057 33.7593C4.05293 33.0717 3.66663 32.1391 3.66663 31.1666Z" fill="#EC242A" stroke="white"/>
          <path d="M16.5 19.2499L20.1667 22.9166L27.5 15.5833" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
  ),
  message: ({ className = "w-11 h-11 text-[#EC242A]" }) => (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M39.716 14.5407C38.752 12.2398 37.3495 10.1485 35.5867 8.38324C33.8292 6.61495 31.7415 5.20905 29.4422 4.24535C27.0867 3.25333 24.5559 2.74482 22 2.75004H21.9141C19.3145 2.76293 16.8008 3.27856 14.4332 4.29262C12.1536 5.2662 10.0855 6.6746 8.34455 8.4391C6.59886 10.2004 5.21243 12.2844 4.26251 14.575C3.27646 16.9571 2.77681 19.5123 2.79298 22.0903C2.80587 25.0723 3.51915 28.0329 4.85119 30.6797V37.211C4.85119 38.3024 5.73634 39.1875 6.82345 39.1875H13.3461C16.0053 40.5294 18.9398 41.2355 21.9184 41.25H22.0086C24.5781 41.25 27.066 40.7516 29.4121 39.7762C31.6998 38.824 33.7797 37.4345 35.5352 35.6856C37.3055 33.9282 38.6977 31.8743 39.6731 29.584C40.6828 27.2122 41.1985 24.6899 41.2113 22.086C41.2199 19.4692 40.7129 16.9297 39.716 14.5407ZM13.4235 24.0625C12.2891 24.0625 11.3652 23.1387 11.3652 22C11.3652 20.8614 12.2891 19.9375 13.4235 19.9375C14.5578 19.9375 15.4817 20.8614 15.4817 22C15.4817 23.1387 14.5621 24.0625 13.4235 24.0625ZM22 24.0625C20.8656 24.0625 19.9418 23.1387 19.9418 22C19.9418 20.8614 20.8656 19.9375 22 19.9375C23.1344 19.9375 24.0582 20.8614 24.0582 22C24.0582 23.1387 23.1344 24.0625 22 24.0625ZM30.5766 24.0625C29.4422 24.0625 28.5184 23.1387 28.5184 22C28.5184 20.8614 29.4422 19.9375 30.5766 19.9375C31.711 19.9375 32.6348 20.8614 32.6348 22C32.6348 23.1387 31.711 24.0625 30.5766 24.0625Z" fill="#EC242A"/>
      </svg>
  ),
  sim: ({ className = "w-11 h-11 text-[#EC242A]" }) => (
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <mask id="mask0_8447_125285" style={{maskType:"luminance"}} maskUnits="userSpaceOnUse" x="4" y="1" width="26" height="32">
              <path d="M5.66669 2.83337H23.2964L28.3334 7.98508V31.1667H5.66669V2.83337Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M23.375 18.4167H10.625V25.5001H23.375V18.4167Z" fill="black" stroke="black" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M10.625 8.5V12.75M14.875 8.5V12.75M19.125 8.5V12.75" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </mask>
          <g mask="url(#mask0_8447_125285)">
              <path d="M0 0H34V34H0V0Z" fill="#EC242A"/>
          </g>
      </svg>
  ),
  payment: ({ className = "w-11 h-11 text-[#EC242A]" }) => (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.1875 7.875C7.44702 7.875 5.77782 8.5664 4.54711 9.79711C3.3164 11.0278 2.625 12.697 2.625 14.4375V15.75H39.375V14.4375C39.375 12.697 38.6836 11.0278 37.4529 9.79711C36.2222 8.5664 34.553 7.875 32.8125 7.875H9.1875ZM39.375 18.375H2.625V27.5625C2.625 29.303 3.3164 30.9722 4.54711 32.2029C5.77782 33.4336 7.44702 34.125 9.1875 34.125H32.8125C34.553 34.125 36.2222 33.4336 37.4529 32.2029C38.6836 30.9722 39.375 29.303 39.375 27.5625V18.375ZM27.5625 26.25H32.8125C33.1606 26.25 33.4944 26.3883 33.7406 26.6344C33.9867 26.8806 34.125 27.2144 34.125 27.5625C34.125 27.9106 33.9867 28.2444 33.7406 28.4906C33.4944 28.7367 33.1606 28.875 32.8125 28.875H27.5625C27.2144 28.875 26.8806 28.7367 26.6344 28.4906C26.3883 28.2444 26.25 27.9106 26.25 27.5625C26.25 27.2144 26.3883 26.8806 26.6344 26.6344C26.8806 26.3883 27.2144 26.25 27.5625 26.25Z" fill="#EC242A"/>
      </svg>
  ),
};
