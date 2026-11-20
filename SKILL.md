---
name: outline-mindmap-zh
display_name: 大纲一键转思维导图
display_name_en: Outline to Interactive Mind Map
description: 在本机把会议纪要、文章大纲、学习笔记等 Markdown 转成可交互思维导图 HTML（可缩放、折叠），可选导出 SVG/PNG。
description_zh: 本地将 Markdown 标题与列表转为可离线打开的交互式思维导图 HTML，支持目录批量与 SVG/PNG 导出，中文提示。
description_en: Convert local Markdown outlines and meeting notes into offline interactive mind-map HTML, with optional SVG/PNG export and folder batch mode.
version: 1.0.0
author: Kevin技能工坊
---

# 大纲一键转思维导图

用户需要把会议纪要、文章大纲、学习笔记、项目结构等 **Markdown**（标题 + 列表）转成可在浏览器里缩放、拖动、折叠的思维导图，或导出静态 SVG/PNG 时，使用此技能。按 [README.md](README.md) 检查 **Node.js 22+** 与依赖，使用 `scripts/convert.mjs`。本技能不是 markmap 官方产品；上游许可证见 NOTICE，不要把上游代码说成技能作者的原创。

确定输入路径（单个 `.md` / `.markdown` 或目录；目录递归处理）。默认输出交互式 **HTML**（单文件、可离线打开）。需要静态图时加 `--format svg`、`--format png` 或 `--format all`。未经用户同意不要加 `--overwrite`，默认跳过已有产物。

执行结束后读取输出目录的 `conversion-report.json`，报告成功、失败、跳过数及每个文件的产物路径。只有标题和列表项会成为导图分支；段落、代码块等会作为节点备注，不是独立分支——向用户说明这一结构规则。所有处理在本机完成，不上传文档；首次需联网 `npm install`，之后可离线转换。

示例（在技能目录）：

```bash
node scripts/convert.mjs "周会纪要.md"
node scripts/convert.mjs "大纲目录" -o "导图结果" --format all
node scripts/convert.mjs "文章大纲.md" --format png
```
