import { afterEach, expect, test, vi } from 'vitest';
import { broadcastSessionChange, subscribeToSessionChanges } from './sessionSync';

const NativeBroadcastChannel = window.BroadcastChannel;
afterEach(() => {
  window.BroadcastChannel = NativeBroadcastChannel;
  localStorage.clear();
  vi.restoreAllMocks();
});

test('session change broadcasts an identity-free message to sibling tabs', () => {
  const channels=[];
  window.BroadcastChannel=class {
    constructor(name){this.name=name;this.listeners={};this.message=null;this.closed=false;channels.push(this);}
    addEventListener(type,fn){this.listeners[type]=fn;}
    removeEventListener(type){delete this.listeners[type];}
    postMessage(message){this.message=message;}
    close(){this.closed=true;}
  };
  const onChange=vi.fn();
  const unsubscribe=subscribeToSessionChanges(onChange);
  channels[0].listeners.message({data:{type:'session-changed'}});
  expect(onChange).toHaveBeenCalledOnce();
  unsubscribe();
  expect(channels[0].closed).toBe(true);

  broadcastSessionChange();
  expect(channels[1].message).toEqual({type:'session-changed'});
  expect(channels[1].message).not.toHaveProperty('user');
  expect(channels[1].closed).toBe(true);
  expect(localStorage.getItem('plwm-mcc-auth-session-changed')).toBeNull();
});

test('storage notifications provide a fallback when broadcast channels are unavailable', () => {
  window.BroadcastChannel=undefined;
  const onChange=vi.fn();
  const unsubscribe=subscribeToSessionChanges(onChange);
  const key='plwm-mcc-auth-session-changed';
  window.dispatchEvent(new StorageEvent('storage',{key,newValue:'changed'}));
  expect(onChange).toHaveBeenCalledOnce();
  window.dispatchEvent(new StorageEvent('storage',{key:'other-key',newValue:'changed'}));
  expect(onChange).toHaveBeenCalledOnce();
  unsubscribe();
});
