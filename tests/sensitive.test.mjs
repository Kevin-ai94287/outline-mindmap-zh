import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function joined(parts) {
  return parts.join('');
}

const rules = [
  ['private_key', /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/],
  ['cloud_key', /AKIA[0-9A-Z]{16}|github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}/],
  ['phone_cn', /(?<!\d)1[3-9]\d{9}(?!\d)/],
  ['id_card', /(?<!\d)\d{17}[\dXx](?!\d)/],
  [
    'merchant',
    new RegExp(
      [
        joined(['商', '户号']),
        joined(['微', '信签约']),
        joined(['收', '款申请']),
        joined(['收', '款审核']),
        joined(['营', '业执照']),
      ].join('|')
    ),
  ],
  [
    'internal_path',
    new RegExp(
      [
        joined(['/work', 'space']),
        joined(['/', 'Users/']),
        joined(['C:', '\\', 'Users']),
        joined(['/home/', 'ubuntu']),
        joined(['kevin-', 'handover']),
      ].join('|')
    ),
  ],
  ['club_or_grid', new RegExp([joined(['俱乐', '部']), joined(['电', '网'])].join('|'))],
];

function filesUnder(dir, found = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) filesUnder(full, found);
    else if (stat.isFile()) found.push(full);
  }
  return found;
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\n/).length;
}

test('源码树没有凭据、商户信息、内部路径或禁止表述', () => {
  const hits = [];
  for (const file of filesUnder(root)) {
    const text = fs.readFileSync(file).toString('utf8');
    const rel = path.relative(root, file);
    for (const [name, pattern] of rules) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) hits.push(`${name} ${rel}:${lineOf(text, match.index)}`);
    }
    const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(text);
    const licenseCopy = rel.startsWith(`licenses${path.sep}`);
    if (email && !licenseCopy) hits.push(`email ${rel}:${lineOf(text, email.index)}`);
  }
  assert.deepEqual(hits, []);
});

test('会议样例已替换为虚构学习周会', () => {
  const text = fs.readFileSync(path.join(root, 'examples', 'meeting.md'), 'utf8');
  assert.match(text, /学习小组/);
  const banned = new RegExp(
    [
      joined(['收', '款']),
      joined(['微', '信']),
      joined(['签', '约']),
      joined(['定', '价']),
      'WorkBuddy',
      'docling',
      joined(['faster-', 'whisper']),
      '¥',
    ].join('|')
  );
  assert.equal(banned.test(text), false);
});
