# Dependency advisory inventory

Snapshot: 2026-10-10. Generated from the saved fresh npm audit, original lockfile and full original npm dependency tree. Counts are affected package entries, not unique CVEs. Advisory IDs link to upstream records. Every original direct advisory is listed; inherited-only package entries appear separately below. Versions in the remediation column are the actual patched versions installed, not a claim about the earliest fixed release.

All audit scopes are preserved in `docs/security/`. No ignore/advisory suppression or audit-level filtering was added. Applicability is assessed per advisory and separately from npm package propagation. No exploit is claimed solely from an audit match.

## @babel/runtime

Original installed versions: 7.23.1. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @hello-pangea/dnd@16.3.0 → @babel/runtime@7.23.1
- @hello-pangea/dnd@16.3.0 → react-redux@8.1.3 → @babel/runtime@7.23.1
- @hello-pangea/dnd@16.3.0 → redux@4.2.1 → @babel/runtime@7.23.1
- @radix-ui/react-alert-dialog@1.0.5 → @babel/runtime@7.23.1
- @radix-ui/react-alert-dialog@1.0.5 → @radix-ui/primitive@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-alert-dialog@1.0.5 → @radix-ui/react-compose-refs@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-alert-dialog@1.0.5 → @radix-ui/react-context@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-alert-dialog@1.0.5 → @radix-ui/react-primitive@1.0.3 → @babel/runtime@7.23.1
- @radix-ui/react-checkbox@1.0.4 → @babel/runtime@7.23.1
- @radix-ui/react-checkbox@1.0.4 → @radix-ui/react-presence@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-checkbox@1.0.4 → @radix-ui/react-presence@1.0.1 → @radix-ui/react-use-layout-effect@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-checkbox@1.0.4 → @radix-ui/react-use-controllable-state@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-checkbox@1.0.4 → @radix-ui/react-use-controllable-state@1.0.1 → @radix-ui/react-use-callback-ref@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-checkbox@1.0.4 → @radix-ui/react-use-previous@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-checkbox@1.0.4 → @radix-ui/react-use-size@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-dialog@1.0.5 → @babel/runtime@7.23.1
- @radix-ui/react-dialog@1.0.5 → @radix-ui/react-dismissable-layer@1.0.5 → @babel/runtime@7.23.1
- @radix-ui/react-dialog@1.0.5 → @radix-ui/react-dismissable-layer@1.0.5 → @radix-ui/react-use-escape-keydown@1.0.3 → @babel/runtime@7.23.1
- @radix-ui/react-dialog@1.0.5 → @radix-ui/react-focus-guards@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-dialog@1.0.5 → @radix-ui/react-focus-scope@1.0.4 → @babel/runtime@7.23.1
- @radix-ui/react-dialog@1.0.5 → @radix-ui/react-id@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-dialog@1.0.5 → @radix-ui/react-portal@1.0.4 → @babel/runtime@7.23.1
- @radix-ui/react-dropdown-menu@2.0.6 → @babel/runtime@7.23.1
- @radix-ui/react-dropdown-menu@2.0.6 → @radix-ui/react-menu@2.0.6 → @babel/runtime@7.23.1
- @radix-ui/react-dropdown-menu@2.0.6 → @radix-ui/react-menu@2.0.6 → @radix-ui/react-collection@1.0.3 → @babel/runtime@7.23.1
- @radix-ui/react-dropdown-menu@2.0.6 → @radix-ui/react-menu@2.0.6 → @radix-ui/react-direction@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-dropdown-menu@2.0.6 → @radix-ui/react-menu@2.0.6 → @radix-ui/react-roving-focus@1.0.4 → @babel/runtime@7.23.1
- @radix-ui/react-label@2.0.2 → @babel/runtime@7.23.1
- @radix-ui/react-popover@1.0.7 → @babel/runtime@7.23.1
- @radix-ui/react-popover@1.0.7 → @radix-ui/react-popper@1.1.3 → @babel/runtime@7.23.1
- @radix-ui/react-popover@1.0.7 → @radix-ui/react-popper@1.1.3 → @radix-ui/react-arrow@1.0.3 → @babel/runtime@7.23.1
- @radix-ui/react-popover@1.0.7 → @radix-ui/react-popper@1.1.3 → @radix-ui/react-use-rect@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-popover@1.0.7 → @radix-ui/react-popper@1.1.3 → @radix-ui/rect@1.0.1 → @babel/runtime@7.23.1
- @radix-ui/react-progress@1.0.3 → @babel/runtime@7.23.1
- @radix-ui/react-separator@1.0.3 → @babel/runtime@7.23.1
- @radix-ui/react-slot@1.0.2 → @babel/runtime@7.23.1
- @radix-ui/react-tooltip@1.0.7 → @babel/runtime@7.23.1
- @radix-ui/react-tooltip@1.0.7 → @radix-ui/react-visually-hidden@1.0.3 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/primitive@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-compose-refs@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-context@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-dismissable-layer@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-dismissable-layer@1.0.0 → @radix-ui/react-use-callback-ref@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-dismissable-layer@1.0.0 → @radix-ui/react-use-escape-keydown@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-focus-guards@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-focus-scope@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-id@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-id@1.0.0 → @radix-ui/react-use-layout-effect@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-portal@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-presence@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-primitive@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-slot@1.0.0 → @babel/runtime@7.23.1
- cmdk@0.2.0 → @radix-ui/react-dialog@1.0.0 → @radix-ui/react-use-controllable-state@1.0.0 → @babel/runtime@7.23.1
- eslint-config-next@13.5.4 → eslint-plugin-jsx-a11y@6.7.1 → @babel/runtime@7.23.1
- react-facebook@9.0.12 → @babel/runtime@7.23.1
- recharts@2.9.0 → react-smooth@2.0.5 → react-transition-group@2.9.0 → dom-helpers@3.4.0 → @babel/runtime@7.23.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-968p-4wvh-cqc8](https://github.com/advisories/GHSA-968p-4wvh-cqc8) — moderate: Babel has inefficient RegExp complexity in generated code with .replace when transpiling named capturing groups | `<7.26.10`; original matches 7.23.1 | Installed 7.29.10 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |

## @clerk/backend

Original installed versions: 0.30.3. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/backend@0.30.3
- @clerk/nextjs@4.25.3 → @clerk/backend@0.30.3
- @clerk/nextjs@4.25.3 → @clerk/clerk-sdk-node@4.12.12 → @clerk/backend@0.30.3

Inherited vulnerability only, via: @clerk/shared, cookie. No separate advisory attached to this package.

Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions.

## @clerk/clerk-react

Original installed versions: 4.26.3. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/nextjs@4.25.3 → @clerk/clerk-react@4.26.3

Inherited vulnerability only, via: @clerk/shared. No separate advisory attached to this package.

Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions.

## @clerk/clerk-sdk-node

Original installed versions: 4.12.12. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/nextjs@4.25.3 → @clerk/clerk-sdk-node@4.12.12

Inherited vulnerability only, via: @clerk/backend. No separate advisory attached to this package.

Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions.

## @clerk/nextjs

Original installed versions: 4.25.3. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/nextjs@4.25.3

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-q6w5-jg5q-47vg](https://github.com/advisories/GHSA-q6w5-jg5q-47vg) — critical: @clerk/nextjs auth() and getAuth() methods vulnerable to insecure direct object reference (IDOR)  | `>=4.7.0 <4.29.3`; original matches 4.25.3 | Installed 7.9.14 (outside affected range) | Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions. Major/API migration; see report. |

## @clerk/shared

Original installed versions: 0.24.3. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/backend@0.30.3 → @clerk/shared@0.24.3
- @clerk/nextjs@4.25.3 → @clerk/clerk-react@4.26.3 → @clerk/shared@0.24.3
- @clerk/nextjs@4.25.3 → @clerk/shared@0.24.3

Inherited vulnerability only, via: js-cookie. No separate advisory attached to this package.

Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions.

## @protobufjs/utf8

Original installed versions: 1.1.0. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- livekit-server-sdk@1.2.7 → protobufjs@7.2.5 → @protobufjs/utf8@1.1.0

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-q6x5-8v7m-xcrf](https://github.com/advisories/GHSA-q6x5-8v7m-xcrf) — moderate: protobufjs has overlong UTF-8 decoding | `<=1.1.0`; original matches 1.1.0 | Installed 1.1.2 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |

## @uploadthing/react

Original installed versions: 7.3.3. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @uploadthing/react@7.3.3

Inherited vulnerability only, via: @uploadthing/shared, uploadthing. No separate advisory attached to this package.

UploadThing uses Effect in upload request processing alongside Clerk auth. AsyncLocalStorage contamination is a plausible identity risk; exact exploit not demonstrated. Compatible Effect 3 patch override tested.

## @uploadthing/shared

Original installed versions: 7.1.10. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @uploadthing/react@7.3.3 → @uploadthing/shared@7.1.10
- uploadthing@7.7.4 → @uploadthing/shared@7.1.10

Inherited vulnerability only, via: effect. No separate advisory attached to this package.

UploadThing uses Effect in upload request processing alongside Clerk auth. AsyncLocalStorage contamination is a plausible identity risk; exact exploit not demonstrated. Compatible Effect 3 patch override tested.

## ajv

Original installed versions: 6.12.6. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- eslint@8.50.0 → @eslint/eslintrc@2.1.2 → ajv@6.12.6
- eslint@8.50.0 → ajv@6.12.6

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) — moderate: ajv has ReDoS when using `$data` option | `<6.14.0`; original matches 6.12.6 | Installed 6.15.0 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## axios

