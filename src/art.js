import { CREATURES, TYPES } from './data.js';

let artCounter = 0;

export function icon(name, cls = '') {
  const paths = {
    flame: '<path d="M12 2c1.4 3.4-.9 4.6-.9 7.1 0 1.6 1 2.7 2.5 2.7 1.8 0 2.7-1.5 2.7-3.2 2.4 1.8 3.7 4 3.7 6.6A8 8 0 0 1 4 15.2C4 10.8 7.7 8.4 8.9 5c.3 2.2 1.4 3.2 2.4 3.4C11.2 6 11.4 4 12 2Z"/>',
    leaf: '<path d="M20 4C12 3 5 7 4 15c-.3 2.5.8 4.2 2.2 5 2-6 5.3-9 9.8-11-4 3-6.8 6-8 11 7.4 1.3 12-4.2 12-16Z"/>',
    drop: '<path d="M12 2.8S5.4 10.1 5.4 14.5a6.6 6.6 0 0 0 13.2 0C18.6 10.1 12 2.8 12 2.8Z"/><path d="M9 15.5c0 1.7 1.2 3 2.8 3.2" fill="none"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 1.5v2.8M12 19.7v2.8M1.5 12h2.8M19.7 12h2.8M4.6 4.6l2 2M17.4 17.4l2 2M19.4 4.6l-2 2M6.6 17.4l-2 2" fill="none"/>',
    moon: '<path d="M19.7 14.6A8.5 8.5 0 0 1 9.4 4.3 8.5 8.5 0 1 0 19.7 14.6Z"/>',
    gem: '<path d="m12 2.5 7.5 7-7.5 12-7.5-12 7.5-7Z"/><path d="M4.5 9.5h15M12 2.5v19M7.5 9.5 12 21.5l4.5-12" fill="none"/>',
    bolt: '<path d="M13.4 1.5 4 13.3h6.4L9.2 22.5l9.8-12.7h-6.5l.9-8.3Z"/>',
    snow: '<path d="M12 2v20M3.3 6.7l17.4 10.6M20.7 6.7 3.3 17.3M8.2 4.6 12 8l3.8-3.4M8.2 19.4 12 16l3.8 3.4" fill="none"/>',
    mask: '<path d="M4 5.5C7 3.8 9.4 3.5 12 6c2.6-2.5 5-2.2 8-.5v7.3c0 5.2-3.7 8.7-8 9.7-4.3-1-8-4.5-8-9.7V5.5Z"/><path d="M8 10.2c.8-1 1.9-1 2.7 0M13.3 10.2c.8-1 1.9-1 2.7 0M9 15.3c1.9 1.2 4.1 1.2 6 0" fill="none"/>',
    claw: '<path d="M5 3.5c2.8 4.3 3.6 8.7 3.1 15.2M11.4 3c2 4.6 2.4 9.3 1.6 15.7M18 4.2c1.1 4.5.8 9.1-.8 13.9" fill="none"/>',
    shield: '<path d="M12 2.5 20 6v5.8c0 4.7-3.2 8-8 9.7-4.8-1.7-8-5-8-9.7V6l8-3.5Z"/><path d="M12 7v8" fill="none"/>',
    orb: '<circle cx="12" cy="12" r="8.2"/><path d="M5.8 9.6c4.4 2.1 7.8 2.1 12.4 0M6.4 15.1c3.6-1.5 7.6-1.5 11.2 0" fill="none"/><circle cx="9.5" cy="8.2" r="1.1" fill="currentColor" stroke="none"/>',
    dagger: '<path d="m4 20 4.3-1 10.4-10.4-2.2-2.2L6 16.8 4 20ZM15.7 4.4l1.3-1.3 3.9 3.9-1.3 1.3" /><path d="m7.4 14.1 2.5 2.5" fill="none"/>',
    smoke: '<path d="M4 14.5c2.7 0 3.1-2.2 4.9-2.2 1.5 0 2.1 1.1 2.1 2.2 0 2.2 1.5 3.5 3.4 3.5 1.7 0 2.8-1 2.8-2.3 0-1.2-.8-2-1.9-2.2 2.6-.3 4.7-1.6 4.7-3.8 0-2.4-1.9-3.8-4.4-3.8-2.2 0-3.5 1.1-4.4 2.3-.7-1.2-1.8-1.9-3.1-1.9C6.2 6.3 4 8 4 10.3c0 1.6.9 2.8 2.2 3.4" fill="none"/>',
    snare: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c-2.4 3-2.4 5.6 0 8.5s2.4 5.6 0 8.5M3.5 12c3-2.4 5.6-2.4 8.5 0s5.6 2.4 8.5 0" fill="none"/>',
    heart: '<path d="M12 21s-8-4.8-8-11a4.7 4.7 0 0 1 8-3.4A4.7 4.7 0 0 1 20 10c0 6.2-8 11-8 11Z"/>',
    eye: '<path d="M2.2 12S5.8 5.3 12 5.3 21.8 12 21.8 12 18.2 18.7 12 18.7 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="3.2"/>',
    fang: '<path d="M4 5c4.6 1.2 8.7 1.2 16 0-1.2 3.5-2.9 5.5-4.2 6.2-1.2.7-2.5.2-3.8-1.2C10.7 8.5 9.3 7 7.8 7.5 6.4 8 5 9.8 4 12V5Z"/>',
    swords: '<path d="m3 3 7.5 7.5M3 3v4.2M3 3h4.2M21 3l-7.5 7.5M21 3v4.2M21 3h-4.2M7.5 16.5l4.5 4.5M14.5 18l4-4M5 19.5 8 16.5" fill="none"/>',
    paw: '<ellipse cx="12" cy="16" rx="4.3" ry="3.7"/><ellipse cx="5.8" cy="11.3" rx="2.1" ry="2.7"/><ellipse cx="9.5" cy="7.9" rx="2.1" ry="2.9"/><ellipse cx="14.5" cy="7.9" rx="2.1" ry="2.9"/><ellipse cx="18.2" cy="11.3" rx="2.1" ry="2.7"/>',
    crown: '<path d="m3 8 5 3 4-7 4 7 5-3-2 11H5L3 8Z"/><path d="M5 19h14" fill="none"/>',
    fire: '<path d="M12 2c1.5 3.5-.5 5 1.6 6.6C16.2 10.5 18 12 18 15a6 6 0 0 1-12 0c0-3 1.6-4.6 3.2-6.3C10.5 7.3 11.7 5.4 12 2Z"/><path d="M9 16.5c0 2.2 1.4 3.4 3 3.7" fill="none"/>',
    bag: '<path d="M5 8h14l1 12H4L5 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2M9.5 12.5h5" fill="none"/>',
    rune: '<path d="M12 2.5 19.5 7v10L12 21.5 4.5 17V7L12 2.5Z"/><path d="m8.5 9 3.5 7 3.5-7M12 16v3.3" fill="none"/>',
    up: '<path d="m5 15 7-7 7 7" fill="none"/><path d="M12 8v12" fill="none"/>',
    down: '<path d="m5 9 7 7 7-7" fill="none"/><path d="M12 4v12" fill="none"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    thorn: '<path d="M12 2c2 5 5 5.7 8 7-4 1.7-5.6 4-6 9-2.2-3.6-4.7-3.5-8-3 2.6-3 3.6-6.1 2-9.3 2.2.9 3.3.3 4-3.7Z"/><path d="M12 12v9" fill="none"/>',
    stun: '<path d="m12 2 1.5 4.6L18 5l-1.8 4.3L21 12l-4.8 2.7L18 19l-4.5-1.6L12 22l-1.5-4.6L6 19l1.8-4.3L3 12l4.8-2.7L6 5l4.5 1.6L12 2Z"/>',
    check: '<path d="m4 12.5 5 5L20 6.5" fill="none"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M9 8.5h4.2a2.3 2.3 0 0 1 0 4.6H9m3.2 0V18M9 6.7v10.6" fill="none"/>',
    skull: '<path d="M12 2.5c-5 0-8 3.3-8 7.8 0 2.7 1.2 4.5 3 5.6v3.6h10v-3.6c1.8-1.1 3-2.9 3-5.6 0-4.5-3-7.8-8-7.8Z"/><circle cx="8.6" cy="10.3" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.4" cy="10.3" r="1.5" fill="currentColor" stroke="none"/>',
    star: '<path d="m12 2 2.8 6.1 6.7.8-4.9 4.5 1.3 6.6L12 16.8 6.1 20l1.3-6.6-4.9-4.5 6.7-.8L12 2Z"/>',
    arrow: '<path d="M4 12h16M14 6l6 6-6 6" fill="none"/>',
    cards: '<rect x="3" y="5" width="10" height="14" rx="1.5" transform="rotate(-8 8 12)"/><rect x="10" y="4" width="10" height="15" rx="1.5" transform="rotate(6 15 12)"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" fill="none"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11" fill="none"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="m16 9 5 6M21 9l-5 6" fill="none"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.8 2.1c-1 .6-1.5 1.1-1.5 2.4M12 17.2v.1" fill="none"/>',
    close: '<path d="M5 5l14 14M19 5 5 19" fill="none"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16" fill="none"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16" fill="none"/>',
  };
  return `<svg viewBox="0 0 24 24" class="icon ${cls}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.rune}</svg>`;
}

