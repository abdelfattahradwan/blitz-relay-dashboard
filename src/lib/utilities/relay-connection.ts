import { getValue, putValue } from "#/lib/utilities/database.ts";

export type RelayConnection = {
  id: string;
  name: string;
  url: string;
  adminToken: string;
};

export type RelayConnectionDetails = Omit<RelayConnection, "id">;

export type RelayConnections = {
  activeConnectionId: string | null;
  connections: Array<RelayConnection>;
};

type EncryptedRelayConnections = {
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
};

const KEY_ID = "key";
const RELAY_CONNECTIONS_ID = "relay-connections";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function getOrCreateKey(): Promise<CryptoKey> {
  const existingKey = await getValue<CryptoKey>(KEY_ID);

  if (existingKey) {
    return existingKey;
  }

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);

  await putValue(KEY_ID, key);

  return key;
}

export async function loadRelayConnections(): Promise<RelayConnections> {
  const [key, encrypted] = await Promise.all([
    getValue<CryptoKey>(KEY_ID),
    getValue<EncryptedRelayConnections>(RELAY_CONNECTIONS_ID),
  ]);

  if (!key || !encrypted) {
    return {
      activeConnectionId: null,
      connections: [],
    };
  }

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encrypted.iv },
    key,
    encrypted.ciphertext,
  );

  return JSON.parse(textDecoder.decode(plaintext)) as RelayConnections;
}

async function saveRelayConnections(relayConnections: RelayConnections): Promise<void> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(relayConnections));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const encrypted: EncryptedRelayConnections = { iv, ciphertext };
  await putValue(RELAY_CONNECTIONS_ID, encrypted);
}

export async function addRelayConnection(details: RelayConnectionDetails): Promise<void> {
  const relayConnections = await loadRelayConnections();
  const id = crypto.randomUUID();

  relayConnections.connections.push({
    id,
    name: details.name,
    url: details.url,
    adminToken: details.adminToken,
  });

  relayConnections.activeConnectionId = id;

  await saveRelayConnections(relayConnections);
}

export async function updateRelayConnection(
  id: string,
  details: RelayConnectionDetails,
): Promise<void> {
  const relayConnections = await loadRelayConnections();

  for (const relayConnection of relayConnections.connections) {
    if (relayConnection.id === id) {
      relayConnection.name = details.name;
      relayConnection.url = details.url;
      relayConnection.adminToken = details.adminToken;
      await saveRelayConnections(relayConnections);
      return;
    }
  }

  throw new Error("The connection no longer exists.");
}

export async function deleteRelayConnection(id: string): Promise<void> {
  const relayConnections = await loadRelayConnections();

  for (let index = 0; index < relayConnections.connections.length; index++) {
    if (relayConnections.connections[index].id === id) {
      relayConnections.connections.splice(index, 1);
      break;
    }
  }

  if (relayConnections.activeConnectionId === id) {
    relayConnections.activeConnectionId = null;
  }

  await saveRelayConnections(relayConnections);
}

export async function activateRelayConnection(id: string): Promise<void> {
  const relayConnections = await loadRelayConnections();
  relayConnections.activeConnectionId = id;
  await saveRelayConnections(relayConnections);
}
