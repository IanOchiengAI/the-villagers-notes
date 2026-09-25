// Google Analytics 4 init (kept as a file so the CSP does not need script-src 'unsafe-inline').
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
window.gtag = gtag;
gtag('js', new Date());
// The site is a client-side router, so a real browser navigation to a new page never happens
// after the first load. The automatic page_view would fire only once per visit, so it is off
// here and src/router.js sends page_view itself on every route change.
gtag('config', 'G-ESJZNKZ9DQ', { send_page_view: false });
