// Client bundle of dsh-ui-background. Emitted as a closure-factory artifact:
// this script only registers its factory; the body runs at materialization.
// Platform modules (react, react/jsx-runtime, @deepseek-ai/dsh-client-runtime/client)
// resolve through the injected `require` against the shell's frozen module table.
//
// Persistence uses localStorage (per-origin). The Web settings API is
// allowlisted to first-party namespaces (WEB_SETTINGS_NAMESPACES in
// dsh-host-apiproxy), so a third-party plugin cannot currently reach its own
// durable settings namespace from the browser — localStorage keeps this plugin
// self-contained and free of any core patch.
window.__ModuleLoader__.load({
  id: 'dsh-ui-background',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var jsx = require('react/jsx-runtime')
    var React = require('react')
    var runtimeClient = require('@deepseek-ai/dsh-client-runtime/client')
    var defineStore = runtimeClient.defineStore

    var SETTINGS_NS = 'settings.background'
    var PACKAGE_ID = 'dsh-ui-background'
    var STORAGE_KEY = 'dsh-ui-background:v1'

    // ── locale dictionaries (zh is the key-set source of truth) ────────────────
    var zh = {
      'background.title': '背景外观',
      'background.imageLabel': '背景图片 URL',
      'background.imagePlaceholder': '粘贴图片地址，留空表示无背景',
      'background.transparentLabel': '透明背景',
      'background.opacityLabel': '背景不透明度',
    }
    var en = {
      'background.title': 'Background',
      'background.imageLabel': 'Background image URL',
      'background.imagePlaceholder': 'Paste an image URL; leave empty for none',
      'background.transparentLabel': 'Transparent background',
      'background.opacityLabel': 'Background opacity',
    }

    // ── injected stylesheet (background layer + row chrome) ────────────────────
    var STYLE_TEXT = [
      ':root {',
      '  --dsh-bg-image-url: none;',
      '  --dsh-bg-opacity: 1;',
      '}',
      'body::before {',
      '  content: "";',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  right: 0;',
      '  bottom: 0;',
      '  background-image: var(--dsh-bg-image-url);',
      '  background-size: cover;',
      '  background-position: center;',
      '  background-repeat: no-repeat;',
      '  opacity: var(--dsh-bg-opacity);',
      '  z-index: -1;',
      '  pointer-events: none;',
      '}',
      '.dshbg-row {',
      '  padding: 16px 0;',
      '  border-bottom: 1px solid var(--dsw-alias-border-l2);',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 10px;',
      '}',
      '.dshbg-title {',
      '  color: var(--dsw-alias-label-primary);',
      '  font-size: 14px;',
      '  font-weight: 600;',
      '  line-height: 22px;',
      '}',
      '.dshbg-field {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 6px;',
      '}',
      '.dshbg-check {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  color: var(--dsw-alias-label-primary);',
      '  font-size: 13px;',
      '  line-height: 20px;',
      '  cursor: pointer;',
      '}',
      '.dshbg-label {',
      '  color: var(--dsw-alias-label-primary);',
      '  font-size: 13px;',
      '  line-height: 20px;',
      '}',
      '.dshbg-input {',
      '  box-sizing: border-box;',
      '  width: 100%;',
      '  color: var(--dsw-alias-label-primary);',
      '  background: var(--dsw-alias-bg-layer-1);',
      '  border: 1px solid var(--dsw-alias-border-l2);',
      '  border-radius: 8px;',
      '  padding: 8px 10px;',
      '  font-size: 13px;',
      '  line-height: 20px;',
      '}',
      '.dshbg-slider {',
      '  width: 100%;',
      '}',
    ].join('\n')

    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + PACKAGE_ID + '/styles"]') === null) {
      var styleTag = document.createElement('style')
      styleTag.dataset.plugin = PACKAGE_ID
      styleTag.dataset.pluginCss = PACKAGE_ID + '/styles'
      styleTag.textContent = STYLE_TEXT
      document.head.appendChild(styleTag)
    }

    // ── localStorage-backed settings ────────────────────────────────────────────
    function loadSettings() {
      try {
        var raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        if (raw) {
          var parsed = JSON.parse(raw)
          return {
            imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : '',
            transparent: !!parsed.transparent,
            opacity: typeof parsed.opacity === 'number' ? parsed.opacity : 1,
          }
        }
      } catch (e) { /* fall through to defaults */ }
      return { imageUrl: '', transparent: false, opacity: 1 }
    }

    function saveSettings(settings) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch (e) { /* non-fatal */ }
    }

    // Map a user-supplied URL to a CSS background-image value. `file://` URLs
    // and bare absolute paths are served through the host's loopback-only
    // image route (the browser refuses to load file:// from http pages);
    // http(s)/data/relative URLs pass through unchanged.
    function backgroundImageValue(url) {
      if (!url) return 'none'
      if (url.indexOf('file://') === 0) {
        var rawPath = url.slice('file://'.length)
        var filePath
        try { filePath = decodeURIComponent(rawPath) } catch (e) { filePath = rawPath }
        return 'url("/dsh-ui-background/image?path=' + encodeURIComponent(filePath) + '")'
      }
      if (url.charAt(0) === '/') {
        return 'url("/dsh-ui-background/image?path=' + encodeURIComponent(url) + '")'
      }
      return 'url("' + url.replace(/"/g, '\\"') + '")'
    }

    // ── settings row store (mirror of the current settings) ────────────────────
    function createBackgroundRowStore(initial) {
      return defineStore({
        init: () => ({ imageUrl: initial.imageUrl, transparent: initial.transparent, opacity: initial.opacity }),
        actions: {
          sync: (d, s) => {
            d.imageUrl = s.imageUrl
            d.transparent = s.transparent
            d.opacity = s.opacity
          },
        },
      })
    }

    // ── settings row component (registered into settings.general.item) ─────────
    function BackgroundRow(props) {
      var t = props.t
      var useStore = props.useStore
      var setImageUrl = props.setImageUrl
      var setTransparent = props.setTransparent
      var setOpacity = props.setOpacity

      var imageUrl = useStore(function (s) { return s.imageUrl })
      var transparent = useStore(function (s) { return s.transparent })
      var opacity = useStore(function (s) { return s.opacity })

      var draftState = React.useState(imageUrl)
      var draft = draftState[0]
      var setDraft = draftState[1]
      React.useEffect(function () { setDraft(imageUrl) }, [imageUrl])

      function commitImage() {
        setImageUrl(draft.trim())
      }

      return jsx.jsxs('div', { className: 'dshbg-row', children: [
        jsx.jsx('div', { className: 'dshbg-title', children: t('background.title') }),

        jsx.jsxs('div', { className: 'dshbg-field', children: [
          jsx.jsx('label', { className: 'dshbg-label', children: t('background.imageLabel') }),
          jsx.jsx('input', {
            type: 'text',
            value: draft,
            placeholder: t('background.imagePlaceholder'),
            className: 'dshbg-input',
            onChange: function (e) { setDraft(e.target.value) },
            onBlur: commitImage,
            onKeyDown: function (e) {
              if (e.key === 'Enter') { commitImage(); e.target.blur() }
            },
          }),
        ]}),

        jsx.jsxs('label', { className: 'dshbg-check', children: [
          jsx.jsx('input', {
            type: 'checkbox',
            checked: transparent,
            onChange: function (e) { setTransparent(e.target.checked) },
          }),
          jsx.jsx('span', { children: t('background.transparentLabel') }),
        ]}),

        jsx.jsxs('div', { className: 'dshbg-field', children: [
          jsx.jsx('label', { className: 'dshbg-label', children: t('background.opacityLabel') + ' · ' + Math.round(opacity * 100) + '%' }),
          jsx.jsx('input', {
            type: 'range',
            min: 0,
            max: 1,
            step: 0.01,
            value: opacity,
            className: 'dshbg-slider',
            onChange: function (e) { setOpacity(parseFloat(e.target.value)) },
          }),
        ]}),
      ]})
    }

    // ── client plugin body ──────────────────────────────────────────────────────
    var inject = ['theme', 'slots', 'locale']

    function apply(ctx) {
      var settings = loadSettings()

      var overrideDisposer = null
      function applyBackground(section) {
        var imageUrl = (section && typeof section.imageUrl === 'string') ? section.imageUrl : ''
        var transparent = !!(section && section.transparent)
        var opacity = (section && typeof section.opacity === 'number') ? section.opacity : 1

        if (typeof document !== 'undefined') {
          var root = document.documentElement
          root.style.setProperty('--dsh-bg-image-url', backgroundImageValue(imageUrl))
          root.style.setProperty('--dsh-bg-opacity', String(opacity))
        }

        // Recompute the surface-transparency override. Setting an image makes
        // the base background transparent so the image shows through the main
        // area; the "transparent" toggle additionally clears the raised
        // surfaces and the sidebar.
        var tokens = {}
        if (imageUrl !== '' || transparent) {
          tokens['--dsw-alias-bg-base'] = { light: 'transparent', dark: 'transparent' }
        }
        if (transparent) {
          tokens['--dsw-alias-bg-layer-1'] = { light: 'transparent', dark: 'transparent' }
          tokens['--dsw-alias-bg-layer-2'] = { light: 'transparent', dark: 'transparent' }
          tokens['--dsw-alias-bg-layer-3'] = { light: 'transparent', dark: 'transparent' }
          tokens['--dsw-specific-sidebar-fill'] = { light: 'transparent', dark: 'transparent' }
        }
        if (overrideDisposer !== null) {
          overrideDisposer()
          overrideDisposer = null
        }
        if (Object.keys(tokens).length > 0) {
          overrideDisposer = ctx.theme.overrideTokens(PACKAGE_ID, tokens)
        }
      }

      applyBackground(settings)

      ctx.effect(function () {
        return ctx.locale.register(SETTINGS_NS, { zh: zh, en: en })
      }, 'ui-background: settings row dictionaries')

      var store = createBackgroundRowStore(settings)
      var bound = null

      function commit(patch) {
        settings = Object.assign({}, settings, patch)
        saveSettings(settings)
        applyBackground(settings)
        if (bound !== null) bound.sync(settings)
      }

      var injected = function (actions) {
        bound = actions
        bound.sync(settings)
        return {
          setImageUrl: function (v) { commit({ imageUrl: v }) },
          setTransparent: function (v) { commit({ transparent: v }) },
          setOpacity: function (v) { commit({ opacity: v }) },
        }
      }

      ctx.slots.inject('settings.general.item', function () {
        return ctx.slots.register({
          name: 'settings.general.item',
          id: 'background',
          order: 20,
          store: store,
          locale: SETTINGS_NS,
          inject: injected,
        }, BackgroundRow)
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