function defs(u, type, creature) {
  const t = TYPES[type];
  return `<defs>
    <radialGradient id="${u}-aura" cx="50%" cy="55%" r="50%">
      <stop offset="0" stop-color="${t.color}" stop-opacity=".36"/>
      <stop offset=".6" stop-color="${t.color}" stop-opacity=".09"/>
      <stop offset="1" stop-color="${t.color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${u}-body" x1=".2" y1="0" x2=".8" y2="1">
      <stop offset="0" stop-color="${t.soft}"/>
      <stop offset=".35" stop-color="${t.color}"/>
      <stop offset="1" stop-color="${t.deep}"/>
    </linearGradient>
    <linearGradient id="${u}-deep" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.color}"/>
      <stop offset="1" stop-color="${t.deep}"/>
    </linearGradient>
    <linearGradient id="${u}-belly" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.soft}" stop-opacity=".98"/>
      <stop offset="1" stop-color="${t.soft}" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="${u}-wing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.soft}" stop-opacity=".9"/>
      <stop offset=".55" stop-color="${t.color}" stop-opacity=".68"/>
      <stop offset="1" stop-color="${t.deep}" stop-opacity=".4"/>
    </linearGradient>
    <filter id="${u}-blur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <filter id="${u}-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="${u}-orb" cx="38%" cy="32%" r="70%">
      <stop offset="0" stop-color="#fffdf1"/>
      <stop offset=".32" stop-color="${t.soft}"/>
      <stop offset=".72" stop-color="${t.color}"/>
      <stop offset="1" stop-color="${t.deep}"/>
    </radialGradient>
    ${creature?.elite || creature?.boss ? `<radialGradient id="${u}-elite"><stop offset="0" stop-color="${t.color}" stop-opacity=".5"/><stop offset="1" stop-color="${t.color}" stop-opacity="0"/></radialGradient>` : ''}
  </defs>`;
}

function eyes(u, x1 = 89, x2 = 111, y = 98, small = false) {
  const rx = small ? 4.2 : 5.6;
  return `<g class="beast-eyes">
    <ellipse cx="${x1}" cy="${y}" rx="${rx}" ry="${rx * 1.18}" fill="#0b1518"/>
    <ellipse cx="${x2}" cy="${y}" rx="${rx}" ry="${rx * 1.18}" fill="#0b1518"/>
    <circle cx="${x1 + 1.5}" cy="${y - 1.7}" r="${small ? 1.4 : 2}" fill="#fff7dc"/>
    <circle cx="${x2 + 1.5}" cy="${y - 1.7}" r="${small ? 1.4 : 2}" fill="#fff7dc"/>
    <circle cx="${x1 - 1}" cy="${y + 1.3}" r="${small ? .8 : 1}" fill="${TYPES.ember.color}" opacity=".9"/>
    <circle cx="${x2 - 1}" cy="${y + 1.3}" r="${small ? .8 : 1}" fill="${TYPES.ember.color}" opacity=".9"/>
  </g>`;
}

