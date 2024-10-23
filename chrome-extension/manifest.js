import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */

const manifest = Object.assign({
  manifest_version: 3,
  default_locale: 'en',
  /**
   * if you want to support multiple languages, you can use the following reference
   * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
   */
  name: '__MSG_extensionName__',
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  permissions: ['storage', 'tabs'],
  host_permissions: ['https://api.anthropic.com/*', 'http://localhost*'],
  options_page: 'options/index.html',
  background: {
    service_worker: 'background.iife.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'logo.png',
  },
  icons: {
    128: 'logo.png',
  },
  content_scripts: [
    {
      matches: ['*://www.youtube.com/*'],
      js: ['content/index.iife.js'],
    },
    {
      matches: ['*://www.youtube.com/*'],
      js: ['content-ui/index.iife.js'],
      run_at: 'document_start',
    },
    {
      matches: ['*://www.youtube.com/*'],
      css: ['content.css'], // public folder
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'logo.png', 'logo.png'],
      matches: ['*://*/*'],
    },
  ],
});

export default manifest;
