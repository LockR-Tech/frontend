import test from 'node:test';
import assert from 'node:assert/strict';
import { canCloseAsFailed, canAssignPickup } from '../src/pages/Admin/drone-orders/homePickupRules.ts';

const paid = { status:'AWAITING_DISPATCH', deliveryStage:'PICKUP_ASSIGNED', paymentStatus:'PAID', paidAt:'2026-10-12T12:00:00' };

test('paid orders can fail before collection and during flight, while drop incidents stay in their own workflow', () => {
  for (const stage of ['AWAITING_DISPATCH','PICKUP_ASSIGNED','PICKED_UP','ACCEPTED','LAUNCHING','DEPARTED','EN_ROUTE','APPROACHING','ARRIVED']) {
    assert.equal(canCloseAsFailed({...paid, deliveryStage:stage}), true, stage);
  }
  for (const stage of ['DROP_REPORTED','READY_FOR_PICKUP','FAILED']) assert.equal(canCloseAsFailed({...paid,deliveryStage:stage}),false,stage);
  for (const status of ['STORING','COMPLETED','CANCELED','EXPIRED']) assert.equal(canCloseAsFailed({...paid,status}),false,status);
});

test('unpaid bookings cannot fail delivery, but collected orders owing a weight surcharge can', () => {
  assert.equal(canCloseAsFailed({...paid,paymentStatus:'UNPAID',paidAt:null}),false);
  assert.equal(canCloseAsFailed({...paid,paymentStatus:'UNPAID',deliveryStage:'ACCEPTED'}),true);
});

test('assignment stops once the parcel has been collected or the pickup is closed', () => {
  for (const status of ['SEARCHING','OFFERED','ACCEPTED']) assert.equal(canAssignPickup(paid,{status}),true,status);
  for (const status of [null,'PICKED_UP','FAILED','CANCELED']) assert.equal(canAssignPickup(paid,{status}),false,String(status));
  assert.equal(canAssignPickup({...paid,deliveryStage:'PICKED_UP'},{status:'ACCEPTED'}),false);
  assert.equal(canAssignPickup({...paid,status:'CANCELED'},{status:'ACCEPTED'}),false);
});