function legs(u, y = 160, color = 'body') {
  return `<g fill="url(#${u}-${color})" stroke="#0d191b" stroke-width="2.5">
    <rect x="72" y="${y}" width="15" height="28" rx="7.5"/>
    <rect x="132" y="${y}" width="15" height="28" rx="7.5"/>
  </g><g fill="${TYPES.stone.deep}" opacity=".45">
    <ellipse cx="79.5" cy="${y + 28}" rx="9" ry="3.2"/><ellipse cx="139.5" cy="${y + 28}" rx="9" ry="3.2"/>
  </g>`;
}

function bodyWrap(u, inner) {
  return `<g stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

function emberkit(u) {
  return bodyWrap(u, `
    <path d="M142 139c19-1 31-12 35-27 3-12-7-21-16-15 7-15-7-26-20-16 1-14-14-20-20-8-5-11-18-5-15 8-12-2-17 13-7 20-10 4-9 19 4 21-4 10 7 18 18 13 5 10 16 10 21 4Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <path d="M147 133c12-2 20-10 23-20-5 0-9 2-13 6 5-9-1-15-9-10-1-7-8-10-13-4-4-5-11-2-10 5" fill="url(#${u}-belly)" opacity=".6"/>
    <ellipse cx="102" cy="152" rx="43" ry="36" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <ellipse cx="101" cy="158" rx="25" ry="24" fill="url(#${u}-belly)" stroke="none"/>
    <path d="M77 66 64 35l28 21M123 66l16-30-29 20" fill="url(#${u}-deep)" stroke="#0d191b" stroke-width="3"/>
    <path d="m72 61-5-16 13 10M129 61l6-16-14 10" fill="${TYPES.ember.soft}" opacity=".7"/>
    <ellipse cx="99" cy="101" rx="39" ry="34" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M67 94c7 19 15 29 30 33 14-3 23-13 31-31-9 9-17 14-31 14-13 0-21-5-30-16Z" fill="url(#${u}-belly)" opacity=".92"/>
    ${eyes(u, 86, 112, 98)}
    <path d="M97 111c2.5 2 4.2 2 6.2 0" fill="none" stroke="#0d191b" stroke-width="2.4"/>
    <path d="m101 114 4 2.5-4 2-4-2Z" fill="#2c1a1a" stroke="none"/>
    <path d="M90 122c4 3 8 4 12 4" fill="none" stroke="#0d191b" stroke-width="2" opacity=".45"/>
    <path d="M100 75l5 7-5 7-5-7Z" fill="${TYPES.lumen.color}" stroke="#0d191b" stroke-width="1.6"/>
    <path d="M71 150c-7 7-10 16-8 21 4 2 12-2 17-9M133 150c7 7 10 16 8 21-4 2-12-2-17-9" fill="url(#${u}-deep)" stroke="#0d191b" stroke-width="2.8"/>
    <path d="M61 170c11 6 25 8 40 8s29-2 40-8" fill="none" stroke="${TYPES.ember.color}" stroke-width="1.5" opacity=".22"/>
  `);
}

function mossprig(u) {
  return bodyWrap(u, `
    <path d="M83 67C74 50 71 36 75 23M83 52c-12-5-18-13-19-22M82 45c-9-9-11-17-9-26M118 66c7-16 9-30 5-43M118 51c11-7 16-15 16-25M120 44c10-10 12-18 10-27" fill="none" stroke="${TYPES.verdant.deep}" stroke-width="5"/>
    <path d="M83 67C74 50 71 36 75 23M118 66c7-16 9-30 5-43" fill="none" stroke="${TYPES.verdant.color}" stroke-width="2.2"/>
    <path d="M58 28c-8-7-13-8-18-3 6 6 11 8 18 3ZM126 24c7-8 13-9 19-5-5 7-11 9-19 5ZM71 20c-3-9-8-13-14-12 2 8 6 12 14 12Z" fill="${TYPES.verdant.color}" stroke="#0d191b" stroke-width="2"/>
    <ellipse cx="106" cy="158" rx="43" ry="32" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M82 122c-6-25-2-43 22-48 19-4 31 9 29 31-2 21-11 34-26 38-10-2-20-9-25-21Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <ellipse cx="107" cy="100" rx="30" ry="27" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <path d="M88 82c-1-14 3-22 11-22 7 0 11 8 8 21M120 82c3-13 7-19 14-17 6 2 5 11 1 20" fill="${TYPES.verdant.deep}" stroke="#0d191b" stroke-width="2.5"/>
    <path d="M93 82c2-8 4-12 6-12M125 80c3-8 5-10 7-10" fill="none" stroke="${TYPES.verdant.soft}" stroke-width="2"/>
    <path d="M84 104c9 16 17 23 27 24 10-2 17-10 24-26-8 9-16 13-25 13-10 0-18-4-26-11Z" fill="url(#${u}-belly)" opacity=".85"/>
    ${eyes(u, 94, 119, 99, true)}
    <path d="m106 111 4 3-4 3-4-3Z" fill="#20362b" stroke="#0d191b" stroke-width="1.3"/>
    <path d="M98 121c6 3 11 3 17 0" fill="none" stroke="#0d191b" stroke-width="2"/>
    <g fill="${TYPES.lumen.color}" opacity=".85" stroke="#0d191b" stroke-width="1">
      <circle cx="82" cy="145" r="3"/><circle cx="126" cy="137" r="2.4"/><circle cx="140" cy="157" r="2.7"/><circle cx="105" cy="166" r="2.2"/>
    </g>
    <path d="M74 172c-11-4-17-12-17-20 5 7 11 11 20 11" fill="${TYPES.verdant.color}" stroke="#0d191b" stroke-width="2"/>
    <path d="M69 171c-2 9 2 14 9 17M87 177c0 7 2 12 6 15M144 174c-1 8 1 13 5 16" fill="none" stroke="${TYPES.verdant.deep}" stroke-width="4" stroke-linecap="round"/>
  `);
}

function tidefin(u) {
  return bodyWrap(u, `
    <path d="M151 153c19 2 35-8 42-27-4 2-7 4-9 8 0-11-5-19-14-21 4 5 5 10 3 15-5-6-11-8-17-4" fill="url(#${u}-wing)" stroke="#0d191b" stroke-width="3"/>
    <ellipse cx="107" cy="158" rx="47" ry="28" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <ellipse cx="108" cy="162" rx="31" ry="18" fill="url(#${u}-belly)" opacity=".85"/>
    <path d="M57 130c-8-20-2-37 19-45 19-7 37 4 38 24 1 17-9 30-26 34-14 4-25 0-31-13Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M71 97c-8-8-17-9-22-3 4 8 11 12 20 10M101 83c-1-11 3-18 10-18 7 1 9 9 5 20" fill="${TYPES.tide.deep}" stroke="#0d191b" stroke-width="2.5"/>
    <ellipse cx="82" cy="113" rx="32" ry="28" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <path d="M56 111c8 16 17 23 29 24 12-2 20-10 26-26-7 8-15 13-26 13-12 0-21-4-29-11Z" fill="url(#${u}-belly)" opacity=".92"/>
    ${eyes(u, 71, 96, 107)}
    <path d="m84 120 4 3-4 3-4-3Z" fill="#1b343c" stroke="#0d191b" stroke-width="1.3"/>
    <path d="M76 132c6 3 11 3 17 0" fill="none" stroke="#0d191b" stroke-width="2"/>
    <g stroke="#0d191b" stroke-width="1.2" opacity=".55">
      <path d="M58 124c-11-2-18 1-23 7M59 130c-10 1-17 5-20 11M109 124c11-2 17 1 21 7" fill="none"/>
    </g>
    <path d="M91 142c10 3 18 3 26 0" fill="none" stroke="${TYPES.lumen.color}" stroke-width="2.5"/>
    <g fill="${TYPES.tide.soft}" stroke="#0d191b" stroke-width="1">
      <circle cx="103" cy="143" r="2"/><circle cx="112" cy="144" r="2.3"/><circle cx="120" cy="142" r="1.8"/>
    </g>
    <path d="M72 179c-3 7-1 12 3 16M92 183c-1 6 1 10 5 13M135 181c1 6 3 10 6 12" fill="none" stroke="${TYPES.tide.deep}" stroke-width="4" stroke-linecap="round"/>
    <path d="M36 153c-9-8-11-18-6-28M29 137c-4-3-6-7-5-11" fill="none" stroke="${TYPES.tide.color}" stroke-width="2" opacity=".4"/>
  `);
}

function glimmerbat(u) {
  return bodyWrap(u, `
    <path d="M101 101C80 74 55 68 27 78c13 5 15 14 11 25 8-3 13-1 16 7 2-9 9-13 19-10-2-11 8-17 20-13 3 4 5 8 8 14Z" fill="url(#${u}-wing)" stroke="#0d191b" stroke-width="3"/>
    <path d="M120 101c21-27 46-33 74-23-13 5-15 14-11 25-8-3-13-1-16 7-2-9-9-13-19-10 2-11-8-17-20-13-3 4-5 8-8 14Z" fill="url(#${u}-wing)" stroke="#0d191b" stroke-width="3"/>
    <g opacity=".55" stroke="${TYPES.lumen.soft}" stroke-width="1.2" fill="none">
      <path d="M90 89 62 82l-14 9 24 2 18 7M37 95l-3 6 8 3M132 89l27-7 14 9-24 2-17 7M184 95l3 6-8 3"/>
    </g>
    <ellipse cx="110" cy="126" rx="25" ry="30" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <ellipse cx="110" cy="133" rx="14" ry="18" fill="url(#${u}-belly)" opacity=".85"/>
    <path d="M89 100c-8-16-5-29 6-33 7-2 11 6 10 20M132 100c8-16 5-29-6-33-7-2-11 6-10 20" fill="url(#${u}-deep)" stroke="#0d191b" stroke-width="2.8"/>
    <ellipse cx="109" cy="106" rx="27" ry="22" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="2.8"/>
    ${eyes(u, 99, 120, 104, true)}
    <path d="M104 115c3 3 8 3 11 0" fill="none" stroke="#0d191b" stroke-width="1.8"/>
    <path d="M102 119c2 3 7 5 12 2" fill="none" stroke="#0d191b" stroke-width="1.4"/>
    <circle cx="110" cy="146" r="8" fill="url(#${u}-orb)" stroke="#0d191b" stroke-width="1.8" filter="url(#${u}-glow)"/>
    <circle cx="107" cy="143" r="2.2" fill="#fff" opacity=".8"/>
    <path d="M92 155c-2 9 1 16 8 20M127 155c2 9-1 16-8 20" fill="none" stroke="${TYPES.lumen.color}" stroke-width="2" opacity=".5"/>
    <g fill="${TYPES.lumen.color}" opacity=".8">
      <circle cx="57" cy="120" r="2"/><circle cx="164" cy="118" r="2.4"/><circle cx="73" cy="148" r="1.5"/><circle cx="151" cy="155" r="1.7"/>
    </g>
  `);
}

function thornhog(u) {
  const quills = [];
  for (let i = 0; i < 13; i++) {
    const a = Math.PI + (i / 12) * Math.PI;
    const x = 110 + Math.cos(a) * 50;
    const y = 138 + Math.sin(a) * 50;
    const x2 = 110 + Math.cos(a) * 68;
    const y2 = 138 + Math.sin(a) * 68;
    quills.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${i % 3 === 0 ? TYPES.verdant.color : TYPES.verdant.deep}" stroke-width="${i % 2 ? 7 : 9}" stroke-linecap="round"/>`);
  }
  return bodyWrap(u, `
    <g opacity=".95">${quills.join('')}</g>
    <ellipse cx="110" cy="141" rx="53" ry="45" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.4"/>
    <ellipse cx="111" cy="148" rx="38" ry="31" fill="url(#${u}-belly)" opacity=".85"/>
    <ellipse cx="100" cy="148" rx="30" ry="26" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="2.8"/>
    <path d="M88 124c-7-7-5-16 4-19 8-2 14 3 14 10 4-7 12-7 17 0 4 7-2 15-11 17" fill="url(#${u}-belly)" stroke="#0d191b" stroke-width="2.3"/>
    ${eyes(u, 92, 111, 139, true)}
    <path d="m102 149 3 2-3 2-3-2Z" fill="#243524" stroke="#0d191b" stroke-width="1.2"/>
    <path d="M96 157c4-2 9-2 13 0" fill="none" stroke="#0d191b" stroke-width="1.6"/>
    <path d="M136 115c-2-15 6-26 18-28 6 10 2 22-8 30" fill="${TYPES.verdant.color}" stroke="#0d191b" stroke-width="2.2"/>
    <path d="M147 95c6-9 13-12 20-8-5 8-11 11-20 8Z" fill="${TYPES.verdant.soft}" stroke="#0d191b" stroke-width="1.8"/>
    <path d="M79 172c-2 7 0 12 4 15M139 172c2 7 0 12-4 15" fill="none" stroke="${TYPES.verdant.deep}" stroke-width="5" stroke-linecap="round"/>
    <g fill="${TYPES.lumen.color}" opacity=".6"><circle cx="68" cy="139" r="2.2"/><circle cx="153" cy="152" r="1.8"/></g>
  `);
}