Original installed versions: 1.5.1. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @mux/mux-node@7.3.2 → axios@1.5.1
- axios@1.5.1
- livekit-server-sdk@1.2.7 → axios@1.5.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-wf5p-g6vw-rhxx](https://github.com/advisories/GHSA-wf5p-g6vw-rhxx) — moderate: Axios Cross-Site Request Forgery Vulnerability | `>=1.0.0 <1.6.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-8hc4-vh64-cxmj](https://github.com/advisories/GHSA-8hc4-vh64-cxmj) — high: Server-Side Request Forgery in axios | `>=1.3.2 <=1.7.3`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-jr5f-v2jv-69x6](https://github.com/advisories/GHSA-jr5f-v2jv-69x6) — high: axios Requests Vulnerable To Possible SSRF and Credential Leakage via Absolute URL | `>=1.0.0 <1.8.2`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-4hjh-wcwx-xvwj](https://github.com/advisories/GHSA-4hjh-wcwx-xvwj) — high: Axios is vulnerable to DoS attack through lack of data size check | `>=1.0.0 <1.12.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-3p68-rc4w-qgx5](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) — moderate: Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF | `>=1.0.0 <1.15.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-w9j2-pvgh-6h63](https://github.com/advisories/GHSA-w9j2-pvgh-6h63) — moderate: Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-pmwg-cvhr-8vh7](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7) — high: Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0 | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-3w6x-2g7m-8v23](https://github.com/advisories/GHSA-3w6x-2g7m-8v23) — moderate: Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver` | `>=1.0.0 <1.15.2`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-xhjh-pmcv-23jw](https://github.com/advisories/GHSA-xhjh-pmcv-23jw) — low: Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-445q-vr5w-6q77](https://github.com/advisories/GHSA-445q-vr5w-6q77) — moderate: Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-m7pr-hjqh-92cm](https://github.com/advisories/GHSA-m7pr-hjqh-92cm) — moderate: Axios: no_proxy bypass via IP alias allows SSRF | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-5c9x-8gcm-mpgx](https://github.com/advisories/GHSA-5c9x-8gcm-mpgx) — moderate: Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-vf2m-468p-8v99](https://github.com/advisories/GHSA-vf2m-468p-8v99) — moderate: Axios: HTTP adapter streamed responses bypass maxContentLength | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-pf86-5x62-jrwf](https://github.com/advisories/GHSA-pf86-5x62-jrwf) — high: Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-6chq-wfr3-2hj9](https://github.com/advisories/GHSA-6chq-wfr3-2hj9) — high: Axios: Header Injection via Prototype Pollution | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-xx6v-rp6x-q39c](https://github.com/advisories/GHSA-xx6v-rp6x-q39c) — moderate: Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-43fc-jf86-j433](https://github.com/advisories/GHSA-43fc-jf86-j433) — high: Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig | `>=1.0.0 <=1.13.4`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-q8qp-cvcw-x6jj](https://github.com/advisories/GHSA-q8qp-cvcw-x6jj) — high: Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking | `>=1.0.0 <1.15.2`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-fvcv-3m26-pcqx](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) — moderate: Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain | `>=1.0.0 <1.15.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-62hf-57xw-28j9](https://github.com/advisories/GHSA-62hf-57xw-28j9) — moderate: Axios: unbounded recursion in toFormData causes DoS via deeply nested request data | `>=1.0.0 <1.15.1`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-hfxv-24rg-xrqf](https://github.com/advisories/GHSA-hfxv-24rg-xrqf) — high: Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection | `>=1.0.0 <1.16.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-p92q-9vqr-4j8v](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) — high: Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter | `>=1.0.0 <1.16.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-j5f8-grm9-p9fc](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) — high: Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection | `>=1.0.0 <1.16.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-3g43-6gmg-66jw](https://github.com/advisories/GHSA-3g43-6gmg-66jw) — high: axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge | `>=1.0.0 <1.15.2`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-35jp-ww65-95wh](https://github.com/advisories/GHSA-35jp-ww65-95wh) — high: axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy` | `>=1.0.0 <1.16.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-898c-q2cr-xwhg](https://github.com/advisories/GHSA-898c-q2cr-xwhg) — moderate: axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions | `>=1.0.0 <1.16.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-mmx7-hfxf-jppx](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) — moderate: Axios: Prototype pollution gadgets can alter axios request construction | `>=1.0.0 <1.18.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-pmv8-rq9r-6j72](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) — moderate: Axios: Deep formToJSON Key Recursion Can Cause Denial of Service | `>=1.0.0 <1.18.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-7q8q-rj6j-mhjq](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) — moderate: Axios: Nested axios option objects can consume polluted prototype values | `>=1.0.0 <1.18.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-42h9-826w-cgv3](https://github.com/advisories/GHSA-42h9-826w-cgv3) — moderate: Axios: Excessive recursion in formDataToJSON can cause denial of service | `>=1.0.0 <1.18.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-9fr6-4gfg-395g](https://github.com/advisories/GHSA-9fr6-4gfg-395g) — moderate: Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method | `>=1.0.0 <1.20.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-j8rh-479h-cp32](https://github.com/advisories/GHSA-j8rh-479h-cp32) — moderate: Axios: Header Injection via Inherited headers After Minimal Interceptor | `>=1.0.0 <1.20.0`; original matches 1.5.1 | Installed 1.20.0 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |

## brace-expansion

Original installed versions: 1.1.11. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- eslint@8.50.0 → minimatch@3.1.2 → brace-expansion@1.1.11

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-v6h2-p8h4-qcjw](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw) — low: brace-expansion Regular Expression Denial of Service vulnerability | `>=1.0.0 <=1.1.11`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) — moderate: brace-expansion: Zero-step sequence causes process hang and memory exhaustion | `<1.1.13`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) — high: brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups | `<1.1.16`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — high: brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash | `<1.1.17`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) — high: brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation | `<1.1.18`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — moderate: brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service | `<1.1.21`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) — high: brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion | `<1.1.20`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) — high: brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion | `<1.1.19`; original matches 1.1.11 | Installed 5.0.12, 1.1.21 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## braces

