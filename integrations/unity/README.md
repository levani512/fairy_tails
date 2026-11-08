# Unity integration contract

Open the shared web application at `/` or `/player/{storyId}?language=en`. The C# example is plugin-neutral: connect SendJsonToWebView and OnWebMessage to the existing app's approved WebView plugin. `bridge.ts` validates inbound versioned commands. A native message must originate from the containing trusted WebView, never arbitrary window messages.

Messages use `{version:1,type,...}`. Inbound: OPEN_STORY with storyId and language; CLOSE_PLAYER. Outbound: PLAYER_READY, STORY_STARTED, STORY_COMPLETED, RETURN_TO_UNITY, ERROR, SESSION_EXPIRED. The example is an integration contract; native subscription verification and bridge wiring remain integration work.

Required production session flow: the native app sends its existing proof to a trusted server verifier over HTTPS POST. The verifier returns a single-use exchange code (60-second expiry, audience and nonce bound). Exchange via POST for a short-lived Secure HttpOnly SameSite cookie in the WebView. Resolve channel, country, and entitlement from that server session. Never trust URL parameters or JavaScript claims about Premium. No production validator or exchange endpoint is simulated here: the current production API is Free-only; DISTRIBUTION_CHANNEL selects a deployment default.

Test on real iOS WKWebView and Android WebView: inline video, initial audio gesture, background pause, rotation, memory pressure, back navigation, expiration, and persistent storage. Offline support in embedded WebViews is unverified and must not be advertised yet. Never send long-lived credentials in URLs or log proofs. Offline Premium licenses currently have a one-day development expiry; production needs signed licenses and revalidation, and downloadable files are not DRM.
