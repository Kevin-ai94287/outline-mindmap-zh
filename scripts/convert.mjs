#!/usr/bin/env node
/**
 * 大纲一键转思维导图 — 本机把 Markdown 大纲/会议纪要转成可交互 HTML，可选 SVG/PNG。
 * 通过固定版本的 @markmap/cli 调用，不上传文件。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_NAME = 'conversion-report.json';
const EXT = new Set(['.md', '.markdown']);

function usage() {
  return `用法：node scripts/convert.mjs <文件或目录> [选项]

把 Markdown 标题/列表转成本机可打开的交互式思维导图（默认 HTML，可离线）。
可选导出静态 SVG 或 PNG。全部在本机完成，不上传内容。

位置参数：
  输入                Markdown 文件，或递归处理 .md/.markdown 的目录

可选参数：
  -h, --help          显示帮助并退出
  -o, --output-dir    输出目录；默认在输入旁创建「<名称>_思维导图」
  --format <fmt>      html（默认）| svg | png | all
  --no-toolbar        HTML 不带缩放/折叠工具栏
  --overwrite         覆盖已有产物（默认跳过已完成的文件）

退出码：0 无失败；1 至少一个文件失败；2 参数或环境错误。
`;
}

function fail(code, msg) {
  console.error(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { input: null, outputDir: null, format: 'html', toolbar: true, overwrite: false };
  const list = [...argv];
  while (list.length) {
    const a = list.shift();
    if (a === '-h' || a === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    }
    if (a === '-o' || a === '--output-dir') {
      args.outputDir = list.shift();
      if (!args.outputDir) fail(2, '参数错误：--output-dir 需要目录路径');
      continue;
    }
    if (a === '--format') {
      args.format = (list.shift() || '').toLowerCase();
      if (!['html', 'svg', 'png', 'all'].includes(args.format)) {
        fail(2, '参数错误：--format 只能是 html、svg、png 或 all');
      }
      continue;
    }
    if (a === '--no-toolbar') {
      args.toolbar = false;
      continue;
    }
    if (a === '--overwrite') {
      args.overwrite = true;
      continue;
    }
    if (a.startsWith('-')) fail(2, '参数错误：未知选项 ' + a);
    if (args.input) fail(2, '参数错误：只能指定一个输入路径');
    args.input = a;
  }
  if (!args.input) fail(2, '参数错误：请提供 Markdown 文件或目录\n\n' + usage());
  return args;
}

function ensureNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isNaN(major) || major < 22) {
    fail(2, `环境错误：需要 Node.js 22 或更新版，当前为 ${process.version}。请升级后重试。`);
  }
}

function markmapBin() {
  // 锁定的 @markmap/cli@1.0.0 入口是 dist/cli.js。bin/markmap.js 是更早包名的路径，仅作兜底。
  const candidates = [
    path.join(__dirname, 'node_modules', '@markmap', 'cli', 'dist', 'cli.js'),
    path.join(__dirname, 'node_modules', '@markmap', 'cli', 'bin', 'markmap.js'),
  ];
  for (const local of candidates) {
    if (fs.existsSync(local)) return { cmd: process.execPath, baseArgs: [local] };
  }
  const alt = path.join(__dirname, 'node_modules', '.bin', 'markmap');
  if (fs.existsSync(alt)) return { cmd: alt, baseArgs: [] };
  fail(
    2,
    '环境错误：未找到 @markmap/cli。请在 scripts 目录执行：\n  npm install\n（需要联网一次；安装后可离线转换）'
  );
}

function findInputs(src) {
  const st = fs.statSync(src);
  if (st.isFile()) {
    if (!EXT.has(path.extname(src).toLowerCase())) {
      fail(2, '参数错误：输入文件须为 .md 或 .markdown');
    }
    return [path.resolve(src)];
  }
  if (!st.isDirectory()) fail(2, '参数错误：输入既不是文件也不是目录');
  const out = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const p = path.join(dir, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (s.isFile() && EXT.has(path.extname(name).toLowerCase())) out.push(p);
    }
  };
  walk(src);
  return out.sort();
}

function defaultOutDir(src) {
  const abs = path.resolve(src);
  const st = fs.statSync(abs);
  if (st.isFile()) {
    const base = path.basename(abs, path.extname(abs));
    return path.join(path.dirname(abs), base + '_思维导图');
  }
  return abs.replace(/\/$/, '') + '_思维导图';
}

function formatsOf(fmt) {
  if (fmt === 'all') return ['html', 'svg', 'png'];
  return [fmt];
}

function targetsFor(outDir, relBase, formats) {
  const map = {};
  for (const f of formats) {
    map[f] = path.join(outDir, relBase + '.' + f);
  }
  return map;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function runMarkmap(bin, inputFile, outputFile, format, toolbar) {
  const args = [...bin.baseArgs, inputFile, '-o', outputFile, '--no-open'];
  if (format === 'svg') args.push('--svg');
  if (format === 'png') args.push('--png');
  if (format === 'html' && !toolbar) args.push('--no-toolbar');
  const r = spawnSync(bin.cmd, args, { encoding: 'utf8' });
  if (r.error) return { ok: false, error: String(r.error) };
  if (r.status !== 0) {
    return { ok: false, error: (r.stderr || r.stdout || 'markmap 退出码 ' + r.status).trim() };
  }
  return { ok: true };
}

function main() {
  ensureNode();
  const args = parseArgs(process.argv.slice(2));
  const src = path.resolve(args.input);
  if (!fs.existsSync(src)) fail(2, '参数错误：找不到输入路径 ' + src);

  const outDir = path.resolve(args.outputDir || defaultOutDir(src));
  if (path.resolve(src) === outDir) fail(2, '参数错误：输出目录不能与输入目录相同');

  const inputs = findInputs(src);
  if (!inputs.length) fail(2, '参数错误：未找到任何 .md / .markdown 文件');

  const bin = markmapBin();
  const formats = formatsOf(args.format);
  ensureDir(outDir);

  const srcRoot = fs.statSync(src).isDirectory() ? src : path.dirname(src);
  const started = Date.now();
  const results = [];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of inputs) {
    const rel = path.relative(srcRoot, file);
    const relBase = rel.replace(/\.(md|markdown)$/i, '').split(path.sep).join('/');
    const targets = targetsFor(outDir, relBase, formats);
    const parent = path.dirname(Object.values(targets)[0]);
    ensureDir(parent);

    const missing = formats.filter((f) => !fs.existsSync(targets[f]));
    if (!args.overwrite && missing.length === 0) {
      skipped += 1;
      results.push({
        input: file,
        status: 'skipped',
        outputs: targets,
      });
      console.log('跳过（已存在）：' + rel);
      continue;
    }

    const need = args.overwrite ? formats : missing;
    const produced = {};
    let err = null;
    for (const f of need) {
      const r = runMarkmap(bin, file, targets[f], f, args.toolbar);
      if (!r.ok) {
        err = r.error;
        break;
      }
      produced[f] = targets[f];
    }
    if (err) {
      failed += 1;
      results.push({ input: file, status: 'failed', error: err, outputs: produced });
      console.error('失败：' + rel + ' — ' + err);
    } else {
      ok += 1;
      // fill skipped formats that already existed
      for (const f of formats) {
        if (!produced[f] && fs.existsSync(targets[f])) produced[f] = targets[f];
      }
      results.push({ input: file, status: 'ok', outputs: { ...targets, ...produced } });
      console.log('完成：' + rel + ' → ' + need.map((f) => path.basename(targets[f])).join(', '));
    }
  }

  const report = {
    skill: 'outline-mindmap-zh',
    version: '1.0.0',
    node: process.version,
    markmap_cli: '1.0.0',
    format: args.format,
    input: src,
    output_dir: outDir,
    total: inputs.length,
    success: ok,
    skipped,
    failed,
    elapsed_ms: Date.now() - started,
    files: results,
  };
  const reportPath = path.join(outDir, REPORT_NAME);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(
    `汇总：成功 ${ok}，跳过 ${skipped}，失败 ${failed}，用时 ${report.elapsed_ms} ms。报告：${reportPath}`
  );
  process.exit(failed ? 1 : 0);
}

main();