function wisplet(u) {
  return bodyWrap(u, `
    <path d="M91 141c-20 2-31 15-28 29 4-8 9-12 17-13-9 10-9 21-2 29 1-10 6-17 15-21-2 9 2 15 9 18 5-3 8-8 7-17 7 8 15 10 24 6 14-6 17-22 8-31-8-8-19-7-27 1-1-14-11-22-23-19-10 2-15 9-14 18 4-5 8-7 14-7-6 5-8 11-6 17 4-7 11-10 16-5" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="2.8"/>
    <path d="M83 77C84 51 101 36 122 42c18 5 25 23 18 43-5 14-14 24-26 30-13-6-26-16-31-38Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M91 76c5-14 14-21 26-21 13 0 22 9 25 23-8 9-16 14-26 14-11 0-19-5-25-16Z" fill="${TYPES.gloom.deep}" opacity=".38"/>
    <ellipse cx="110" cy="94" rx="27" ry="22" fill="url(#${u}-belly)" opacity=".28"/>
    ${eyes(u, 99, 122, 91, true)}
    <path d="M105 101c3 2 8 2 11 0" fill="none" stroke="#e8deff" stroke-width="1.8" opacity=".8"/>
    <path d="M74 96c-11-7-16-17-14-29M148 92c11-4 17-12 18-23" fill="none" stroke="${TYPES.gloom.color}" stroke-width="3" opacity=".55"/>
    <g filter="url(#${u}-glow)">
      <path d="M55 126h20l-4 22H59l-4-22Z" fill="${TYPES.lumen.color}" stroke="#0d191b" stroke-width="2"/>
      <path d="M64 120c-4-5-3-10 2-12 5-2 9 2 7 8" fill="none" stroke="#0d191b" stroke-width="2"/>
      <ellipse cx="65" cy="137" rx="4.5" ry="6.5" fill="#fff7d2"/>
    </g>
    <g fill="${TYPES.gloom.soft}" opacity=".5"><circle cx="86" cy="165" r="2"/><circle cx="138" cy="169" r="2.4"/><circle cx="70" cy="56" r="1.5"/><circle cx="159" cy="63" r="1.8"/></g>
  `);
}