Original installed versions: 3.0.2. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- tailwindcss@3.3.3 → chokidar@3.5.3 → braces@3.0.2
- tailwindcss@3.3.3 → micromatch@4.0.5 → braces@3.0.2

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-grv7-fg5c-xmjg](https://github.com/advisories/GHSA-grv7-fg5c-xmjg) — high: Uncontrolled resource consumption in braces | `<3.0.3`; original matches 3.0.2 | Installed 3.0.3 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) — high: braces vulnerable to stack-exhaustion denial of service through deeply nested patterns | `<=3.0.3`; original matches 3.0.2 | Retained 3.0.3; no published fix for remaining advisory | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## browserslist

Original installed versions: 4.22.1. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- autoprefixer@10.4.16 → browserslist@4.22.1
- autoprefixer@10.4.16 → browserslist@4.22.1 → update-browserslist-db@1.0.13 → browserslist@4.22.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) — high: Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM | `<=4.28.6`; original matches 4.22.1 | Installed 4.29.3 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) — high: Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) | `<=4.28.6`; original matches 4.22.1 | Installed 4.29.3 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## cookie

Original installed versions: 1.1.1, 0.5.0. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/backend@0.30.3 → cookie@0.5.0
- @supabase/ssr@0.12.7 → cookie@1.1.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) — low: cookie accepts cookie name, path, and domain with out of bounds characters | `<0.7.0`; original matches 0.5.0 | Installed 1.1.1 (outside affected range) | Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions. Compatible transitive refresh or package removal; build/tests verify integration. |

## cross-spawn

Original installed versions: 7.0.3. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- eslint@8.50.0 → cross-spawn@7.0.3

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-3xgq-45jj-v275](https://github.com/advisories/GHSA-3xgq-45jj-v275) — high: Regular Expression Denial of Service (ReDoS) in cross-spawn | `>=7.0.0 <7.0.5`; original matches 7.0.3 | Installed 7.0.6 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## decode-uri-component

Original installed versions: 0.4.1. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- query-string@8.1.0 → decode-uri-component@0.4.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) — moderate: decode-uri-component: Denial of service via exponential decoding of malformed percent-encoded input | `<=0.4.2`; original matches 0.4.1 | Installed 0.5.0 (outside affected range) | Browser search/category query serialization is used. Malformed URL decoding exposure is conditional; upgraded query-string 9 and patched decoder preserve serialization call sites. Compatible transitive refresh or package removal; build/tests verify integration. |

