// Client bundle of dsh-ui-background (v0.2). Emitted as a closure-factory
// artifact: this script only registers its factory; the body runs at
// materialization. Platform modules resolve through the injected `require`.
//
// Apple-style appearance: wallpaper carousel with crossfade + Ken Burns slow
// zoom, frosted-glass blur, opacity, and a transparent-surface toggle.
// Persistence uses localStorage (per-origin) — the Web settings API is
// allowlisted to first-party namespaces, so a third-party plugin keeps its
// preferences client-side. See README.
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
      'background.imagesLabel': '背景图片（每行一个）',
      'background.imagesPlaceholder': '每行一个地址：支持 http(s)://、file:// 或绝对路径，多行自动轮播',
      'background.intervalLabel': '轮播间隔（秒，0 = 不轮播）',
      'background.kenburnsLabel': 'Ken Burns 缓动（缓慢缩放）',
      'background.blurLabel': '毛玻璃模糊',
      'background.opacityLabel': '背景不透明度',
      'background.transparentLabel': '透明背景',
    }
    var en = {
      'background.title': 'Background',
      'background.imagesLabel': 'Background images (one per line)',
      'background.imagesPlaceholder': 'One URL per line: http(s)://, file:// or an absolute path; multiple lines auto-rotate',
      'background.intervalLabel': 'Rotation interval (seconds, 0 = off)',
      'background.kenburnsLabel': 'Ken Burns slow zoom',
      'background.blurLabel': 'Frosted glass blur',
      'background.opacityLabel': 'Background opacity',
      'background.transparentLabel': 'Transparent background',
    }

    // ── injected stylesheet (two crossfade layers + row chrome) ────────────────
    var STYLE_TEXT = [
      ':root {',
      '  --dsh-bg-layer-a: none;',
      '  --dsh-bg-layer-a-opacity: 0;',
      '  --dsh-bg-layer-b: none;',
      '  --dsh-bg-layer-b-opacity: 0;',
      '  --dsh-bg-opacity: 1;',
      '  --dsh-bg-blur: 0px;',
      '}',
      'body::before, body::after {',
      '  content: "";',
      '  position: fixed;',
      '  top: -6%;',
      '  left: -6%;',
      '  right: -6%;',
      '  bottom: -6%;',
      '  z-index: -1;',
      '  pointer-events: none;',
      '  background-size: cover;',
      '  background-position: center;',
      '  background-repeat: no-repeat;',
      '  opacity: 0;',
      '  transition: opacity 1.6s ease-in-out;',
      '  filter: blur(var(--dsh-bg-blur));',
      '  will-change: transform, opacity;',
      '}',
      'body::before { background-image: var(--dsh-bg-layer-a); opacity: var(--dsh-bg-layer-a-opacity); }',
      'body::after { background-image: var(--dsh-bg-layer-b); opacity: var(--dsh-bg-layer-b-opacity); }',
      'body.dshbg-kenburns::before, body.dshbg-kenburns::after {',
      '  animation: dshbg-kenburns 60s ease-in-out infinite alternate;',
      '}',
      '@keyframes dshbg-kenburns {',
      '  from { transform: scale(1.02) translate3d(0, 0, 0); }',
      '  to { transform: scale(1.16) translate3d(-1.5%, 1%, 0); }',
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
      '  font-family: inherit;',
      '}',
      '.dshbg-textarea {',
      '  resize: vertical;',
      '  min-height: 64px;',
      '}',
      '.dshbg-slider {',
      '  width: 100%;',
      '}',
      '.dshbg-num {',
      '  width: 90px;',
      '}',
    ].join('\n')

    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + PACKAGE_ID + '/styles"]') === null) {
      var styleTag = document.createElement('style')
      styleTag.dataset.plugin = PACKAGE_ID
      styleTag.dataset.pluginCss = PACKAGE_ID + '/styles'
      styleTag.textContent = STYLE_TEXT
      document.head.appendChild(styleTag)
    }

    // ── localStorage-backed settings (v1 shape migrated in) ────────────────────
    function loadSettings() {
      try {
        var raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        if (raw) {
          var parsed = JSON.parse(raw)
          var images = Array.isArray(parsed.images)
            ? parsed.images.filter(function (x) { return typeof x === 'string' })
            : []
          // migrate the v1 single-image shape
          if (images.length === 0 && typeof parsed.imageUrl === 'string' && parsed.imageUrl !== '') {
            images = [parsed.imageUrl]
          }
          return {
            images: images,
            interval: typeof parsed.interval === 'number' ? parsed.interval : 60,
            kenBurns: parsed.kenBurns !== false,
            blur: typeof parsed.blur === 'number' ? parsed.blur : 0,
            transparent: !!parsed.transparent,
            opacity: typeof parsed.opacity === 'number' ? parsed.opacity : 1,
          }
        }
      } catch (e) { /* fall through to defaults */ }
      return { images: [], interval: 60, kenBurns: true, blur: 0, transparent: false, opacity: 1 }
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
        init: () => ({
          images: initial.images.slice(),
          interval: initial.interval,
          kenBurns: initial.kenBurns,
          blur: initial.blur,
          transparent: initial.transparent,
          opacity: initial.opacity,
        }),
        actions: {
          sync: (d, s) => {
            d.images = s.images.slice()
            d.interval = s.interval
            d.kenBurns = s.kenBurns
            d.blur = s.blur
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
      var setImages = props.setImages
      var setIntervalSec = props.setIntervalSec
      var setKenBurns = props.setKenBurns
      var setBlur = props.setBlur
      var setOpacity = props.setOpacity
      var setTransparent = props.setTransparent

      var images = useStore(function (s) { return s.images })
      var interval = useStore(function (s) { return s.interval })
      var kenBurns = useStore(function (s) { return s.kenBurns })
      var blur = useStore(function (s) { return s.blur })
      var opacity = useStore(function (s) { return s.opacity })
      var transparent = useStore(function (s) { return s.transparent })

      var draftState = React.useState(images.join('\n'))
      var draft = draftState[0]
      var setDraft = draftState[1]
      React.useEffect(function () { setDraft(images.join('\n')) }, [images])

      function commitImages() {
        var list = draft.split('\n').map(function (line) { return line.trim() }).filter(Boolean)
        setImages(list)
      }

      return jsx.jsxs('div', { className: 'dshbg-row', children: [
        jsx.jsx('div', { className: 'dshbg-title', children: t('background.title') }),

        jsx.jsxs('div', { className: 'dshbg-field', children: [
          jsx.jsx('label', { className: 'dshbg-label', children: t('background.imagesLabel') }),
          jsx.jsx('textarea', {
            value: draft,
            placeholder: t('background.imagesPlaceholder'),
            className: 'dshbg-input dshbg-textarea',
            onChange: function (e) { setDraft(e.target.value) },
            onBlur: commitImages,
          }),
        ]}),

        jsx.jsxs('div', { className: 'dshbg-field', children: [
          jsx.jsx('label', { className: 'dshbg-label', children: t('background.intervalLabel') }),
          jsx.jsx('input', {
            type: 'number',
            min: 0,
            step: 5,
            value: interval,
            className: 'dshbg-input dshbg-num',
            onChange: function (e) {
              var v = parseInt(e.target.value, 10)
              setIntervalSec(Number.isFinite(v) ? Math.max(0, v) : 0)
            },
          }),
        ]}),

        jsx.jsxs('label', { className: 'dshbg-check', children: [
          jsx.jsx('input', {
            type: 'checkbox',
            checked: kenBurns,
            onChange: function (e) { setKenBurns(e.target.checked) },
          }),
          jsx.jsx('span', { children: t('background.kenburnsLabel') }),
        ]}),

        jsx.jsxs('div', { className: 'dshbg-field', children: [
          jsx.jsx('label', { className: 'dshbg-label', children: t('background.blurLabel') + ' · ' + Math.round(blur) + 'px' }),
          jsx.jsx('input', {
            type: 'range',
            min: 0,
            max: 40,
            step: 1,
            value: blur,
            className: 'dshbg-slider',
            onChange: function (e) { setBlur(parseFloat(e.target.value)) },
          }),
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

        jsx.jsxs('label', { className: 'dshbg-check', children: [
          jsx.jsx('input', {
            type: 'checkbox',
            checked: transparent,
            onChange: function (e) { setTransparent(e.target.checked) },
          }),
          jsx.jsx('span', { children: t('background.transparentLabel') }),
        ]}),
      ]})
    }

    // ── client plugin body ──────────────────────────────────────────────────────
    var inject = ['theme', 'slots', 'locale']

    function apply(ctx) {
      var settings = loadSettings()

      var overrideDisposer = null
      var rotationTimer = null
      var activeLayer = 'a'
      var rotationIndex = 0

      function setLayerVars(layer, imageValue, opacity) {
        if (typeof document === 'undefined') return
        document.documentElement.style.setProperty('--dsh-bg-layer-' + layer, imageValue)
        document.documentElement.style.setProperty('--dsh-bg-layer-' + layer + '-opacity', String(opacity))
      }

      function renderLayers(values, rotating) {
        if (values.length === 0) {
          setLayerVars('a', 'none', 0)
          setLayerVars('b', 'none', 0)
          return
        }
        var current = values[rotationIndex]
        var nextValue = rotating ? values[(rotationIndex + 1) % values.length] : 'none'
        if (activeLayer === 'a') {
          setLayerVars('a', current, 1)
          setLayerVars('b', nextValue, 0)
        } else {
          setLayerVars('b', current, 1)
          setLayerVars('a', nextValue, 0)
        }
      }

      function applyBackground(section) {
        var images = (section && Array.isArray(section.images)) ? section.images : []
        var interval = (section && typeof section.interval === 'number') ? Math.max(0, section.interval) : 0
        var kenBurns = section ? section.kenBurns !== false : true
        var blur = (section && typeof section.blur === 'number') ? Math.min(40, Math.max(0, section.blur)) : 0
        var transparent = !!(section && section.transparent)
        var opacity = (section && typeof section.opacity === 'number') ? section.opacity : 1

        var values = images
          .filter(function (u) { return typeof u === 'string' && u.trim() !== '' })
          .map(function (u) { return backgroundImageValue(u.trim()) })
        var hasImages = values.length > 0
        var rotating = values.length > 1 && interval > 0
        if (rotationIndex >= values.length) rotationIndex = 0

        if (typeof document !== 'undefined') {
          var root = document.documentElement
          root.style.setProperty('--dsh-bg-opacity', String(opacity))
          root.style.setProperty('--dsh-bg-blur', blur + 'px')
          if (document.body) document.body.classList.toggle('dshbg-kenburns', hasImages && kenBurns)
        }

        renderLayers(values, rotating)

        // rotation timer: crossfade to the next image on the inactive layer
        if (rotationTimer !== null) { clearInterval(rotationTimer); rotationTimer = null }
        if (rotating) {
          var tickMs = Math.max(5, interval) * 1000
          rotationTimer = setInterval(function () {
            rotationIndex = (rotationIndex + 1) % values.length
            activeLayer = activeLayer === 'a' ? 'b' : 'a'
            renderLayers(values, true)
          }, tickMs)
        }

        // surface transparency: setting images clears the base background so
        // the wallpaper shows through; the "transparent" toggle additionally
        // clears raised surfaces and the sidebar.
        var tokens = {}
        if (hasImages || transparent) {
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
        return function () {
          if (rotationTimer !== null) clearInterval(rotationTimer)
        }
      }, 'ui-background: rotation timer cleanup')

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
          setImages: function (v) { commit({ images: v }) },
          setIntervalSec: function (v) { commit({ interval: v }) },
          setKenBurns: function (v) { commit({ kenBurns: v }) },
          setBlur: function (v) { commit({ blur: v }) },
          setOpacity: function (v) { commit({ opacity: v }) },
          setTransparent: function (v) { commit({ transparent: v }) },
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
