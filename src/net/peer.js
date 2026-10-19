// PeerJS (WebRTC) transport with short room codes. Signalling goes through
// the free PeerJS cloud server; game data flows peer-to-peer.
import { encode, decode } from './protocol.js';

const PREFIX = 'g9x-dollfight-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEER_OPTS = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
};

export function makeCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function normalizeCode(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

let loading = null;
function loadPeerJS() {
  if (window.Peer) return Promise.resolve(window.Peer);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'lib/peerjs.min.js';
    s.onload = () => resolve(window.Peer);
    s.onerror = () => {
      loading = null;
      reject(Object.assign(new Error('peerjs'), { type: 'server-error' }));
    };
    document.head.appendChild(s);
  });
  return loading;
}

function openPeer(Peer, id) {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, PEER_OPTS) : new Peer(PEER_OPTS);
    const timer = setTimeout(() => {
      peer.destroy();
      reject(Object.assign(new Error('timeout'), { type: 'server-error' }));
    }, 12000);
    peer.once('open', () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.once('error', (e) => {
      clearTimeout(timer);
      peer.destroy();
      reject(e);
    });
  });
}

function wrap(conn, peer) {
  const tr = {
    onmessage: null,
    onclose: null,
    closed: false,
    send(msg) {
      if (!tr.closed && conn.open) {
        try {
          conn.send(encode(msg));
        } catch {
          // dropped; the next snapshot/input supersedes it
        }
      }
    },
    close() {
      if (tr.closed) return;
      tr.closed = true;
      try {
        conn.close();
      } finally {
        peer.destroy();
      }
    },
  };
  const closed = () => {
    if (tr.closed) return;
    tr.closed = true;
    tr.onclose?.();
    peer.destroy();
  };
  conn.on('data', (d) => tr.onmessage?.(decode(d)));
  conn.on('close', closed);
  conn.on('error', closed);
  conn.peerConnection?.addEventListener?.('iceconnectionstatechange', () => {
    const s = conn.peerConnection.iceConnectionState;
    if (s === 'failed' || s === 'closed') closed();
  });
  return tr;
}

// Host: claim a code and wait for one guest.
export async function hostRoom({ onCode, onGuest, onError }) {
  const Peer = await loadPeerJS();
  let peer = null;
  let code = '';
  for (let attempt = 0; attempt < 4 && !peer; attempt++) {
    code = makeCode();
    try {
      peer = await openPeer(Peer, PREFIX + code);
    } catch (e) {
      if (e.type !== 'unavailable-id') throw e;
    }
  }
  if (!peer) throw Object.assign(new Error('no code'), { type: 'server-error' });
  onCode(code);
  let taken = false;
  peer.on('connection', (conn) => {
    if (taken) {
      conn.on('open', () => {
        conn.send(encode({ t: 'full' }));
        setTimeout(() => conn.close(), 300);
      });
      return;
    }
    taken = true;
    conn.on('open', () => onGuest(wrap(conn, peer)));
  });
  peer.on('error', (e) => {
    if (!taken) onError?.(e);
  });
  return { code, cancel: () => peer.destroy() };
}

// Guest: connect to a code. Resolves with a transport once the data channel is open.
export async function joinRoom(code) {
  const Peer = await loadPeerJS();
  const peer = await openPeer(Peer);
  return new Promise((resolve, reject) => {
    let settled = false;
    const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'raw' });
    // Errors after the channel is open (e.g. the signalling socket dropping)
    // must not tear down a working peer-to-peer game.
    const fail = (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      peer.destroy();
      reject(e);
    };
    const timer = setTimeout(() => fail(Object.assign(new Error('timeout'), { type: 'network' })), 20000);
    conn.on('open', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(wrap(conn, peer));
    });
    peer.on('error', fail);
    conn.on('error', fail);
  });
}

export function errorKey(e) {
  switch (e?.type) {
    case 'peer-unavailable':
      return 'online.err.notfound';
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
    case 'unavailable-id':
    case 'browser-incompatible':
      return 'online.err.server';
    default:
      return 'online.err.net';
  }
}
