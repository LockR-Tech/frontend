import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_REALTIME_TOPICS, tagsForRealtimeMessage } from '../src/lib/admin-realtime-tags.ts';

test('order and payment events refresh order, dashboard, payment and revenue pages', () => {
  const tags = tagsForRealtimeMessage('/topic/orders', { type: 'order.status.changed' });
  for (const tag of ['Orders', 'Dashboard', 'Payments', 'Revenue', 'DroneOrders']) assert.ok(tags.includes(tag), tag);
});

test('admin data changes map each entity to the pages that show it', () => {
  assert.deepEqual(tagsForRealtimeMessage('/topic/admin/changes', { entity: 'USER' }), ['Users', 'Dashboard']);
  assert.ok(tagsForRealtimeMessage('/topic/admin/changes', { entity: 'REFUND' }).includes('PaymentRefunds'));
  assert.ok(tagsForRealtimeMessage('/topic/admin/changes', { entity: 'WITHDRAWAL' }).includes('Wallet'));
  assert.ok(tagsForRealtimeMessage('/topic/admin/changes', { entity: 'wallet' }).includes('WalletTransactions'));
  assert.deepEqual(tagsForRealtimeMessage('/topic/admin/changes', { entity: 'LOYALTY' }), ['Loyalty']);
  assert.ok(tagsForRealtimeMessage('/topic/admin/changes', { entity: 'FEEDBACK' }).includes('Notifications'));
});

test('maintenance, catalog and locker events reach maintenance, drone, promotion and store pages', () => {
  for (const entity of ['REPORT', 'SCHEDULE', 'LOCKER', 'DEVICE']) {
    assert.deepEqual(tagsForRealtimeMessage('/topic/staff/maintenance', { entity }), ['Lockers'], entity);
  }
  assert.deepEqual(tagsForRealtimeMessage('/topic/staff/maintenance', { entity: 'DRONE' }), ['Drones']);
  assert.ok(tagsForRealtimeMessage('/topic/staff/maintenance', { entity: 'DRONE_INCIDENT' }).includes('DroneIncidents'));
  assert.deepEqual(tagsForRealtimeMessage('/topic/public/catalog', { entity: 'PROMOTION' }), ['Promotions']);
  assert.ok(tagsForRealtimeMessage('/topic/public/catalog', { entity: 'STORE' }).includes('Stores'));
  assert.deepEqual(tagsForRealtimeMessage('/topic/public/locker-availability', { lockerId: 3 }), ['Lockers']);
});

test('unknown topics or entities refresh nothing', () => {
  assert.deepEqual(tagsForRealtimeMessage('/topic/admin/changes', { entity: 'SOMETHING' }), []);
  assert.deepEqual(tagsForRealtimeMessage('/topic/staff/maintenance', {}), []);
  assert.deepEqual(tagsForRealtimeMessage('/topic/unknown', { entity: 'USER' }), []);
  assert.deepEqual(tagsForRealtimeMessage('/topic/admin/changes', null), []);
});

test('the bridge listens to every topic it maps', () => {
  for (const topic of ADMIN_REALTIME_TOPICS) {
    assert.ok(Array.isArray(tagsForRealtimeMessage(topic, { entity: 'ORDER' })), topic);
  }
});