function boglet(u) {
  return bodyWrap(u, `
    <ellipse cx="110" cy="158" rx="54" ry="31" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <ellipse cx="111" cy="164" rx="35" ry="18" fill="url(#${u}-belly)" opacity=".88"/>
    <ellipse cx="107" cy="122" rx="45" ry="37" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M77 110c9-17 22-25 38-24 15 2 26 10 31 24-10-8-21-12-34-12-14 0-25 4-35 12Z" fill="${TYPES.tide.deep}" opacity=".28"/>
    <circle cx="84" cy="106" r="13" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="2.6"/>
    <circle cx="130" cy="106" r="13" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="2.6"/>
    ${eyes(u, 84, 130, 106, true)}
    <path d="M84 130c12 9 30 9 44 0" fill="none" stroke="#0d191b" stroke-width="2.6"/>
    <path d="M96 142c9 3 17 3 25 0" fill="none" stroke="#0d191b" stroke-width="1.5" opacity=".5"/>
    <g filter="url(#${u}-glow)">
      <circle cx="156" cy="105" r="15" fill="url(#${u}-orb)" stroke="#0d191b" stroke-width="2"/>
      <circle cx="151" cy="100" r="4" fill="#fff" opacity=".75"/>
      <circle cx="161" cy="111" r="2" fill="#fff" opacity=".4"/>
    </g>
    <path d="M146 116c-3 4-3 8 1 11" fill="none" stroke="${TYPES.tide.soft}" stroke-width="2"/>
    <path d="M62 102c-9-3-15-9-17-17M60 112c-8 1-14-2-18-7" fill="none" stroke="${TYPES.tide.color}" stroke-width="2" opacity=".45"/>
    <path d="M75 177c0 7 2 11 6 14M147 177c0 7-2 11-6 14" fill="none" stroke="${TYPES.tide.deep}" stroke-width="5" stroke-linecap="round"/>
    <path d="M45 172c14 5 27 7 43 7M132 179c14 0 26-2 39-7" fill="none" stroke="${TYPES.verdant.color}" stroke-width="2" opacity=".35"/>
  `);
}

function sablefang(u) {
  return bodyWrap(u, `
    <path d="M148 69a38 38 0 1 0 0 76 38 38 0 0 0 0-76Z" fill="${TYPES.gloom.color}" opacity=".12"/>
    <path d="M131 150c21-3 37-18 40-38 2-17-9-30-24-28 8-14-5-27-19-20 4-18-17-29-28-14-8 10-7 22 1 31-15 1-23 15-17 29-12 7-11 25 3 32 12 6 27 3 44-2Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M127 146c14-2 24-10 29-23-8 2-13 7-16 14-1-13-9-21-19-18-1-10-10-15-17-9" fill="url(#${u}-belly)" opacity=".35"/>
    <ellipse cx="104" cy="157" rx="44" ry="30" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M78 65 69 35l27 18M123 62l15-28-28 17" fill="url(#${u}-deep)" stroke="#0d191b" stroke-width="2.8"/>
    <path d="m76 56-4-14 11 10M127 54l8-15-13 9" fill="${TYPES.gloom.soft}" opacity=".5"/>
    <path d="M77 91c4-21 20-33 37-29 17 4 25 21 21 41-4 18-16 29-30 29-16 0-29-18-28-41Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <path d="M91 115c8 11 18 16 28 14 10-2 16-9 20-20-9 8-17 11-26 10-8 0-15-2-22-4Z" fill="url(#${u}-belly)" opacity=".38"/>
    ${eyes(u, 91, 119, 97, true)}
    <path d="M95 113c7 9 15 14 24 14 8 0 15-3 21-9-7 1-12 0-16-3-5-3-8-7-9-12-4 5-10 8-20 10Z" fill="#d8d1e8" opacity=".7" stroke="#0d191b" stroke-width="1.7"/>
    <path d="m104 114 3 6 3-6M117 114l2 6 3-6" fill="#fff" stroke="#0d191b" stroke-width="1.3"/>
    <path d="m111 120 4 2-4 2-4-2Z" fill="#211c2d" stroke="none"/>
    <path d="M87 84c8-6 16-8 23-6M124 86c-6-5-12-7-17-6" fill="none" stroke="${TYPES.gloom.soft}" stroke-width="2" opacity=".38"/>
    <path d="M77 173c-2 8 0 13 4 17M137 173c2 8 0 13-4 17" fill="none" stroke="${TYPES.gloom.deep}" stroke-width="5" stroke-linecap="round"/>
    <g fill="${TYPES.gloom.color}" opacity=".5"><circle cx="168" cy="73" r="2"/><circle cx="53" cy="103" r="1.5"/><circle cx="159" cy="130" r="1.3"/></g>
  `);
}

