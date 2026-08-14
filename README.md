> ⚠️ **本仓库已归档。** 此插件已并入 [Junt184/dsh-ui-beautify](https://github.com/Junt184/dsh-ui-beautify)「美化套件」——一个插件包含背景 / 字体 / 粒子全部功能，且旧设置自动迁移。请改用 `dsh-ui-beautify`。
>
> 安装：`dsh plugin --profile web add github:Junt184/dsh-ui-beautify`


# dsh-ui-background

为 `dsh` 的 Web 界面（`dsh web`）增加 Apple 风格背景外观：**多图动态壁纸轮播（交叉淡入）**、**Ken Burns 缓动**、**毛玻璃模糊**、**透明背景**、**背景不透明度**，并在「设置 → 常规」里注册一行控制面板。

## 功能

| 设置项 | 作用 |
|---|---|
| 背景图片（每行一个） | 整页铺一层固定全屏背景（`background-size: cover`，位于最底层）；支持 `http(s)://`、`data:`、以及本地 `file://` / 绝对路径（经宿主 loopback 路由读取）；多行自动轮播 |
| 轮播间隔 | 秒数，0 = 不轮播；切换时两图层交叉淡入（1.6s ease-in-out） |
| Ken Burns 缓动 | 开启后背景缓慢缩放平移（60s ease-in-out alternate），像 macOS 动态壁纸 |
| 毛玻璃模糊 | 0–40px，背景虚化成毛玻璃，文字更清晰 |
| 透明背景 | 开启后把各层表面背景色（`--dsw-alias-bg-layer-*`、`--dsw-specific-sidebar-fill`）也设为 `transparent`，让背景图彻底透出 |
| 背景不透明度 | 0–100%，控制背景层的 `opacity` |

填了图片后，应用**底层会自动变透明**让图片透出来，无需手动勾选「透明背景」；「透明背景」是进一步把侧栏和各层表面也变透明。旧版（v0.1）单张图片的设置会自动迁移为轮播列表。

> 说明：Web 页面无法让浏览器窗口本身「透明到桌面」；这里的「透明背景」指应用表面透明，露出底下的背景图层（或页面底色）。

## 持久化方式：localStorage（重要）

设置保存在浏览器的 **localStorage**（键 `dsh-ui-background:v1`，按 origin 隔离），而不是 `$DSH_HOME/settings.yaml`。

原因：DSH 的 Web 设置 API 对命名空间有**白名单**（`dsh-host-apiproxy` 里的 `WEB_SETTINGS_NAMESPACES` / `PRODUCT_SETTINGS_NAMESPACES`）。第三方插件自己注册的命名空间不在白名单里，会被 `settings-not-exposed` 拒绝——这是框架当前的一个已知限制（源码注释明确写了「让插件无需改核心即可暴露自己的配置」是 deferred work）。因此本插件采用 localStorage 自包含持久化，**不需要对核心做任何改动**。

代价：设置按浏览器 origin 保存，清理浏览器站点数据会清掉；不会写入 settings.yaml。

## 安装

插件是一个声明了 `dsh.bundle.patch` 的 npm 包，通过 `dsh plugin` 装进 profile：

```sh
# 直接从 GitHub 安装（推荐给其他人用；本包已带构建产物，无需编译）
dsh plugin --profile web add github:Junt184/dsh-ui-background

# 从本地目录软链安装（开发/迭代推荐，改源码后重启 dsh web 即生效）
dsh plugin --profile web add link:/绝对路径/dsh-ui-background

# 或打包成 tarball 后安装（发布形态）
npm pack
dsh plugin --profile web add file:/绝对路径/dsh-ui-background-0.1.0.tgz
```

装完重启 `dsh web`（插件集合的变化需要重启生效）。之后在 Web 界面左下角「设置 → 常规」里能看到「背景外观」一栏，排在「外观」下面。

## 结构

```
dsh-ui-background/
├── package.json        # 包元数据：dsh.bundle.patch + dsh.client + exports["./client"]
├── cordis.patch.yml    # bundle patch：把本插件插入 web 的浏览器 roster（一个双面行）
└── lib/
    ├── index.js        # 宿主半部：注册 loopback-only 的本地图片路由 /dsh-ui-background/image
    └── client.js       # 客户端半部：__ModuleLoader__.load 闭包，含设置行 + 背景应用 + localStorage
```

## 工作原理

- **客户端半部** `lib/client.js`：
  - 注入一段 `<style>`，用 `body::before` + CSS 变量（`--dsh-bg-image-url` / `--dsh-bg-opacity`）画背景图层；
  - 通过 `ctx.theme.overrideTokens('dsh-ui-background', …)` 覆盖表面背景 token 实现透明；
  - 用 `ctx.slots.inject('settings.general.item', …)` 注册设置行，写法对齐内置的 `dsh-client-ui-theme` Appearance 行；
  - 设置读写走 `localStorage`（`loadSettings` / `saveSettings`），改动即时应用并同步行内状态。
- **宿主半部** `lib/index.js` 注册一条 **loopback-only** 路由 `/dsh-ui-background/image?path=…`：把本地图片文件读出来回给浏览器（浏览器禁止 http 页面直接加载 `file://` 资源），非本机请求返回 403。本插件不在宿主侧注册设置命名空间（注册了也会被 Web 白名单挡住）。

## 重新构建（可选的正规流程）

本包直接提供已构建的 `lib/`（纯 JS，无需构建即可安装）。若要用 TypeScript / tsdown 走 monorepo 正规构建，可在 clone 的 `deepseek-harness` 仓库内参照 `packages/client/ui-theme` 的 `tsdown.config.ts`（共享 `clientBundle` 预设）搭建，产物仍落到 `lib/index.js` 与 `lib/client.js`。