## effect

Original installed versions: 3.17.7. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @uploadthing/react@7.3.3 → @uploadthing/shared@7.1.10 → effect@3.17.7
- uploadthing@7.7.4 → @effect/platform@0.90.3 → effect@3.17.7
- uploadthing@7.7.4 → effect@3.17.7

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-38f7-945m-qr2g](https://github.com/advisories/GHSA-38f7-945m-qr2g) — high: Effect `AsyncLocalStorage` context lost/contaminated inside Effect fibers under concurrent load with RPC | `<3.20.0`; original matches 3.17.7 | Installed 3.22.2 (outside affected range) | UploadThing uses Effect in upload request processing alongside Clerk auth. AsyncLocalStorage contamination is a plausible identity risk; exact exploit not demonstrated. Compatible Effect 3 patch override tested. Compatible transitive refresh or package removal; build/tests verify integration. |

## flatted

Original installed versions: 3.2.9. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- eslint@8.50.0 → file-entry-cache@6.0.1 → flat-cache@3.1.0 → flatted@3.2.9

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f) — high: flatted vulnerable to unbounded recursion DoS in parse() revive phase | `<3.4.0`; original matches 3.2.9 | Installed 3.4.4 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh) — high: Prototype Pollution via parse() in NodeJS flatted | `<=3.4.1`; original matches 3.2.9 | Installed 3.4.4 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## follow-redirects

