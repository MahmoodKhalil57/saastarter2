# pure-frontend — the raw-HTML edition

The SAME store as `../frontend` (same backend, same cart, same payments,
same auth) with the entire toolchain deleted:

- **No build step** — browser-native ES modules (`<script type="module">`);
  deploying is copying this folder to any static host.
- **No router** — real `.html` pages; deep links are just files.
- **No component library** — Bootstrap 5.3 from a CDN (`data-bs-theme`
  gives dark mode; the `.rtl.css` build gives Arabic).
- **No file over 150 lines** — `js/` is the client core (config/api/
  store/ui/payment), `js/pages/` is one small script per page.

Everything server-side is the baas: guest-by-default sessions, hybrid
search, discounts, the embedded payment element (gateway.md), digital
delivery claims (delivery.md), 2FA, Google OAuth, subscriptions.
`js/config.js` is the one file to edit.
