# 大纲一键转思维导图（outline-mindmap-zh）

把中文 Markdown 大纲转成可以离线打开的交互思维导图。默认是单个 HTML 文件，也可以导出 SVG 或 PNG。版本 1.0.0。作者：Kevin技能工坊。

这不是 [markmap](https://github.com/markmap/markmap) 或其作者 Gerald 的官方产品，也不表示对方认可本工具。自写的命令行和说明使用 MIT；markmap、d3、yaml、MathJax 等仍使用各自许可证，详见 [NOTICE](NOTICE)。

截至 2026-11-20，可以在 WorkBuddy 市场搜索「大纲一键转思维导图」（2026-11-19 已免费上架）。本目录是同一工具整理后的源码，方便以后单独建仓。这里不收费，也不包含商店上架材料。

## 安装

需要 Node.js 22 或更新版本。`node -v` 可查看当前版本。

```bash
cd scripts
npm ci
cd ..
node scripts/convert.mjs --help
```

没有 lockfile 的环境可以用 `npm install`。首次安装需要联网。安装完成后，转换在本机完成，不上传 Markdown。国内镜像可写成 `npm ci --registry=https://registry.npmmirror.com`。

## 运行

在本目录执行：

```bash
node scripts/convert.mjs examples/meeting.md
node scripts/convert.mjs examples/meeting.md --format svg
node scripts/convert.mjs examples/meeting.md --format png
node scripts/convert.mjs examples -o /tmp/outline-demo --format html
node scripts/convert.mjs examples/article.md --no-toolbar
```

支持 `.md` 和 `.markdown`。输入是目录时会递归处理，并保留相对路径。默认输出在输入旁边：文件 `笔记.md` 对应目录 `笔记_思维导图/`，目录 `大纲` 对应 `大纲_思维导图/`。用 `-o` 或 `--output-dir` 指定别的目录，且不能和输入目录是同一个路径。

- `html`（默认）：单文件页面，用浏览器打开即可缩放、拖动、折叠。默认带工具栏，`--no-toolbar` 可关掉。
- `svg`：静态矢量图。
- `png`：静态位图。
- `all`：三种都生成。

已有产物默认跳过。`--overwrite` 会重做。每次运行都重写输出目录里的 `conversion-report.json`，里面有成功、失败、跳过和每个文件的路径。退出码：0 没有失败（含全部跳过），1 至少有一个文件失败，2 是参数或环境错误。

## 限制

- 只有标题和列表项会变成导图分支。段落、代码块、表格会留在所属节点的备注里。
- HTML 把资源打进单个文件，打开时不需要再访问 CDN。
- PNG 依赖可选包 `@napi-rs/canvas`（`@markmap/cli` 的 optionalDependency）。`npm ci` 在支持的平台上会安装它。装不上时 PNG 会失败；SVG 仍可生成，但文字尺寸是近似值。
- 本仓库在 2026-11-20 只用 Linux、Node.js 22.23.4 跑过测试。没有在 macOS 或 Windows 上复测。
- 转换脚本固定调用 `@markmap/cli@1.0.0`。这个版本的入口是 `dist/cli.js`。1.0.0 源包里曾经先找 `bin/markmap.js`（该文件在这个版本中不存在），再退回 `node_modules/.bin/markmap`。现在改为优先使用 `dist/cli.js`。
- 不上传文件，也没有账号、支付或商店接口。输出文件请自行保管。

## 测试

```bash
cd scripts
npm ci
npm test
```

`npm test` 会运行 `tests/*.test.mjs`（Node.js 自带的 `node:test`）。覆盖帮助与错误参数、HTML / SVG / PNG、目录批处理、跳过与覆盖，并检查示例和许可证文本里没有内部待办口径。测试使用临时目录，不把导出结果写回仓库。

## 示例

`examples/meeting.md` 是一份虚构的学习小组周会。`examples/outline.md` 是虚构的读书分享大纲。`examples/article.md` 说明标题和列表怎样变成导图。三份都不是真实会议记录。

## 许可证

- 自写代码、说明、测试和示例：MIT，版权人 Kevin技能工坊。见 [LICENSE](LICENSE)。
- 上游：MIT 的 markmap（© 2020 Gerald）、WTFPL 的 d3-flextree 2.1.2、BSD-3-Clause 的 d3-hierarchy **1.1.9**、ISC 的 yaml 2.9.1、Apache-2.0 的 MathJax 4.1.3、MIT 的 `@napi-rs/canvas` 1.1.0。全文和核对范围见 [NOTICE](NOTICE) 与 [licenses/](licenses/)。
- lockfile 安装的是 d3-hierarchy 1.1.9（BSD-3-Clause）。npm 上更新的 3.1.3 是 ISC，本版本不安装它。以后若升级依赖，要按新的锁定版本重新核对，不能直接改写成 ISC。
- 本目录附带的 `licenses/` 是上游许可证副本，用来保留署名，不是把那些项目改为本仓库作者的原创。