Original installed versions: 1.15.3. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- axios@1.5.1 → follow-redirects@1.15.3

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-cxjh-pqwp-8mfp](https://github.com/advisories/GHSA-cxjh-pqwp-8mfp) — moderate: follow-redirects' Proxy-Authorization header kept across hosts | `<=1.15.5`; original matches 1.15.3 | Installed 1.16.1 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-jchw-25xp-jwwc](https://github.com/advisories/GHSA-jchw-25xp-jwwc) — moderate: Follow Redirects improperly handles URLs in the url.parse() function | `<1.15.4`; original matches 1.15.3 | Installed 1.16.1 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653) — moderate: follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets | `<=1.15.11`; original matches 1.15.3 | Installed 1.16.1 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |

## form-data

Original installed versions: 4.0.0, 3.0.1. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/nextjs@4.25.3 → @clerk/clerk-sdk-node@4.12.12 → @types/node-fetch@2.6.2 → form-data@3.0.1
- axios@1.5.1 → form-data@4.0.0

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-fjxv-7rqg-78g4](https://github.com/advisories/GHSA-fjxv-7rqg-78g4) — critical: form-data uses unsafe random function in form-data for choosing boundary | `>=4.0.0 <4.0.4`; original matches 4.0.0 | Installed 4.0.6 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-fjxv-7rqg-78g4](https://github.com/advisories/GHSA-fjxv-7rqg-78g4) — critical: form-data uses unsafe random function in form-data for choosing boundary | `>=3.0.0 <3.0.4`; original matches 3.0.1 | Installed 4.0.6 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) — high: form-data: CRLF injection in form-data via unescaped multipart field names and filenames | `>=4.0.0 <4.0.6`; original matches 4.0.0 | Installed 4.0.6 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) — high: form-data: CRLF injection in form-data via unescaped multipart field names and filenames | `>=3.0.0 <3.0.5`; original matches 3.0.1 | Installed 4.0.6 (outside affected range) | HTTP/multipart dependencies are used by API clients/Mux. Browser Axios does not use Node form-data; backend SDK paths can. URL control, redirects and multipart transmission differ by advisory; not every exploit is proven. Compatible transitive refresh or package removal; build/tests verify integration. |

## js-cookie

Original installed versions: 3.0.1. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/backend@0.30.3 → @clerk/shared@0.24.3 → js-cookie@3.0.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-qjx8-664m-686j](https://github.com/advisories/GHSA-qjx8-664m-686j) — high: JavaScript Cookie: Per-instance prototype hijack in assign() enables cookie-attribute injection | `<=3.0.5`; original matches 3.0.1 | Installed 3.0.8 (outside affected range) | Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions. Compatible transitive refresh or package removal; build/tests verify integration. |

## js-yaml

Original installed versions: 4.1.0. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- eslint@8.50.0 → @eslint/eslintrc@2.1.2 → js-yaml@4.1.0
- eslint@8.50.0 → js-yaml@4.1.0

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-mh29-5h37-fv8m](https://github.com/advisories/GHSA-mh29-5h37-fv8m) — moderate: js-yaml has prototype pollution in merge (<<) | `>=4.0.0 <4.1.1`; original matches 4.1.0 | Installed 4.3.2 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) — moderate: JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases | `>=4.0.0 <=4.1.1`; original matches 4.1.0 | Installed 4.3.2 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) — high: js-yaml: YAML merge-key chains can force quadratic CPU consumption | `>=4.0.0 <4.3.0`; original matches 4.1.0 | Installed 4.3.2 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) — high: JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported | `>=4.0.0 <4.3.1`; original matches 4.1.0 | Installed 4.3.2 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) — high: js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources | `>=4.0.0 <4.3.2`; original matches 4.1.0 | Installed 4.3.2 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## jws

Original installed versions: 3.2.2. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @mux/mux-node@7.3.2 → jsonwebtoken@9.0.2 → jws@3.2.2

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-869p-cjfg-cm3x](https://github.com/advisories/GHSA-869p-cjfg-cm3x) — high: auth0/node-jws Improperly Verifies HMAC Signature | `<3.2.3`; original matches 3.2.2 | Installed 4.0.1 (outside affected range) | JWT signing dependency in LiveKit server SDK; local signing smoke passes. Advisory prerequisites differ from the app signing-only path; patched transitive installed. Compatible transitive refresh or package removal; build/tests verify integration. |

## lodash

Original installed versions: 4.17.21. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- react-quill@2.0.0 → lodash@4.17.21
- recharts@2.9.0 → lodash@4.17.21
- recharts@2.9.0 → react-resize-detector@8.1.0 → lodash@4.17.21

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) — high: lodash vulnerable to Code Injection via `_.template` imports key names | `>=4.0.0 <=4.17.23`; original matches 4.17.21 | Installed 4.18.1 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh) — moderate: lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` | `<=4.17.23`; original matches 4.17.21 | Installed 4.18.1 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) — moderate: Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions | `>=4.0.0 <=4.17.22`; original matches 4.17.21 | Installed 4.18.1 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |

## micromatch

Original installed versions: 4.0.5. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- tailwindcss@3.3.3 → fast-glob@3.3.1 → micromatch@4.0.5
- tailwindcss@3.3.3 → micromatch@4.0.5

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-952p-6rrq-rcjv](https://github.com/advisories/GHSA-952p-6rrq-rcjv) — moderate: Regular Expression Denial of Service (ReDoS) in micromatch | `<4.0.8`; original matches 4.0.5 | Installed 4.0.8 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## minimatch

Original installed versions: 3.1.2. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- eslint-config-next@13.5.4 → @next/eslint-plugin-next@13.5.4 → glob@7.1.7 → minimatch@3.1.2
- eslint-config-next@13.5.4 → eslint-plugin-import@2.28.1 → minimatch@3.1.2
- eslint-config-next@13.5.4 → eslint-plugin-jsx-a11y@6.7.1 → minimatch@3.1.2
- eslint-config-next@13.5.4 → eslint-plugin-react@7.33.2 → minimatch@3.1.2
- eslint@8.50.0 → @eslint/eslintrc@2.1.2 → minimatch@3.1.2
- eslint@8.50.0 → @humanwhocodes/config-array@0.11.11 → minimatch@3.1.2
- eslint@8.50.0 → minimatch@3.1.2
- tailwindcss@3.3.3 → sucrase@3.34.0 → glob@7.1.6 → minimatch@3.1.2

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) — high: minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern | `<3.1.3`; original matches 3.1.2 | Installed 10.2.6, 3.1.5 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) — high: minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments | `<3.1.3`; original matches 3.1.2 | Installed 10.2.6, 3.1.5 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) — high: minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions | `<3.1.4`; original matches 3.1.2 | Installed 10.2.6, 3.1.5 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## moment

Original installed versions: 2.29.4. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- moment@2.29.4

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-4p3w-j4w9-5jqw](https://github.com/advisories/GHSA-4p3w-j4w9-5jqw) — moderate: moment vulnerable to Path Traversal via crafted non-string locale name | `>=2.29.2 <2.31.0`; original matches 2.29.4 | Removed with unused parent or replaced SDK/editor | No source imports/calls found; unused direct package removed. Compatible transitive refresh or package removal; build/tests verify integration. |

## nanoid

Original installed versions: 3.3.6. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- next@13.4.12 → postcss@8.4.14 → nanoid@3.3.6
- postcss@8.4.31 → nanoid@3.3.6

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-mwcw-c2x4-8c55](https://github.com/advisories/GHSA-mwcw-c2x4-8c55) — moderate: Predictable results in nanoid generation when given non-integer values | `<3.3.8`; original matches 3.3.6 | Installed 3.3.20 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) — high: nanoid: non-secure generators can loop indefinitely with negative size | `<3.3.16`; original matches 3.3.6 | Installed 3.3.20 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) — high: nanoid: custom generators can loop indefinitely when size is zero | `<3.3.18`; original matches 3.3.6 | Installed 3.3.20 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) — high: nanoid: Integer Overflow or Wraparound | `<3.3.12`; original matches 3.3.6 | Installed 3.3.20 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |

## next

Original installed versions: 13.4.12. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/nextjs@4.25.3 → next@13.4.12
- @uploadthing/react@7.3.3 → next@13.4.12
- next-themes@0.2.1 → next@13.4.12
- next@13.4.12

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-c59h-r6p8-q9wc](https://github.com/advisories/GHSA-c59h-r6p8-q9wc) — low: Next.js missing cache-control header may lead to CDN caching empty reply | `>=0.9.9 <13.4.20-canary.13`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-fr5h-rqp8-mj6g](https://github.com/advisories/GHSA-fr5h-rqp8-mj6g) — high: Next.js Server-Side Request Forgery in Server Actions | `>=13.4.0 <14.1.1`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No application use-server functions found. Framework endpoint exposure is conditional; no exploit demonstrated. Major/API migration; see report. |
| [GHSA-77r5-gw3j-2mpf](https://github.com/advisories/GHSA-77r5-gw3j-2mpf) — high: Next.js Vulnerable to HTTP Request Smuggling | `>=13.4.0 <13.5.1`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-fq54-2j52-jc42](https://github.com/advisories/GHSA-fq54-2j52-jc42) — high: Next.js Denial of Service (DoS) condition | `>=13.3.1 <13.5.0`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-g77x-44xx-532m](https://github.com/advisories/GHSA-g77x-44xx-532m) — moderate: Denial of Service condition in Next.js image optimization | `>=10.0.0 <14.2.7`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | next/image and remote image domains are used. Attacker control over an accepted image/URL is conditional; upgraded, native Sharp smoke passes. Major/API migration; see report. |
| [GHSA-7m27-7ghc-44w9](https://github.com/advisories/GHSA-7m27-7ghc-44w9) — moderate: Next.js Allows a Denial of Service (DoS) with Server Actions | `>=13.0.0 <13.5.8`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No application use-server functions found. Framework endpoint exposure is conditional; no exploit demonstrated. Major/API migration; see report. |
| [GHSA-3h52-269p-cp9r](https://github.com/advisories/GHSA-3h52-269p-cp9r) — low: Information exposure in Next.js dev server due to lack of origin verification | `>=13.0 <14.2.30`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | Relevant to local/LAN development; dev binds 0.0.0.0, not a production-only concern. Major/API migration; see report. |
| [GHSA-g5qg-72qw-gw5v](https://github.com/advisories/GHSA-g5qg-72qw-gw5v) — moderate: Next.js Affected by Cache Key Confusion for Image Optimization API Routes | `>=0.9.9 <14.2.31`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | next/image and remote image domains are used. Attacker control over an accepted image/URL is conditional; upgraded, native Sharp smoke passes. Major/API migration; see report. |
| [GHSA-7gfc-8cq8-jh5f](https://github.com/advisories/GHSA-7gfc-8cq8-jh5f) — high: Next.js authorization bypass vulnerability | `>=9.5.5 <14.2.15`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | Reachable: middleware is the outer authentication boundary; upgraded and anonymous bypass-header smoke rejects access. Major/API migration; see report. |
| [GHSA-4342-x723-ch2f](https://github.com/advisories/GHSA-4342-x723-ch2f) — moderate: Next.js Improper Middleware Redirect Handling Leads to SSRF | `>=0.9.9 <14.2.32`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | Reachable: middleware is the outer authentication boundary; upgraded and anonymous bypass-header smoke rejects access. Major/API migration; see report. |
| [GHSA-xv57-4mr9-wg8v](https://github.com/advisories/GHSA-xv57-4mr9-wg8v) — moderate: Next.js Content Injection Vulnerability for Image Optimization | `>=0.9.9 <14.2.31`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | next/image and remote image domains are used. Attacker control over an accepted image/URL is conditional; upgraded, native Sharp smoke passes. Major/API migration; see report. |
| [GHSA-qpjv-v59x-3qc4](https://github.com/advisories/GHSA-qpjv-v59x-3qc4) — low: Next.js Race Condition to Cache Poisoning | `>=0.9.9 <14.2.24`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-mwv6-3258-q52c](https://github.com/advisories/GHSA-mwv6-3258-q52c) — high: Next Vulnerable to Denial of Service with Server Components | `>=13.3.0 <14.2.34`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-5j59-xgg2-r9c4](https://github.com/advisories/GHSA-5j59-xgg2-r9c4) — high: Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up | `>=13.3.1-canary.0 <14.2.35`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) — moderate: Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration | `>=10.0.0 <15.5.10`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | next/image and remote image domains are used. Attacker control over an accepted image/URL is conditional; upgraded, native Sharp smoke passes. Major/API migration; see report. |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) — high: Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components | `>=13.0.0 <15.0.8`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-f82v-jwr5-mffw](https://github.com/advisories/GHSA-f82v-jwr5-mffw) — critical: Authorization Bypass in Next.js Middleware | `>=13.0.0 <13.5.9`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | Reachable: middleware is the outer authentication boundary; upgraded and anonymous bypass-header smoke rejects access. Major/API migration; see report. |
| [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) — moderate: Next.js: HTTP request smuggling in rewrites | `>=9.5.0 <15.5.13`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) — moderate: Next.js: Unbounded next/image disk cache growth can exhaust storage | `>=10.0.0 <15.5.14`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | next/image and remote image domains are used. Attacker control over an accepted image/URL is conditional; upgraded, native Sharp smoke passes. Major/API migration; see report. |
| [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) — high: Next.js has a Denial of Service with Server Components | `>=13.0.0 <15.5.15`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj) — high: Next.js Vulnerable to Denial of Service with Server Components | `>=13.0.0 <15.5.16`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-3g8h-86w9-wvmq](https://github.com/advisories/GHSA-3g8h-86w9-wvmq) — low: Next.js's Middleware / Proxy redirects can be cache-poisoned | `>=12.2.0 <15.5.16`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | Reachable: middleware is the outer authentication boundary; upgraded and anonymous bypass-header smoke rejects access. Major/API migration; see report. |
| [GHSA-ffhc-5mcf-pf4q](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q) — moderate: Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces | `>=13.4.0 <15.5.16`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No application CSP nonce setup found; conditional feature not configured. Major/API migration; see report. |
| [GHSA-vfv6-92ff-j949](https://github.com/advisories/GHSA-vfv6-92ff-j949) — low: Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting | `>=13.4.6 <15.5.16`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-gx5p-jg67-6x7h](https://github.com/advisories/GHSA-gx5p-jg67-6x7h) — moderate: Next.js has cross-site scripting in beforeInteractive scripts with untrusted input | `>=13.0.0 <15.5.16`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No beforeInteractive scripts found; conditional feature not used. Major/API migration; see report. |
| [GHSA-h64f-5h5j-jqjh](https://github.com/advisories/GHSA-h64f-5h5j-jqjh) — moderate: Next.js has a Denial of Service in the Image Optimization API | `>=10.0.0 <15.5.16`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | next/image and remote image domains are used. Attacker control over an accepted image/URL is conditional; upgraded, native Sharp smoke passes. Major/API migration; see report. |
| [GHSA-36qx-fr4f-26g5](https://github.com/advisories/GHSA-36qx-fr4f-26g5) — high: Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n | `>=12.2.0 <15.5.16`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | Not configured: this app uses App Router and no i18n routing. Major/API migration; see report. |
| [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) — high: Next.js: Denial of Service in App Router using Server Actions | `>=13.0.0 <15.5.21`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No application use-server functions found. Framework endpoint exposure is conditional; no exploit demonstrated. Major/API migration; see report. |
| [GHSA-68g3-v927-f742](https://github.com/advisories/GHSA-68g3-v927-f742) — moderate: Next.js: Cache confusion of response bodies for requests with bodies | `>=13.0.0 <15.5.21`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-4633-3j49-mh5q](https://github.com/advisories/GHSA-4633-3j49-mh5q) — moderate: Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences | `>=13.0.0 <15.5.21`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | App Router, SSR/RSC and request handling are used. CDN/self-host/cache prerequisites vary; specific exploit not demonstrated, patched framework installed. Major/API migration; see report. |
| [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3) — moderate: Next.js: Unbounded Server Action payload in Edge runtime | `>=13.0.0 <15.5.21`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No application use-server functions found. Framework endpoint exposure is conditional; no exploit demonstrated. Major/API migration; see report. |
| [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) — high: Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname | `>=12.0.0 <15.5.21`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No attacker-configurable rewrites found. Clerk uses internal rewrites; specific exploit not demonstrated. Major/API migration; see report. |
| [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) — moderate: Next.js: Unauthenticated disclosure of internal Server Function endpoints | `>=13.0.0 <15.5.21`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | No application use-server functions found. Framework endpoint exposure is conditional; no exploit demonstrated. Major/API migration; see report. |
| [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) — critical: Next.js: Unauthenticated Remote Code Execution on windows-hosted servers | `>=13.4.0 <15.5.24`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | Windows local server is used and dev binds all interfaces: material potential local/LAN exposure; upgraded. Major/API migration; see report. |
| [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) — critical: Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used | `>=10.0.0 <15.5.24`; original matches 13.4.12 | Installed 15.5.27 (outside affected range) | next/image and remote image domains are used. Attacker control over an accepted image/URL is conditional; upgraded, native Sharp smoke passes. Major/API migration; see report. |

## path-to-regexp

Original installed versions: 6.2.1. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @clerk/nextjs@4.25.3 → path-to-regexp@6.2.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-9wv6-86v2-598j](https://github.com/advisories/GHSA-9wv6-86v2-598j) — high: path-to-regexp outputs backtracking regular expressions | `>=4.0.0 <6.3.0`; original matches 6.2.1 | Removed with unused parent or replaced SDK/editor | Authentication/session or route matching dependency is used. Critical Clerk auth()/getAuth() IDOR was in installed range; specific exploit not reproduced. Current SDK and fresh transitives replace affected versions. Compatible transitive refresh or package removal; build/tests verify integration. |

## picomatch

Original installed versions: 2.3.1. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- tailwindcss@3.3.3 → chokidar@3.5.3 → anymatch@3.1.3 → picomatch@2.3.1
- tailwindcss@3.3.3 → chokidar@3.5.3 → readdirp@3.6.0 → picomatch@2.3.1
- tailwindcss@3.3.3 → micromatch@4.0.5 → picomatch@2.3.1

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p) — moderate: Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching | `<2.3.2`; original matches 2.3.1 | Installed 2.3.2, 4.0.7 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) — high: Picomatch has a ReDoS vulnerability via extglob quantifiers | `<2.3.2`; original matches 2.3.1 | Installed 2.3.2, 4.0.7 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## postcss

Original installed versions: 8.4.14, 8.4.31. Direct dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- autoprefixer@10.4.16 → postcss@8.4.31
- next@13.4.12 → postcss@8.4.14
- postcss@8.4.31
- tailwindcss@3.3.3 → postcss-import@15.1.0 → postcss@8.4.31
- tailwindcss@3.3.3 → postcss-js@4.0.1 → postcss@8.4.31
- tailwindcss@3.3.3 → postcss-load-config@4.0.1 → postcss@8.4.31
- tailwindcss@3.3.3 → postcss-nested@6.0.1 → postcss@8.4.31
- tailwindcss@3.3.3 → postcss@8.4.31

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-7fh5-64p2-3v2j](https://github.com/advisories/GHSA-7fh5-64p2-3v2j) — moderate: PostCSS line return parsing error | `<8.4.31`; original matches 8.4.14 | Installed 8.5.29 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — moderate: PostCSS has XSS via Unescaped </style> in its CSS Stringify Output | `<8.5.10`; original matches 8.4.14, 8.4.31 | Installed 8.5.29 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) — high: PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments | `<=8.5.11`; original matches 8.4.14, 8.4.31 | Installed 8.5.29 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) — moderate: PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset | `<=8.5.22`; original matches 8.4.14, 8.4.31 | Installed 8.5.29 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) — high: PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure | `<=8.5.17`; original matches 8.4.14, 8.4.31 | Installed 8.5.29 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## postcss-nested

Original installed versions: 6.0.1. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- tailwindcss@3.3.3 → postcss-nested@6.0.1

Inherited vulnerability only, via: postcss-selector-parser. No separate advisory attached to this package.

Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation.

## postcss-selector-parser

Original installed versions: 6.0.13. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- tailwindcss@3.3.3 → postcss-nested@6.0.1 → postcss-selector-parser@6.0.13
- tailwindcss@3.3.3 → postcss-selector-parser@6.0.13

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) — moderate: PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion | `<7.1.6`; original matches 6.0.13 | Installed 7.1.6 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## protobufjs

Original installed versions: 7.2.5. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- livekit-server-sdk@1.2.7 → protobufjs@7.2.5

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) — critical: Arbitrary code execution in protobufjs | `<7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-66ff-xgx4-vchm](https://github.com/advisories/GHSA-66ff-xgx4-vchm) — high: protobuf.js: Code injection through bytes field defaults in generated toObject code | `<=7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-2pr8-phx7-x9h3](https://github.com/advisories/GHSA-2pr8-phx7-x9h3) — moderate: protobuf.js: Denial of service from crafted field names in generated code | `<=7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-fx83-v9x8-x52w](https://github.com/advisories/GHSA-fx83-v9x8-x52w) — moderate: protobuf.js: Prototype injection in generated message constructors | `<=7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-75px-5xx7-5xc7](https://github.com/advisories/GHSA-75px-5xx7-5xc7) — high: protobuf.js: Code generation gadget after prototype pollution | `<=7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-jvwf-75h9-cwgg](https://github.com/advisories/GHSA-jvwf-75h9-cwgg) — high: protobuf.js: Process-wide denial of service through unsafe option paths | `<=7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-685m-2w69-288q](https://github.com/advisories/GHSA-685m-2w69-288q) — high: protobuf.js: Denial of service through unbounded protobuf recursion | `<=7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-q6x5-8v7m-xcrf](https://github.com/advisories/GHSA-q6x5-8v7m-xcrf) — moderate: protobufjs has overlong UTF-8 decoding | `<=7.5.5`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-jggg-4jg4-v7c6](https://github.com/advisories/GHSA-jggg-4jg4-v7c6) — moderate: protobufjs: Denial of Service via unbounded recursive JSON descriptor expansion | `<=7.5.7`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-wcpc-wj8m-hjx6](https://github.com/advisories/GHSA-wcpc-wj8m-hjx6) — high: protobufjs: Denial of service through unbounded Any expansion during JSON conversion | `<=7.6.0`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |
| [GHSA-f38q-mgvj-vph7](https://github.com/advisories/GHSA-f38q-mgvj-vph7) — moderate: protobufjs : Schema-derived names can shadow runtime-significant properties | `<=7.6.2`; original matches 7.2.5 | Installed 7.6.6 (outside affected range) | LiveKit client/protocol dependency decodes network messages. No user-uploaded protobuf schema parser is exposed; dynamic-schema/code-generation advisories are conditional. Patched same-major transitives retained. Compatible transitive refresh or package removal; build/tests verify integration. |

## query-string

Original installed versions: 8.1.0. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- query-string@8.1.0

Inherited vulnerability only, via: decode-uri-component. No separate advisory attached to this package.

Browser search/category query serialization is used. Malformed URL decoding exposure is conditional; upgraded query-string 9 and patched decoder preserve serialization call sites.

## quill

Original installed versions: 1.3.10, 1.3.7. Transitive dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- react-quill@2.0.0 → quill@1.3.7

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-4943-9vgg-gr5r](https://github.com/advisories/GHSA-4943-9vgg-gr5r) — moderate: Cross-site Scripting in quill | `<=1.3.7`; original matches 1.3.7 | Installed 2.0.3 (outside affected range) | Browser teacher rich-text editor and student preview are used. Quill 1 is replaced by Quill 2; semantic HTML export is explicitly disabled to bypass its remaining unpatched export issue while retaining DOM-serialized HTML. Major/API migration; see report. |

## react-quill

Original installed versions: 2.0.0. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- react-quill@2.0.0

Inherited vulnerability only, via: quill. No separate advisory attached to this package.

Browser teacher rich-text editor and student preview are used. Quill 1 is replaced by Quill 2; semantic HTML export is explicitly disabled to bypass its remaining unpatched export issue while retaining DOM-serialized HTML.

## source-map-js

Original installed versions: 1.0.2. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- next@13.4.12 → postcss@8.4.14 → source-map-js@1.0.2
- postcss@8.4.31 → source-map-js@1.0.2

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — high: source-map-js allows event-loop denial of service through indexed source-map section offsets | `>=1.0.0 <1.2.2`; original matches 1.0.2 | Installed 1.2.2 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## tailwindcss

Original installed versions: 3.3.3. Direct dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- tailwindcss-animate@1.0.7 → tailwindcss@3.3.3
- tailwindcss@3.3.3
- uploadthing@7.7.4 → tailwindcss@3.3.3

Inherited vulnerability only, via: postcss-nested, postcss-selector-parser. No separate advisory attached to this package.

Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation.

## uploadthing

Original installed versions: 7.7.4. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @uploadthing/react@7.3.3 → uploadthing@7.7.4
- uploadthing@7.7.4

Inherited vulnerability only, via: @uploadthing/shared, effect. No separate advisory attached to this package.

UploadThing uses Effect in upload request processing alongside Clerk auth. AsyncLocalStorage contamination is a plausible identity risk; exact exploit not demonstrated. Compatible Effect 3 patch override tested.

## yaml

Original installed versions: 2.3.2. Transitive dependency. Primarily build/lint/watch.

Original introducing chains (all distinct npm ls paths):

- tailwindcss@3.3.3 → postcss-load-config@4.0.1 → yaml@2.3.2

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp) — moderate: yaml is vulnerable to Stack Overflow via deeply nested YAML collections | `>=2.0.0 <2.8.3`; original matches 2.3.2 | Installed 2.9.1 (outside affected range) | Build/lint/watch dependency. Repository-owned patterns/configuration are trusted; no student-controlled glob or config input is accepted. Some packages remain in production install through UploadThing optional Tailwind peer; installed does not imply runtime invocation. Compatible transitive refresh or package removal; build/tests verify integration. |

## zod

Original installed versions: 4.6.5, 3.21.4, 3.22.4. Direct dependency. Runtime/browser or SDK helper; see exposure.

Original introducing chains (all distinct npm ls paths):

- @neon/config@1.8.2 → zod@4.6.5
- @neon/env@1.4.7 → zod@4.6.5
- next@13.4.12 → zod@3.21.4
- zod@3.22.4

| Advisory / severity | Affected range | Remediation version | Application reachability / compatibility |
|---|---|---|---|
| [GHSA-m95q-7qp3-xv42](https://github.com/advisories/GHSA-m95q-7qp3-xv42) — moderate: Zod denial of service vulnerability | `<=3.22.2`; original matches 3.21.4 | Installed 3.22.4 (outside affected range) | Transitive helper in browser/build/runtime package chain below. No dedicated attacker-facing parser endpoint identified; exact vulnerable operation not proven reachable. Patched compatible version installed. Compatible transitive refresh or package removal; build/tests verify integration. |

## Remaining package entries

| Package | Severity | Advisory / inherited cause |
|---|---|---|
| @next/eslint-plugin-next | high | fast-glob |
| braces | high | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| chokidar | high | braces |
| eslint-config-next | high | @next/eslint-plugin-next |
| fast-glob | high | micromatch |
| micromatch | high | braces |
| quill | low | [GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25) |
| react-quill-new | low | quill |
| tailwindcss | high | chokidar, fast-glob, micromatch |

Original advisory rows: 139.
