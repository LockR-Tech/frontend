// Logic tự mở / lọc nhóm / bước thiếu của hướng dẫn lần đầu (F3-G13). Cùng bộ ca với bản Dart ở app mobile.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeRoles, ownGroups, browseGroups, groupStatus, decideAutoOpen, resolveStep, pendingGroups,
} from '../src/onboarding/engine.ts';

const cases = JSON.parse(readFileSync(new URL('./fixtures/onboarding-cases.json', import.meta.url), 'utf8'));
const content = cases.content;
const byId = (id) => content.groups.find((g) => g.id === id);
const ids = (groups) => groups.map((g) => g.id);

test('normalizeRoles: chuỗi, mảng, tiền tố ROLE_, SUPER_ADMIN, trùng lặp', () => {
  for (const c of cases.normalizeRoles) assert.deepEqual(normalizeRoles(c.input), c.expected, JSON.stringify(c.input));
});

test('ownGroups: chỉ nhóm của vai trò mình và có bước ở nền tảng này', () => {
  for (const c of cases.ownGroups) {
    assert.deepEqual(ids(ownGroups(content, c.roles, c.platform)), c.expected, `${c.roles} @ ${c.platform}`);
  }
});

test('browseGroups: admin xem được nhóm mọi vai trò, người khác chỉ vai trò mình', () => {
  for (const c of cases.browseGroups) assert.deepEqual(ids(browseGroups(content, c.roles)), c.expected, String(c.roles));
});

test('groupStatus: mới / có cập nhật / đã xem theo phiên bản', () => {
  for (const c of cases.groupStatus) assert.equal(groupStatus(byId(c.group), c.seen), c.expected, JSON.stringify(c.seen));
});

test('decideAutoOpen: bỏ qua phiên, bỏ qua vĩnh viễn, có nhóm mới, chưa qua bước bắt buộc', () => {
  for (const c of cases.decideAutoOpen) {
    const input = { ...c.input, groups: c.input.groups.map(byId) };
    const got = decideAutoOpen(input);
    const norm = got.kind === 'none' ? got : { kind: got.kind, groups: ids(got.groups) };
    assert.deepEqual(norm, c.expected, c.name);
  }
});

test('resolveStep: thiếu phần tử thì bỏ qua (optional) hoặc hiện ở giữa', () => {
  for (const c of cases.resolveStep) assert.equal(resolveStep(c.step, c.found), c.expected, JSON.stringify(c));
});

test('pendingGroups giữ thứ tự của danh sách vào', () => {
  const groups = [byId('admin-b'), byId('admin-a')];
  assert.deepEqual(ids(pendingGroups(groups, { 'admin-a': 1 })), ['admin-b', 'admin-a']);
});
