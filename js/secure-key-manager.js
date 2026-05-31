/**
 * secure-key-manager.js  — BGF Revival IV
 *
 * SECURITY FIX: The previous version of this file stored a Brevo/Sendinblue
 * API key in client-side JavaScript using base64 "obfuscation", which provided
 * zero real protection. Any visitor could recover the key in seconds via
 * DevTools → Sources or simply running atob() in the console.
 *
 * The key has been removed from the client entirely.
 * All email / mail operations are now handled exclusively by server-side
 * functions (Netlify or Cloudflare Pages) that read the key from environment
 * variables, which are never exposed to the browser.
 *
 * This stub is kept so that any existing <script src="js/secure-key-manager.js">
 * tags do not produce 404 errors. It exports the same public API shape so
 * that no call-sites in index.html need to change.
 */

(function (global) {
    'use strict';

    /** No-op class — key management is now server-side only. */
    class SecureKeyManager {
        getKey()       { return null; }
        validateKey()  { return false; }
        getSecureKey() { return null; }
    }

    global.SecureKeyManager = SecureKeyManager;
    global.keyManager       = new SecureKeyManager();
})(typeof window !== 'undefined' ? window : globalThis);