function voltuff(u) {
  const puffs = [
    [76, 100, 25], [98, 78, 27], [127, 78, 25], [149, 98, 24], [154, 125, 26],
    [135, 143, 29], [108, 150, 30], [82, 142, 27], [62, 124, 24],
  ];
  return bodyWrap(u, `
    ${puffs.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="2.8"/>`).join('')}
    <ellipse cx="108" cy="134" rx="42" ry="31" fill="url(#${u}-belly)" opacity=".54"/>
    <path d="M75 105c6-19 19-30 34-30 16 0 29 11 34 30-10-11-21-16-34-16-14 0-25 5-34 16Z" fill="${TYPES.storm.soft}" opacity=".7"/>
    <path d="M76 103c-6-12-3-22 7-26 7 8 9 16 5 26M139 103c6-12 3-22-7-26-7 8-9 16-5 26" fill="url(#${u}-deep)" stroke="#0d191b" stroke-width="2.5"/>
    <ellipse cx="107" cy="118" rx="27" ry="23" fill="${TYPES.storm.deep}" stroke="#0d191b" stroke-width="2.5"/>
    ${eyes(u, 98, 119, 117, true)}
    <path d="M104 128c3 2 7 2 10 0" fill="none" stroke="#fff6b0" stroke-width="1.7"/>
    <path d="m120 90 9-12-5 13 8 1-12 14 3-12-7 1Z" fill="${TYPES.lumen.color}" stroke="#0d191b" stroke-width="1.6"/>
    <path d="M77 175c-1 7 1 12 5 15M139 175c1 7-1 12-5 15" fill="none" stroke="${TYPES.storm.deep}" stroke-width="5" stroke-linecap="round"/>
    <g fill="${TYPES.lumen.color}" opacity=".7"><circle cx="55" cy="76" r="2"/><circle cx="161" cy="72" r="2.4"/><circle cx="166" cy="145" r="1.5"/></g>
  `);
}

function frostfawn(u) {
  return bodyWrap(u, `
    <path d="M83 66C73 48 70 32 76 19M84 51C72 45 65 36 64 27M83 42C74 33 72 24 75 16M119 65c8-16 10-30 5-43M120 50c11-6 16-14 17-24M121 42c9-9 12-17 10-26" fill="none" stroke="${TYPES.frost.deep}" stroke-width="4.6"/>
    <path d="M83 66C73 48 70 32 76 19M119 65c8-16 10-30 5-43" fill="none" stroke="${TYPES.frost.color}" stroke-width="1.8"/>
    <g fill="${TYPES.frost.soft}" stroke="#0d191b" stroke-width="1.5">
      <path d="m74 17-5-10 9 3 2-9 5 11-4 5Z"/><path d="m124 21 7-9-1 9 9 1-11 6-4-4Z"/><path d="m58 26-6-5 8-2 4 7-3 4Z"/>
    </g>
    <ellipse cx="107" cy="158" rx="42" ry="31" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M85 126c-8-27-5-48 21-52 21-3 34 11 32 35-1 22-11 37-27 41-11-2-21-11-26-24Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <ellipse cx="109" cy="104" rx="31" ry="26" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <path d="M89 84c-2-14 2-22 10-21 7 1 10 10 7 22M122 83c3-13 8-19 15-16 6 3 4 12-1 20" fill="${TYPES.frost.deep}" stroke="#0d191b" stroke-width="2.4"/>
    ${eyes(u, 96, 121, 102, true)}
    <path d="M104 114c4 2 8 2 11 0" fill="none" stroke="#eaf9ff" stroke-width="1.8"/>
    <path d="M87 107c8 15 16 21 26 21 10-1 17-9 23-24-7 8-15 12-24 12-10 0-18-4-25-9Z" fill="url(#${u}-belly)" opacity=".85"/>
    <path d="M73 169c-4 11-1 18 6 22M143 168c4 11 1 18-6 22" fill="none" stroke="${TYPES.frost.deep}" stroke-width="4.5" stroke-linecap="round"/>
    <g fill="#fff" opacity=".85">
      <path d="m62 137 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>
      <path d="m158 149 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z"/>
      <path d="m72 52 1.2 3.2L76 56l-3 1.2L72 60l-1.2-2.8L68 56l2.8-1.2Z"/>
    </g>
    <path d="M71 172c18 7 36 8 54 1" fill="none" stroke="${TYPES.frost.soft}" stroke-width="1.4" opacity=".4"/>
  `);
}

function cragmaw(u) {
  return bodyWrap(u, `
    <path d="M60 64 88 41l28 9 18 20-6 28-19 15-33-7-18-21Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M60 127 92 109l32 10 17 21-6 30-29 16-28-9-19-26Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M83 64c8-15 25-20 38-11 11 8 12 24 3 36-7 9-20 13-30 9-13-5-17-21-11-34Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <path d="m86 52 6-18 12 15 9-19 6 21" fill="${TYPES.stone.deep}" stroke="#0d191b" stroke-width="2.5"/>
    <path d="m101 42 8-15 7 18 14-10 1 18" fill="${TYPES.stone.color}" stroke="#0d191b" stroke-width="2.2"/>
    ${eyes(u, 92, 115, 73, true)}
    <path d="M94 91c7 5 15 6 23 1" fill="none" stroke="#0d191b" stroke-width="2.5"/>
    <path d="m107 86 5 4-5 4-5-4Z" fill="${TYPES.stone.deep}" stroke="#0d191b" stroke-width="1.3"/>
    <path d="M81 135c9-8 22-11 34-5 9 4 14 13 13 22-10-1-19-4-26-10-7 8-15 11-25 10-1-7 0-12 4-17Z" fill="url(#${u}-belly)" opacity=".6"/>
    <g fill="none" stroke="${TYPES.lumen.color}" stroke-width="2" opacity=".9" filter="url(#${u}-glow)">
      <path d="m75 119 12 7-5 12M119 101l-8 12 9 8M96 152l9-11 8 5M86 57l-2 10"/>
    </g>
    <path d="M69 176c-2 9 2 14 8 16M144 177c2 8-2 13-8 15" fill="none" stroke="${TYPES.stone.deep}" stroke-width="8" stroke-linecap="round"/>
    <g fill="${TYPES.stone.deep}" opacity=".6"><circle cx="61" cy="105" r="2.5"/><circle cx="151" cy="120" r="2"/><circle cx="139" cy="61" r="1.7"/></g>
  `);
}

function emberlynx(u) {
  return bodyWrap(u, `
    <path d="M143 125c17 3 25 16 20 33-4-9-10-14-18-14 7 8 7 17 0 24-1-10-6-16-14-18 2 8-3 14-11 15-2-9 1-16 7-21-13 4-22 0-26-11 11 4 20 3 27-3-7-8-6-18 2-25 3 10 8 16 16 19-3-12 2-20 12-22-1 9 0 16 3 23Z" fill="url(#${u}-deep)" stroke="#0d191b" stroke-width="2.8"/>
    <path d="M138 133c8-5 14-1 16 7-7 2-12 0-16-7ZM113 147c8 0 13 4 14 12-8-1-12-5-14-12Z" fill="${TYPES.ember.color}" opacity=".7"/>
    <ellipse cx="103" cy="154" rx="45" ry="33" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <ellipse cx="104" cy="161" rx="28" ry="20" fill="url(#${u}-belly)" opacity=".84"/>
    <path d="M82 70 65 31l31 24M124 68l20-36-32 25" fill="url(#${u}-deep)" stroke="#0d191b" stroke-width="3"/>
    <path d="m77 58-6-17 14 13M131 57l7-17-15 12" fill="${TYPES.ember.soft}" opacity=".65"/>
    <ellipse cx="101" cy="101" rx="42" ry="36" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M66 92c8 22 17 34 35 38 16-5 27-17 35-38-10 12-21 18-35 18-14 0-25-6-35-18Z" fill="url(#${u}-belly)" opacity=".85"/>
    ${eyes(u, 85, 116, 98)}
    <path d="m100 113 5 3-5 3-5-3Z" fill="#2b1715" stroke="#0d191b" stroke-width="1.4"/>
    <path d="M90 121c6 4 13 5 20 1" fill="none" stroke="#0d191b" stroke-width="2.2"/>
    <path d="m68 91 8-5M133 91l-8-5" stroke="#fff" stroke-width="2" opacity=".35"/>
    <g fill="${TYPES.ember.color}" opacity=".7" filter="url(#${u}-glow)">
      <circle cx="65" cy="76" r="2.4"/><circle cx="138" cy="69" r="1.8"/><circle cx="152" cy="102" r="2"/>
    </g>
    <path d="M76 174c-2 8 1 13 6 16M137 174c2 8-1 13-6 16" fill="none" stroke="${TYPES.ember.deep}" stroke-width="5" stroke-linecap="round"/>
  `);
}

function mossbeast(u) {
  return bodyWrap(u, `
    <path d="M54 137c-12-6-17-18-13-31 4-12 17-17 29-11 2-18 17-29 33-25 16 3 24 17 22 33 14-9 29-2 32 12 3 15-8 27-24 27 3 19-10 34-28 34-17 0-28-12-31-27-11 5-22 0-26-10Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.4"/>
    <path d="M70 161c-4 17 2 28 13 34M142 159c5 17 0 29-10 35" fill="none" stroke="${TYPES.verdant.deep}" stroke-width="11" stroke-linecap="round"/>
    <path d="M78 90C67 70 64 49 73 31M79 73C64 63 57 49 57 35M79 58C68 48 64 35 66 22M127 86c9-21 12-40 4-58M126 69c14-10 21-23 22-38M125 54c10-11 14-24 12-36" fill="none" stroke="${TYPES.verdant.deep}" stroke-width="6"/>
    <path d="M78 90C67 70 64 49 73 31M127 86c9-21 12-40 4-58" fill="none" stroke="${TYPES.verdant.color}" stroke-width="2.6"/>
    <g fill="${TYPES.verdant.color}" stroke="#0d191b" stroke-width="1.8">
      <path d="M58 34c-9-6-15-7-20-1 7 6 13 7 20 1Z"/><path d="M135 31c7-8 14-10 20-5-5 8-12 10-20 5Z"/><path d="M67 21c-3-9-8-13-14-11 2 8 7 12 14 11Z"/><path d="M145 53c8-4 14-3 18 3-7 4-13 3-18-3Z"/>
    </g>
    <ellipse cx="104" cy="132" rx="49" ry="38" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3"/>
    <ellipse cx="107" cy="138" rx="30" ry="24" fill="url(#${u}-belly)" opacity=".8"/>
    <ellipse cx="104" cy="101" rx="40" ry="33" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M68 83c-1-18 5-28 15-27 9 1 12 12 8 27M120 82c3-16 9-24 18-21 8 3 7 15 1 27" fill="${TYPES.verdant.deep}" stroke="#0d191b" stroke-width="2.8"/>
    ${eyes(u, 91, 119, 98, true)}
    <path d="M87 113c10 11 20 15 30 13 9-2 16-9 21-18-9 7-17 10-26 9-9 0-17-1-25-4Z" fill="url(#${u}-belly)" opacity=".8"/>
    <path d="m104 112 5 4-5 4-5-4Z" fill="#24311d" stroke="#0d191b" stroke-width="1.4"/>
    <path d="M94 124c8 3 15 3 22 0" fill="none" stroke="#0d191b" stroke-width="2"/>
    <g fill="${TYPES.lumen.color}" opacity=".75"><circle cx="68" cy="121" r="3"/><circle cx="144" cy="115" r="2.2"/><circle cx="86" cy="159" r="2"/><circle cx="130" cy="166" r="2.6"/></g>
    <path d="M58 127c11-6 19-5 25 2M151 125c-9-7-17-7-23-1" fill="none" stroke="${TYPES.verdant.soft}" stroke-width="2" opacity=".35"/>
  `);
}

function hollowwarden(u) {
  return bodyWrap(u, `
    <path d="M106 76c-25 1-40 18-47 43-7 24-22 31-37 51 16-5 27-3 37 7-5-13-1-22 9-29 1 16 8 27 20 34-2-16 3-27 14-36 3 17 11 27 23 31-5-14-3-24 7-33 9 15 16 23 29 26-10-10-13-20-9-31 10 9 20 11 31 7-14-11-20-20-20-33 1-19-8-37-26-45-6 7-14 11-31 8Z" fill="url(#${u}-body)" stroke="#0d191b" stroke-width="3.2"/>
    <path d="M108 73c-26-1-43 14-48 34-4 16 5 31 22 34 18 3 34-5 43-20-9 4-17 5-25 2 3-7 8-12 16-15-9-3-16-1-22 4 0-11 5-19 15-24-13 0-23 3-29 10 3-13 12-21 28-25Z" fill="${TYPES.hollow.deep}" opacity=".35"/>
    <path d="M67 35C62 18 65 7 77 2M68 27C55 22 49 14 49 4M70 18C64 11 63 4 67-1M150 34c5-17 2-28-10-33M149 26c13-5 19-13 19-23M147 17c6-7 7-14 3-19" fill="none" stroke="${TYPES.hollow.deep}" stroke-width="5.5"/>
    <path d="M67 35C62 18 65 7 77 2M150 34c5-17 2-28-10-33" fill="none" stroke="${TYPES.hollow.color}" stroke-width="2"/>
    <path d="M77 45c8-17 27-26 42-22 17 4 27 18 25 35-2 19-17 33-37 33-19 0-33-16-30-46Z" fill="${TYPES.stone.deep}" stroke="#0d191b" stroke-width="3.4"/>
    <path d="M83 51c8-10 21-15 34-12 12 2 20 10 22 21-8-7-18-11-29-11-10 0-20 1-27 2Z" fill="${TYPES.stone.color}" opacity=".33"/>
    <path d="M85 68c6-8 14-8 20 0M117 68c6-8 14-8 20 0" fill="none" stroke="#0b1114" stroke-width="5"/>
    <g fill="${TYPES.hollow.color}" filter="url(#${u}-glow)">
      <ellipse cx="95" cy="69" rx="3" ry="4.5"/><ellipse cx="127" cy="69" rx="3" ry="4.5"/>
    </g>
    <path d="M92 92c10 9 22 12 34 5M98 99l-3 7M111 101v8M124 97l4 7" fill="none" stroke="#0b1114" stroke-width="2.4"/>
    <path d="M103 86c4-3 9-3 13 0" fill="none" stroke="${TYPES.hollow.soft}" stroke-width="1.5" opacity=".5"/>
    <path d="M73 132c12 6 24 7 36 2M78 144c9 5 18 5 28 1" fill="none" stroke="${TYPES.hollow.color}" stroke-width="2" opacity=".55"/>
    <g fill="${TYPES.hollow.color}" opacity=".6"><circle cx="49" cy="108" r="2.4"/><circle cx="164" cy="116" r="2"/><circle cx="90" cy="172" r="1.6"/><circle cx="132" cy="169" r="2.2"/></g>
  `);
}

const BODIES = {
  emberkit, mossprig, tidefin, glimmerbat, thornhog, wisplet, boglet,
  sablefang, voltuff, frostfawn, cragmaw, emberlynx, mossbeast, hollowwarden,
};

export function beastArt(id, { className = '', glow = true } = {}) {
  const c = CREATURES[id] || CREATURES.emberkit;
  const u = `b${++artCounter}`;
  const t = TYPES[c.type];
  const large = c.boss ? 0.98 : c.elite ? 0.94 : 1;
  return `<svg viewBox="0 0 220 220" class="beast-art ${className}" data-creature="${id}" role="img" aria-label="${c.name}">
    ${defs(u, c.type, c)}
    <ellipse class="beast-ground" cx="110" cy="194" rx="${58 * large}" ry="9" fill="#000" opacity=".28"/>
    ${glow ? `<circle cx="110" cy="116" r="86" fill="url(#${u}-aura)" class="beast-aura"/>` : ''}
    ${(c.elite || c.boss) ? `<circle cx="110" cy="116" r="84" fill="url(#${u}-elite)" class="beast-elite-aura"/>` : ''}
    <g class="beast-body" style="transform-origin:110px 150px; transform:scale(${large})">
      ${(BODIES[id] || emberkit)(u)}
    </g>
    <g class="beast-sparks" fill="${t.color}" opacity=".7">
      <circle cx="37" cy="94" r="1.5"/><circle cx="183" cy="84" r="1.2"/><circle cx="39" cy="153" r="1"/><circle cx="180" cy="164" r="1.7"/>
    </g>
  </svg>`;
}

export function orbArt() {
  return `<svg viewBox="0 0 100 100" class="orb-art" aria-hidden="true">
    <defs>
      <radialGradient id="orbg" cx="36%" cy="30%" r="68%">
        <stop offset="0" stop-color="#fffef2"/><stop offset=".3" stop-color="#ffe6a1"/>
        <stop offset=".7" stop-color="#eeb554"/><stop offset="1" stop-color="#8d4d1f"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="31" fill="url(#orbg)" stroke="#23170d" stroke-width="3"/>
    <path d="M27 35c12 6 34 6 46 0M25 59c14-5 36-5 50 0" fill="none" stroke="#fff6cf" stroke-width="2.4" opacity=".8"/>
    <circle cx="38" cy="34" r="5" fill="#fff" opacity=".8"/>
    <path d="M50 14v9M50 77v9M14 50h9M77 50h9" stroke="#ffe6a1" stroke-width="2" opacity=".6"/>
  </svg>`;
}

export function rewardSeal(kind = 'star') {
  return `<span class="seal">${icon(kind)}</span>`;
}
