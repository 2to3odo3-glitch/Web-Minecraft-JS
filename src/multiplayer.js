const RTC_CONFIG = { iceServers: [], iceCandidatePoolSize: 0 };
const SIGNAL_VERSION = 1;

const supportsEncoding = typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined';
const textEncoder = supportsEncoding ? new TextEncoder() : null;
const textDecoder = supportsEncoding ? new TextDecoder() : null;

function encodeSignal(payload) {
  const json = JSON.stringify(payload);
  if (textEncoder) {
    const bytes = textEncoder.encode(json);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeSignal(text) {
  try {
    const normalized = text?.trim();
    if (!normalized) throw new Error('empty');
    const binary = atob(normalized);
    if (textDecoder) {
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoded = textDecoder.decode(bytes);
      return JSON.parse(decoded);
    }
    const decoded = decodeURIComponent(escape(binary));
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('invalid-signal');
  }
}

function waitForIceGathering(connection) {
  if (connection.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const checkState = () => {
      if (connection.iceGatheringState === 'complete') {
        connection.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    connection.addEventListener('icegatheringstatechange', checkState);
  });
}

export class LanMultiplayer {
  static #createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `peer-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  }

  constructor(options = {}) {
    this.world = options.world;
    this.localId = LanMultiplayer.#createId();
    this.getPlayerPose = options.getPlayerPose ?? (() => null);
    this.getMode = options.getMode ?? (() => 'survival');
    this.getWorldSnapshot = options.getWorldSnapshot ?? (() => ({ data: null, seed: null }));
    this.applyWorldSnapshot = options.applyWorldSnapshot ?? (() => {});
    this.onStatus = options.onStatus ?? (() => {});
    this.onPeerList = options.onPeerList ?? (() => {});
    this.onRemoteState = options.onRemoteState ?? (() => {});
    this.onRemoteMode = options.onRemoteMode ?? (() => {});
    this.onRemoteBlock = options.onRemoteBlock ?? (() => {});

    this.peers = new Map();
    this.remotePlayers = new Map();
    this.pendingClient = null;
    this.stateTimer = 0;
    this.role = 'solo';
    this.statusKey = null;
    this.statusReplacements = {};
    this.broadcastInterval = 0.12;
  }

  get id() {
    return this.localId;
  }

  isActive() {
    return this.role !== 'solo' && this.peers.size > 0;
  }

  setStatus(key, replacements = {}) {
    this.statusKey = key;
    this.statusReplacements = replacements;
    this.onStatus(key, replacements);
  }

  async createOffer() {
    this.cancelPendingOffers();
    this.role = 'host';
    const offerId = LanMultiplayer.#createId();
    const connection = new RTCPeerConnection(RTC_CONFIG);
    const channel = connection.createDataChannel('voxel-lan');
    const peer = this.#registerPeer({ offerId, connection, channel, role: 'host', pending: true });

    const description = await connection.createOffer();
    await connection.setLocalDescription(description);
    await waitForIceGathering(connection);
    const payload = {
      version: SIGNAL_VERSION,
      role: 'host',
      offerId,
      sdp: connection.localDescription,
    };
    this.setStatus('lanStatusOfferReady');
    return encodeSignal(payload);
  }

  async acceptAnswer(offerId, encodedAnswer) {
    const peer = this.peers.get(offerId);
    if (!peer) {
      throw new Error('unknown-offer');
    }
    const payload = decodeSignal(encodedAnswer);
    if (payload.role !== 'client' || payload.offerId !== offerId) {
      throw new Error('invalid-answer');
    }
    await peer.connection.setRemoteDescription(payload.sdp);
    peer.pending = false;
    this.setStatus('lanStatusConnecting');
  }

  async createAnswer(encodedOffer) {
    const payload = decodeSignal(encodedOffer);
    if (payload.role !== 'host' || !payload.offerId || !payload.sdp) {
      throw new Error('invalid-offer');
    }
    this.role = 'client';
    const offerId = payload.offerId;
    const connection = new RTCPeerConnection(RTC_CONFIG);
    const peer = this.#registerPeer({ offerId, connection, channel: null, role: 'client', pending: true });

    connection.ondatachannel = (event) => {
      peer.channel = event.channel;
      this.#wireChannel(peer);
    };

    await connection.setRemoteDescription(payload.sdp);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    await waitForIceGathering(connection);
    const response = {
      version: SIGNAL_VERSION,
      role: 'client',
      offerId,
      sdp: connection.localDescription,
    };
    this.pendingClient = peer;
    this.setStatus('lanStatusAnswerReady');
    return encodeSignal(response);
  }

  update(delta) {
    if (!this.isActive()) return;
    this.stateTimer += delta;
    if (this.stateTimer < this.broadcastInterval) {
      return;
    }
    this.stateTimer = 0;
    const pose = this.getPlayerPose?.();
    if (!pose) return;
    const message = {
      t: 'state',
      id: this.localId,
      p: [pose.position.x, pose.position.y, pose.position.z],
      v: [pose.velocity.x, pose.velocity.y, pose.velocity.z],
      yaw: pose.yaw,
      pitch: pose.pitch,
      mode: this.getMode(),
    };
    this.#broadcast(message);
  }

  notifyModeChange(mode) {
    if (!this.isActive()) return;
    this.#broadcast({ t: 'mode', id: this.localId, mode });
  }

  notifyBlockChange(payload) {
    if (!this.isActive()) return;
    const message = { ...payload, t: 'block', origin: this.localId };
    this.#broadcast(message);
  }

  disconnect() {
    for (const peer of this.peers.values()) {
      peer.channel?.close();
      peer.connection.close();
    }
    this.peers.clear();
    this.remotePlayers.clear();
    this.role = 'solo';
    this.setStatus('lanStatusDisconnected');
    this.onPeerList([]);
  }

  cancelPendingOffers() {
    const pendingPeers = [];
    for (const peer of this.peers.values()) {
      if (peer.pending) {
        pendingPeers.push(peer);
      }
    }
    if (pendingPeers.length === 0) {
      return 0;
    }
    for (const peer of pendingPeers) {
      peer.channel?.close();
      peer.connection.close();
      this.peers.delete(peer.offerId);
    }
    if (this.peers.size === 0) {
      this.remotePlayers.clear();
      this.role = 'solo';
      this.setStatus('lanStatusIdle');
      this.onPeerList([]);
    } else {
      const peerList = this.#buildPeerList();
      this.onPeerList(peerList);
      this.setStatus('lanStatusConnected', { count: this.remotePlayers.size });
    }
    return pendingPeers.length;
  }

  #registerPeer({ offerId, connection, channel, role, pending }) {
    const peer = {
      key: offerId,
      offerId,
      role,
      connection,
      channel,
      pending: Boolean(pending),
      remoteId: null,
    };
    this.peers.set(offerId, peer);
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
        this.#handlePeerClosed(peer);
      }
      if (connection.connectionState === 'connected') {
        this.setStatus('lanStatusConnected', { count: this.remotePlayers.size });
      }
    };
    if (channel) {
      this.#wireChannel(peer);
    }
    return peer;
  }

  #wireChannel(peer) {
    const channel = peer.channel;
    if (!channel) return;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      peer.pending = false;
      this.setStatus('lanStatusConnecting');
      this.#sendHello(peer);
    };
    channel.onmessage = (event) => {
      this.#handleMessage(peer, event.data);
    };
    channel.onclose = () => {
      this.#handlePeerClosed(peer);
    };
    channel.onerror = () => {
      this.#handlePeerClosed(peer);
    };
  }

  #sendHello(peer) {
    if (!peer.channel || peer.channel.readyState !== 'open') return;
    const message = {
      t: 'hello',
      id: this.localId,
      mode: this.getMode(),
    };
    this.#send(peer, message);
  }

  #send(peer, message) {
    if (!peer.channel || peer.channel.readyState !== 'open') return;
    try {
      peer.channel.send(JSON.stringify(message));
    } catch (error) {
      console.warn('[LAN] Failed to send message', error);
    }
  }

  #broadcast(message, options = {}) {
    for (const peer of this.peers.values()) {
      if (options.except && options.except === peer.remoteId) continue;
      this.#send(peer, message);
    }
  }

  #handleMessage(peer, raw) {
    let message = null;
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch (error) {
      console.warn('[LAN] Invalid message payload', error);
      return;
    }
    if (!message || typeof message !== 'object') return;

    switch (message.t) {
      case 'hello':
        peer.remoteId = message.id;
        this.remotePlayers.set(message.id, { id: message.id, mode: message.mode ?? 'survival' });
        if (this.role === 'host') {
          const snapshot = this.getWorldSnapshot();
          this.#send(peer, {
            t: 'hello_ack',
            id: this.localId,
            mode: this.getMode(),
            seed: snapshot.seed,
            world: snapshot.data,
            peers: this.#buildPeerList(),
          });
          this.#broadcast({ t: 'peer_list', peers: this.#buildPeerList() });
        } else {
          this.#send(peer, {
            t: 'hello_ack',
            id: this.localId,
            mode: this.getMode(),
          });
        }
        this.onPeerList(this.#buildPeerList());
        this.setStatus('lanStatusConnected', { count: this.remotePlayers.size });
        break;
      case 'hello_ack':
        peer.remoteId = message.id;
        this.remotePlayers.set(message.id, { id: message.id, mode: message.mode ?? 'survival' });
        if (this.role === 'client' && message.world) {
          this.applyWorldSnapshot({ seed: message.seed, data: message.world, peers: message.peers });
        }
        if (Array.isArray(message.peers)) {
          this.#applyPeerList(message.peers);
        }
        this.onPeerList(this.#buildPeerList());
        this.setStatus('lanStatusConnected', { count: this.remotePlayers.size });
        break;
      case 'peer_list':
        if (Array.isArray(message.peers)) {
          this.#applyPeerList(message.peers);
          this.onPeerList(this.#buildPeerList());
        }
        break;
      case 'state':
        if (message.id === this.localId) return;
        this.onRemoteState(message);
        break;
      case 'mode':
        if (message.id === this.localId) return;
        this.remotePlayers.set(message.id, { id: message.id, mode: message.mode ?? 'survival' });
        this.onRemoteMode(message);
        this.onPeerList(this.#buildPeerList());
        if (this.role === 'host') {
          this.#broadcast(message, { except: message.id });
        }
        break;
      case 'block':
        if (message.origin === this.localId) return;
        this.onRemoteBlock(message);
        if (this.role === 'host') {
          this.#broadcast(message, { except: message.origin });
        }
        break;
      default:
        break;
    }
  }

  #applyPeerList(list) {
    this.remotePlayers.clear();
    for (const item of list) {
      if (!item || typeof item.id !== 'string') continue;
      if (item.id === this.localId) continue;
      this.remotePlayers.set(item.id, { id: item.id, mode: item.mode ?? 'survival' });
    }
  }

  #buildPeerList() {
    const peers = [];
    peers.push({ id: this.localId, mode: this.getMode() });
    for (const value of this.remotePlayers.values()) {
      peers.push({ id: value.id, mode: value.mode ?? 'survival' });
    }
    return peers;
  }

  #handlePeerClosed(peer) {
    if (this.peers.has(peer.offerId)) {
      this.peers.delete(peer.offerId);
    }
    if (peer.remoteId && this.remotePlayers.has(peer.remoteId)) {
      this.remotePlayers.delete(peer.remoteId);
    }
    this.onPeerList(this.#buildPeerList());
    if (this.peers.size === 0) {
      this.role = 'solo';
      this.setStatus('lanStatusDisconnected');
    }
  }
}
