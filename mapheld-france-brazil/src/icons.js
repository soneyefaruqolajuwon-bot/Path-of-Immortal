/* Mapheld vector icons — original flat designs, each drawn in a 0..100 box.
   Classic script: sets window.ICONS (also loaded by scripts/build-geo.mjs). */
(function (root) {
  const GOLD = '#F5C542';
  const INK = '#0F2F3A';

  const ICONS = {
    /* Euro symbol inside a gold-ringed disc */
    euro: () => `
      <circle cx="50" cy="50" r="46" fill="${INK}" stroke="${GOLD}" stroke-width="4"/>
      <path d="M68 30.5 A25 25 0 1 0 68 69.5" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
      <path d="M22 44.5 H57 M22 56 H53" stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round"/>`,

    /* French tricolour badge (round) */
    flag: () => `
      <defs><clipPath id="flagClip"><circle cx="50" cy="50" r="42"/></clipPath></defs>
      <circle cx="50" cy="50" r="46" fill="#FFFFFF"/>
      <g clip-path="url(#flagClip)">
        <rect x="0" y="0" width="36" height="100" fill="#0055A4"/>
        <rect x="36" y="0" width="28" height="100" fill="#FFFFFF"/>
        <rect x="64" y="0" width="36" height="100" fill="#EF4135"/>
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="${GOLD}" stroke-width="4"/>`,

    /* Passport booklet */
    passport: () => `
      <rect x="22" y="12" width="56" height="76" rx="7" fill="#20335F"/>
      <rect x="22" y="12" width="9" height="76" rx="3" fill="#182849"/>
      <circle cx="54" cy="42" r="13" fill="none" stroke="${GOLD}" stroke-width="3.2"/>
      <path d="M41 42 H67 M54 29 C47 36 47 48 54 55 C61 48 61 36 54 29" fill="none" stroke="${GOLD}" stroke-width="2.4"/>
      <rect x="38" y="66" width="32" height="4.5" rx="2" fill="${GOLD}"/>
      <rect x="43" y="74" width="22" height="3.5" rx="1.75" fill="${GOLD}" opacity="0.7"/>`,

    /* Ballot box with a ticked paper */
    ballot: () => `
      <rect x="30" y="10" width="40" height="40" rx="4" fill="#FFFFFF" transform="rotate(-6 50 30)"/>
      <path d="M38 30 L47 39 L63 20" fill="none" stroke="#2F8F5B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" transform="rotate(-6 50 30)"/>
      <rect x="14" y="44" width="72" height="46" rx="6" fill="#2B6577"/>
      <rect x="14" y="44" width="72" height="10" rx="4" fill="#367C90"/>
      <rect x="32" y="47" width="36" height="4.5" rx="2.2" fill="${INK}"/>
      <rect x="40" y="66" width="20" height="10" rx="2" fill="${GOLD}"/>`,

    /* Sleek rocket, pointing up, nozzle at bottom (flame drawn separately) */
    rocket: () => `
      <path d="M50 4 C62 16 66 34 66 52 L66 74 L34 74 L34 52 C34 34 38 16 50 4 Z" fill="#F4F4F0"/>
      <path d="M50 4 C62 16 66 34 66 52 L66 74 L50 74 L50 4 Z" fill="#D9DAD4"/>
      <path d="M50 4 C55 9 58.5 14 61 20 L39 20 C41.5 14 45 9 50 4 Z" fill="${GOLD}"/>
      <circle cx="50" cy="40" r="7.5" fill="#1E4D5C" stroke="#8FB7C2" stroke-width="2.5"/>
      <path d="M34 54 L20 72 L20 82 L34 74 Z" fill="${GOLD}"/>
      <path d="M66 54 L80 72 L80 82 L66 74 Z" fill="#D9A82E"/>
      <rect x="40" y="74" width="20" height="8" rx="2" fill="#5B6168"/>`,

    flame: () => `
      <path d="M38 0 C38 18 44 30 50 46 C56 30 62 18 62 0 Z" fill="#F5C542"/>
      <path d="M43 0 C43 12 46 20 50 32 C54 20 57 12 57 0 Z" fill="#FFF3C4"/>`,

    /* Map pin */
    pin: () => `
      <path d="M50 96 C50 96 18 60 18 38 A32 32 0 0 1 82 38 C82 60 50 96 50 96 Z" fill="${GOLD}"/>
      <circle cx="50" cy="38" r="13" fill="${INK}"/>`,

    check: () => `<path d="M24 52 L42 70 L76 32" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`,
    cross: () => `<path d="M28 28 L72 72 M72 28 L28 72" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>`,

    /* Mapheld logo mark: a folded map with a pin */
    logoMark: () => `
      <path d="M8 26 L34 16 L66 26 L92 16 L92 78 L66 88 L34 78 L8 88 Z" fill="#8A855C"/>
      <path d="M34 16 L34 78 L66 88 L66 26 Z" fill="#A6A073"/>
      <path d="M8 26 L34 16 L34 78 L8 88 Z" fill="#7A754F"/>
      <path d="M58 62 C58 62 42 45 42 34 A16 16 0 0 1 74 34 C74 45 58 62 58 62 Z" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
      <circle cx="58" cy="34" r="6" fill="${INK}"/>`
  };

  root.ICONS = ICONS;
  root.ICON_COLORS = { GOLD, INK };
})(typeof window !== 'undefined' ? window : globalThis);
