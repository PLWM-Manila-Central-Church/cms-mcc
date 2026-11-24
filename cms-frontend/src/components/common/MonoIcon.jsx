const ICONS = {
  alertCircle: [
    <circle key="ac1" cx="12" cy="12" r="9" />,
    <line key="ac2" x1="12" y1="8" x2="12" y2="12" />,
    <line key="ac3" x1="12" y1="16" x2="12.01" y2="16" />,
  ],
  analytics: [
    <path key="an1" d="M3 3v18h18" />,
    <path key="an2" d="m7 15 4-4 3 3 6-7" />,
  ],
  archive: [
    <polyline key="a1" points="21 8 21 21 3 21 3 8" />,
    <rect key="a2" x="1" y="3" width="22" height="5" />,
    <line key="a3" x1="10" y1="12" x2="14" y2="12" />,
  ],
  arrowRight: [
    <line key="ar1" x1="5" y1="12" x2="19" y2="12" />,
    <polyline key="ar2" points="13 6 19 12 13 18" />,
  ],
  attendance: [
    <rect key="at1" x="5" y="3" width="14" height="18" rx="2" />,
    <path key="at2" d="M9 3.5a3 3 0 0 1 6 0" />,
    <polyline key="at3" points="9 12.5 11.2 14.7 15.5 10" />,
  ],
  audit: [
    <path key="au1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    <path key="au2" d="m9 12 2 2 4-4" />,
  ],
  bank: [
    <path key="bk1" d="M3 10h18" />,
    <path key="bk2" d="M5 10V8l7-4 7 4v2" />,
    <path key="bk3" d="M6 10v8M10 10v8M14 10v8M18 10v8" />,
    <path key="bk4" d="M4 18h16" />,
  ],
  bell: [
    <path key="b1" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />,
    <path key="b2" d="M13.73 21a2 2 0 0 1-3.46 0" />,
  ],
  bellOff: [
    <path key="bo1" d="M17 17H3c0-2 3-2 3-9a6 6 0 0 1 1-3.3" />,
    <path key="bo2" d="M11 2a6 6 0 0 1 7 6c0 2.2.3 3.7.8 4.8" />,
    <path key="bo3" d="M2 2l20 20" />,
    <path key="bo4" d="M13.73 21a2 2 0 0 1-3.46 0" />,
  ],
  book: [
    <path key="bo1" d="M2 4h7a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />,
    <path key="bo2" d="M22 4h-7a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h8z" />,
  ],
  building: [
    <path key="bu1" d="M3 21h18" />,
    <path key="bu2" d="M5 21V7l7-4 7 4v14" />,
    <path key="bu3" d="M9 21v-6h6v6" />,
    <path key="bu4" d="M9 9h.01M15 9h.01M12 12h.01" />,
  ],
  calendar: [
    <rect key="c1" x="3" y="4" width="18" height="18" rx="2" />,
    <line key="c2" x1="16" y1="2" x2="16" y2="6" />,
    <line key="c3" x1="8" y1="2" x2="8" y2="6" />,
    <line key="c4" x1="3" y1="10" x2="21" y2="10" />,
  ],
  camera: [
    <path key="cm1" d="M4 7h4l2-3h4l2 3h4v13H4z" />,
    <circle key="cm2" cx="12" cy="13" r="4" />,
  ],
  check: [
    <path key="ch1" d="M20 6 9 17l-5-5" />,
  ],
  checkCircle: [
    <circle key="cc1" cx="12" cy="12" r="9" />,
    <path key="cc2" d="m9 12 2 2 4-4" />,
  ],
  chevronDown: [
    <path key="cvd1" d="m6 9 6 6 6-6" />,
  ],
  church: [
    <path key="ch1" d="M12 3v6" />,
    <path key="ch2" d="M9 6h6" />,
    <path key="ch3" d="M5 21V10l7-5 7 5v11" />,
    <path key="ch4" d="M10 21v-5a2 2 0 0 1 4 0v5" />,
  ],
  clipboard: [
    <rect key="cl1" x="5" y="4" width="14" height="18" rx="2" />,
    <path key="cl2" d="M9 4a3 3 0 0 1 6 0" />,
    <path key="cl3" d="M9 12h6M9 16h6" />,
  ],
  clock: [
    <circle key="ck1" cx="12" cy="12" r="9" />,
    <path key="ck2" d="M12 7v5l3 2" />,
  ],
  close: [
    <path key="x1" d="M18 6 6 18" />,
    <path key="x2" d="m6 6 12 12" />,
  ],
  cross: [
    <path key="cr1" d="M12 3v18" />,
    <path key="cr2" d="M7 8h10" />,
  ],
  dashboard: [
    <rect key="db1" x="3" y="3" width="7" height="7" rx="1" />,
    <rect key="db2" x="14" y="3" width="7" height="7" rx="1" />,
    <rect key="db3" x="3" y="14" width="7" height="7" rx="1" />,
    <rect key="db4" x="14" y="14" width="7" height="7" rx="1" />,
  ],
  delete: [
    <path key="d1" d="M3 6h18" />,
    <path key="d2" d="M8 6V4h8v2" />,
    <path key="d3" d="M19 6l-1 15H6L5 6" />,
    <path key="d4" d="M10 11v6M14 11v6" />,
  ],
  document: [
    <path key="dc1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
    <path key="dc2" d="M14 2v6h6" />,
    <path key="dc3" d="M8 13h8M8 17h6" />,
  ],
  download: [
    <path key="dn1" d="M12 3v12" />,
    <path key="dn2" d="m7 10 5 5 5-5" />,
    <path key="dn3" d="M4 20h16" />,
  ],
  dove: [
    <path key="dv1" d="M4 13c4-1 7-4 8-9 3 4 5 6 8 7-3 1-5 3-6 6-2-2-5-3-10-4z" />,
    <path key="dv2" d="M8 14c-1 2-2 4-4 5" />,
  ],
  edit: [
    <path key="e1" d="M12 20h9" />,
    <path key="e2" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  ],
  error: [
    <circle key="er1" cx="12" cy="12" r="9" />,
    <path key="er2" d="m15 9-6 6M9 9l6 6" />,
  ],
  eye: [
    <path key="ey1" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />,
    <circle key="ey2" cx="12" cy="12" r="3" />,
  ],
  eyeOff: [
    <path key="eo1" d="M17.9 17.9A11.8 11.8 0 0 1 12 19C5 19 1 12 1 12a20 20 0 0 1 5.1-5.9" />,
    <path key="eo2" d="M9.9 4.2A12 12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2" />,
    <path key="eo3" d="m2 2 20 20" />,
  ],
  file: [
    <path key="f1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
    <path key="f2" d="M14 2v6h6" />,
  ],
  finance: [
    <path key="fi1" d="M12 2v20" />,
    <path key="fi2" d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  ],
  folder: [
    <path key="fo1" d="M3 6h7l2 2h9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  ],
  globe: [
    <circle key="g1" cx="12" cy="12" r="10" />,
    <path key="g2" d="M2 12h20" />,
    <path key="g3" d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />,
  ],
  graduation: [
    <path key="gr1" d="m2 9 10-5 10 5-10 5z" />,
    <path key="gr2" d="M6 11v5c3 3 9 3 12 0v-5" />,
  ],
  heart: [
    <path key="h1" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />,
  ],
  home: [
    <path key="hm1" d="M3 11 12 3l9 8" />,
    <path key="hm2" d="M5 10v11h14V10" />,
    <path key="hm3" d="M9 21v-6h6v6" />,
  ],
  image: [
    <rect key="im1" x="3" y="4" width="18" height="16" rx="2" />,
    <circle key="im2" cx="8" cy="9" r="1.5" />,
    <path key="im3" d="m21 16-5-5L5 20" />,
  ],
  inventory: [
    <path key="in1" d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />,
    <path key="in2" d="M3.3 7 12 12l8.7-5" />,
    <path key="in3" d="M12 22V12" />,
  ],
  key: [
    <circle key="k1" cx="7" cy="14" r="4" />,
    <path key="k2" d="M10 11 21 3" />,
    <path key="k3" d="M17 7h3v3" />,
  ],
  label: [
    <path key="la1" d="M20 13 13 20 4 11V4h7z" />,
    <circle key="la2" cx="8.5" cy="8.5" r="1.5" />,
  ],
  lightbulb: [
    <path key="lb1" d="M9 18h6" />,
    <path key="lb2" d="M10 22h4" />,
    <path key="lb3" d="M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4z" />,
  ],
  location: [
    <path key="l1" d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0z" />,
    <circle key="l2" cx="12" cy="10" r="3" />,
  ],
  lock: [
    <rect key="lo1" x="4" y="10" width="16" height="11" rx="2" />,
    <path key="lo2" d="M8 10V7a4 4 0 0 1 8 0v3" />,
  ],
  logout: [
    <path key="lg1" d="M10 17l5-5-5-5" />,
    <path key="lg2" d="M15 12H3" />,
    <path key="lg3" d="M21 3v18" />,
  ],
  mail: [
    <rect key="m1" x="3" y="5" width="18" height="14" rx="2" />,
    <path key="m2" d="m3 7 9 6 9-6" />,
  ],
  members: [
    <path key="mb1" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />,
    <circle key="mb2" cx="9" cy="7" r="4" />,
    <path key="mb3" d="M23 21v-2a4 4 0 0 0-3-3.9" />,
    <path key="mb4" d="M16 3.1a4 4 0 0 1 0 7.8" />,
  ],
  ministry: [
    <path key="mi1" d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />,
    <path key="mi2" d="M12 8v5M9.5 10.5h5" />,
  ],
  cellgroups: [
    <path key="cg1" d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20z" />,
    <circle key="cg2" cx="12" cy="12" r="2.2" />,
    <path key="cg3" d="M8.5 18.5a3.5 3.5 0 0 1 7 0" />,
  ],
  chat: [
    <path key="ct1" d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 1 1 18 0z" />,
    <line key="ct2" x1="8.5" y1="11" x2="15.5" y2="11" />,
    <line key="ct3" x1="8.5" y1="14.5" x2="13" y2="14.5" />,
  ],
  events: [
    <rect key="ev1" x="3" y="4" width="18" height="17" rx="2" />,
    <line key="ev2" x1="16" y1="2" x2="16" y2="6" />,
    <line key="ev3" x1="8" y1="2" x2="8" y2="6" />,
    <line key="ev4" x1="3" y1="10" x2="21" y2="10" />,
    <circle key="ev5" cx="12" cy="15.5" r="1.5" />,
  ],
  filter: [
    <polygon key="fl1" points="3 5 21 5 14 13 14 19 10 21 10 13 3 5" />,
  ],
  groups: [
    <circle key="gp1" cx="12" cy="6" r="2.5" />,
    <circle key="gp2" cx="6" cy="17" r="2.5" />,
    <circle key="gp3" cx="18" cy="17" r="2.5" />,
    <path key="gp4" d="M12 8.5v3.5m0 0-4.5 3M12 12l4.5 3" />,
  ],
  listOrdered: [
    <line key="lo1" x1="9" y1="6" x2="20" y2="6" />,
    <line key="lo2" x1="9" y1="12" x2="20" y2="12" />,
    <line key="lo3" x1="9" y1="18" x2="20" y2="18" />,
    <circle key="lo4" cx="5" cy="6" r="1" />,
    <circle key="lo5" cx="5" cy="12" r="1" />,
    <circle key="lo6" cx="5" cy="18" r="1" />,
  ],
  megaphone: [
    <path key="mg1" d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />,
    <path key="mg2" d="M11 8.5c4.5-1.5 8-3.5 9-4v15c-1-.5-4.5-2.5-9-4" />,
  ],
  more: [
    <line key="mo1" x1="4" y1="6" x2="20" y2="6" />,
    <line key="mo2" x1="4" y1="12" x2="20" y2="12" />,
    <line key="mo3" x1="4" y1="18" x2="20" y2="18" />,
  ],
  myTeams: [
    <circle key="mt1" cx="12" cy="12" r="9" />,
    <polygon key="mt2" points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" />,
  ],
  outreach: [
    <path key="ot1" d="M22 2 11 13" />,
    <polygon key="ot2" points="22 2 15 22 11 13 2 9 22 2" />,
  ],
  plus: [
    <line key="ps1" x1="12" y1="5" x2="12" y2="19" />,
    <line key="ps2" x1="5" y1="12" x2="19" y2="12" />,
  ],
  printer: [
    <polyline key="pr1" points="6 9 6 2 18 2 18 9" />,
    <path key="pr2" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />,
    <rect key="pr3" x="6" y="14" width="12" height="8" />,
  ],
  qr: [
    <rect key="qr1" x="3" y="3" width="7" height="7" rx="1" />,
    <rect key="qr2" x="14" y="3" width="7" height="7" rx="1" />,
    <rect key="qr3" x="3" y="14" width="7" height="7" rx="1" />,
    <path key="qr4" d="M14 14h3v3h-3zM19 14h2v2M14 19h2v2M19 19h2v2" />,
  ],
  repeat: [
    <polyline key="rp1" points="17 2 21 6 17 10" />,
    <path key="rp2" d="M3 11V9a4 4 0 0 1 4-4h14" />,
    <polyline key="rp3" points="7 22 3 18 7 14" />,
    <path key="rp4" d="M21 13v2a4 4 0 0 1-4 4H3" />,
  ],
  schedule: [
    <rect key="sc1" x="3" y="4" width="16" height="15" rx="2" />,
    <line key="sc2" x1="8" y1="2" x2="8" y2="6" />,
    <line key="sc3" x1="14" y1="2" x2="14" y2="6" />,
    <circle key="sc4" cx="17.5" cy="17.5" r="4" />,
    <path key="sc5" d="M17.5 15.8v1.9l1.2.8" />,
  ],
  services: [
    <path key="sv1" d="M12 3v5M9.5 5.5h5" />,
    <path key="sv2" d="M5 21V11l7-4 7 4v10" />,
    <path key="sv3" d="M9.5 21v-5.5a2.5 2.5 0 0 1 5 0V21" />,
  ],
  teamReport: [
    <line key="tr1" x1="18" y1="20" x2="18" y2="10" />,
    <line key="tr2" x1="12" y1="20" x2="12" y2="4" />,
    <line key="tr3" x1="6" y1="20" x2="6" y2="14" />,
  ],
  transfer: [
    <polyline key="tf1" points="17 3 21 7 17 11" />,
    <line key="tf2" x1="3" y1="7" x2="21" y2="7" />,
    <polyline key="tf3" points="7 13 3 17 7 21" />,
    <line key="tf4" x1="21" y1="17" x2="3" y2="17" />,
  ],
  wallet: [
    <rect key="wl1" x="2" y="5" width="20" height="14" rx="2" />,
    <path key="wl2" d="M16 12h6" />,
    <circle key="wl3" cx="16.5" cy="12" r="1" />,
  ],
  wrench: [
    <path key="wr1" d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.5-2.5z" />,
  ],
  moon: [
    <path key="mn1" d="M20 15.5A8.5 8.5 0 0 1 8.5 4 7 7 0 1 0 20 15.5z" />,
  ],
  music: [
    <path key="mu1" d="M9 18V5l12-2v13" />,
    <circle key="mu2" cx="6" cy="18" r="3" />,
    <circle key="mu3" cx="18" cy="16" r="3" />,
  ],
  paperclip: [
    <path key="pa1" d="M21.4 11.6 12 21a6 6 0 0 1-8.5-8.5l9.7-9.7a4 4 0 0 1 5.7 5.7L9.2 18.2a2 2 0 1 1-2.8-2.8l8.9-8.9" />,
  ],
  phone: [
    <path key="ph1" d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" />,
  ],
  play: [
    <path key="pl1" d="m8 5 11 7-11 7z" />,
  ],
  power: [
    <path key="pw1" d="M12 2v10" />,
    <path key="pw2" d="M18.4 6.6a9 9 0 1 1-12.77.04" />,
  ],
  rotateCcw: [
    <path key="rc1" d="M3 12a9 9 0 1 0 3-6.7L3 8" />,
    <path key="rc2" d="M3 3v5h5" />,
  ],
  userMinus: [
    <path key="um1" d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />,
    <circle key="um2" cx="8.5" cy="7" r="4" />,
    <line key="um3" x1="23" y1="11" x2="17" y2="11" />,
  ],
  receipt: [
    <path key="r1" d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />,
    <path key="r2" d="M9 8h6M9 12h6M9 16h4" />,
  ],
  refresh: [
    <path key="rf1" d="M21 12a9 9 0 0 0-15-6.7L3 8" />,
    <path key="rf2" d="M3 3v5h5" />,
    <path key="rf3" d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />,
    <path key="rf4" d="M21 21v-5h-5" />,
  ],
  search: [
    <circle key="s1" cx="11" cy="11" r="8" />,
    <path key="s2" d="m21 21-4.3-4.3" />,
  ],
  settings: [
    <circle key="se1" cx="12" cy="12" r="3" />,
    <path key="se2" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
  ],
  sheet: [
    <path key="sh1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
    <path key="sh2" d="M14 2v6h6" />,
    <path key="sh3" d="M8 13h8M8 17h8M11 10v10" />,
  ],
  star: [
    <path key="st1" d="m12 2 3 7 7 .5-5.5 4.5 1.8 7-6.3-3.8L5.7 21l1.8-7L2 9.5 9 9z" />,
  ],
  substitute: [
    <path key="su1" d="M16 3h5v5" />,
    <path key="su2" d="M21 3 14 10" />,
    <path key="su3" d="M8 21H3v-5" />,
    <path key="su4" d="M3 21l7-7" />,
  ],
  sun: [
    <circle key="sn1" cx="12" cy="12" r="4" />,
    <path key="sn2" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />,
  ],
  upload: [
    <path key="u1" d="M12 3v12" />,
    <path key="u2" d="m7 8 5-5 5 5" />,
    <path key="u3" d="M4 17v3h16v-3" />,
  ],
  users: [
    <circle key="us1" cx="12" cy="8" r="4" />,
    <path key="us2" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />,
  ],
  video: [
    <rect key="v1" x="3" y="5" width="14" height="14" rx="2" />,
    <path key="v2" d="m17 9 4-2v10l-4-2" />,
  ],
  warning: [
    <path key="w1" d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
    <path key="w2" d="M12 9v4" />,
    <path key="w3" d="M12 17h.01" />,
  ],
};

export default function MonoIcon({
  name,
  size = 16,
  strokeWidth = 1.8,
  style,
  title,
  ...props
}) {
  const icon = ICONS[name] || ICONS.file;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
      {...props}
    >
      {title && <title>{title}</title>}
      {icon}
    </svg>
  );
}
