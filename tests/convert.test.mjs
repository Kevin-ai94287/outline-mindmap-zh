import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts', 'convert.mjs');
const fixture = path.join(root, 'tests', 'fixtures', 'notes.md');

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    cwd: root,
    timeout: 120000,
  });
}

function readReport(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'conversion-report.json'), 'utf8'));
}

test('--help 退出码为 0', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /用法/);
});

test('缺少输入、未知参数、错误格式都以退出码 2 结束', () => {
  assert.equal(run([]).status, 2);
  assert.equal(run(['--format', 'doc']).status, 2);
  assert.match(run(['--not-a-flag', fixture]).stderr, /未知选项/);
});

test('不存在的路径、非 Markdown、空目录、输出目录与输入相同', () => {
  assert.equal(run(['/tmp/does-not-exist-outline-mindmap.md']).status, 2);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-arg-'));
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'hello');
  assert.equal(run([path.join(dir, 'notes.txt')]).status, 2);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-empty-'));
  assert.equal(run([empty]).status, 2);
  assert.equal(run([empty, '-o', empty]).status, 2);
});

test('最小样例导出 HTML、SVG、PNG，并在第二次运行时跳过', { timeout: 120000 }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-out-'));
  const html = run([fixture, '-o', out, '--format', 'html', '--no-toolbar']);
  assert.equal(html.status, 0, html.stderr);
  const htmlFile = path.join(out, 'notes.html');
  const htmlText = fs.readFileSync(htmlFile, 'utf8');
  assert.match(htmlText, /虚构学习笔记/);
  const htmlReport = readReport(out);
  assert.equal(htmlReport.success, 1);
  assert.equal(htmlReport.failed, 0);
  assert.equal(htmlReport.markmap_cli, '1.0.0');

  const again = run([fixture, '-o', out, '--format', 'html']);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(readReport(out).skipped, 1);

  const before = fs.statSync(htmlFile).mtimeMs;
  const overwritten = run([fixture, '-o', out, '--format', 'html', '--overwrite']);
  assert.equal(overwritten.status, 0, overwritten.stderr);
  assert.ok(fs.statSync(htmlFile).mtimeMs >= before);
  assert.equal(readReport(out).success, 1);

  const svgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-svg-'));
  const svg = run([fixture, '-o', svgDir, '--format', 'svg']);
  assert.equal(svg.status, 0, svg.stderr);
  const svgText = fs.readFileSync(path.join(svgDir, 'notes.svg'), 'utf8');
  assert.match(svgText, /<svg/i);
  assert.match(svgText, /虚构学习笔记/);

  const pngDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-png-'));
  const png = run([fixture, '-o', pngDir, '--format', 'png']);
  assert.equal(png.status, 0, png.stderr);
  const pngBytes = fs.readFileSync(path.join(pngDir, 'notes.png'));
  assert.equal(pngBytes.subarray(0, 4).toString('hex'), '89504e47');
  assert.ok(pngBytes.length > 500);
});

test('目录批处理两份 Markdown', { timeout: 120000 }, () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-batch-'));
  fs.mkdirSync(path.join(src, 'nested'));
  fs.writeFileSync(path.join(src, 'a.md'), '# 甲\n\n- 一\n');
  fs.writeFileSync(path.join(src, 'nested', 'b.markdown'), '# 乙\n\n- 二\n');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-batch-out-'));
  const result = run([src, '-o', out, '--format', 'html']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readReport(out).success, 2);
  assert.match(fs.readFileSync(path.join(out, 'a.html'), 'utf8'), /甲/);
  assert.match(fs.readFileSync(path.join(out, 'nested', 'b.html'), 'utf8'), /乙/);
});

test('清理后的会议样例可以转成 HTML', { timeout: 120000 }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-meeting-'));
  const result = run([path.join(root, 'examples', 'meeting.md'), '-o', out, '--format', 'html']);
  assert.equal(result.status, 0, result.stderr);
  const html = fs.readFileSync(path.join(out, 'meeting.html'), 'utf8');
  assert.match(html, /学习小组周会/);
  const banned = new RegExp(
    ['收' + '款', '微' + '信', 'WorkBuddy', 'docling', 'faster-' + 'whisper'].join('|')
  );
  assert.equal(banned.test(html), false);
});
