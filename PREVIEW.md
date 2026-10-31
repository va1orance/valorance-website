# Local website preview

This is an unpushed redesign on `preview/site-improvements`. The production domain, CNAME, deployment configuration and upstream history are unchanged. Origin's push URL is deliberately disabled in the local checkout.

## Changes

- Homepage: preserve the animated logo, gold accent and soft neumorphic surfaces; add clearer project hierarchy, responsive two-column layout, navigation and project descriptions.
- Use relative project links so the preview stays local.
- Theme: apply before first paint, persist a choice when storage is available, follow the system until overridden, and work even when storage is blocked.
- Animation: provide a pause control, honor reduced motion without fetching videos, and pause while the page is hidden.
- Accessibility: skip link, visible focus indicators, semantic sections, labelled controls and dark/light contrast fixes.
- Night: restore valid body markup, allow zoom, declare language, add return navigation and restrict scroll-section initialization to hash links.
- Typetris: stack boards on small screens, constrain layout to the viewport, label the input, disable phone autocorrection, add return navigation, expose instruction disclosure state and respect reduced motion. Game rules are unchanged.
- No build system or runtime dependencies added. Existing logo and Night assets are reused. The homepage no longer requests external fonts.

## Run

Create an unchanged comparison snapshot outside the checkout:

```sh
mkdir -p ../valorance-original
git archive 11b2824 | tar -x -C ../valorance-original
python3 tools/preview_server.py --original-root ../valorance-original --port 8787
```

The server binds only to `127.0.0.1`. `/original/` serves the original homepage. It supports Night's extensionless HTML URLs, blocks dot paths and directory listings, and adds a preview-only `X-Robots-Tag: noindex, nofollow` header. It is a development server, not a production deployment.

To share only over an already-authenticated Tailscale node (not Funnel):

```sh
tailscale serve --bg --http=8787 http://127.0.0.1:8787
```

Use a free Serve port and inspect existing routes first. Remove only this preview route when finished:

```sh
tailscale serve --http=8787 off
```

## Verification

Install development-only test dependencies outside the website checkout:

```sh
npm install --prefix /tmp/valorance-test-tools playwright@1.64.1 @axe-core/playwright@4.14.0
/tmp/valorance-test-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/valorance-test-tools/node_modules node tools/preview-check.cjs
```

`PREVIEW_URL` changes the target (default `http://127.0.0.1:8787`). `ARTIFACT_DIR` changes the JSON/screenshot output directory (default `/tmp/valorance-preview`).

The browser suite covers desktop/mobile layout, both themes, automated WCAG A/AA checks on the homepage, persistence, animation controls, keyboard navigation, project navigation, typing a word, extensionless routes, private-path blocking, reduced motion, blocked storage and no-JavaScript project links. Automated accessibility testing is not a full manual accessibility audit. Safari and physical mobile-device testing remain outside this environment.

The repo's original Night files have CRLF line endings. Check whitespace without misclassifying those endings:

```sh
git -c core.whitespace=cr-at-eol diff --check
```

## Design review

Primary surface: Explore — visitors are choosing between two real projects, not being sold a product. Existing identity takes priority over a wholesale rebrand. No invented metrics, testimonials or new project claims. The Typetris illustration is decorative type, not a gameplay screenshot. Self-audit: 1/10 generic-design indicators (system sans retained for the existing site's platform-native typography); no generic feature grid, gradients, glass, fake stats or icon toppers.
