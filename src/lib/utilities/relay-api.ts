import type { RelayConnection } from "#/lib/utilities/relay-connection.ts";

export const RoomKind = {
  EphemeralHostOwned: 0,
  PersistentReserved: 1,
} as const;

export type RoomSnapshot = {
  code: string;
  kind: (typeof RoomKind)[keyof typeof RoomKind];
  isPublic: boolean;
  displayName: string;
  maximumClients: number;
  connectedClientCount: number;
  hasHost: boolean;
  hasPendingHostClaim: boolean;
  metadata: Record<string, string>;
};

type RelayVersion = {
  version: string;
};

export type RoomClient =
  | { virtualClientId: number }
  | { virtualClientId: number; ipAddress: string }
  | { virtualClientId: number; ipAddress: string; port: number };

export type CreateRoomRequest = {
  maximumClients: number;
  displayName: string;
  isPublic: boolean;
  metadata: Record<string, string> | null;
};

export type PatchRoomRequest = {
  displayName: string | null;
  metadataToAdd: Record<string, string> | null;
  metadataToRemove: Array<string> | null;
};

export class RelayError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  notFoundMessage?: string;
};

async function request(
  relayConnection: RelayConnection,
  path: string,
  options: RequestOptions,
  fetcher: typeof fetch,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${relayConnection.adminToken}`,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetcher(`${relayConnection.url}${path}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.ok) {
    return response;
  }

  if (response.status === 400 || response.status === 409) {
    const message: unknown = await response.json().catch(() => {
      return null;
    });

    throw new RelayError(
      typeof message === "string" ? message : "The relay rejected the request.",
      response.status,
    );
  }

  if (response.status === 401) {
    throw new RelayError("The relay rejected the admin token.", 401);
  }

  if (response.status === 404 && options.notFoundMessage !== undefined) {
    throw new RelayError(options.notFoundMessage, 404);
  }

  throw new RelayError(`The relay responded with HTTP status ${response.status}.`, response.status);
}

export async function pingRelay(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<number | null> {
  const start = performance.now();

  try {
    const response = await fetcher(`${url}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    return response.ok ? Math.round(performance.now() - start) : null;
  } catch {
    return null;
  }
}

export async function checkRelayHealth(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  let response: Response;

  try {
    response = await fetcher(`${url}/health`, { signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    return Error.isError(error) && error.name === "TimeoutError"
      ? "The relay did not respond in time."
      : "Could not reach the relay. Check the URL and that the relay's CORS policy allows this dashboard.";
  }

  if (!response.ok) {
    return `The relay responded with HTTP status ${response.status}.`;
  }

  return null;
}

export async function getRelayVersion(
  relayConnection: RelayConnection,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  let response: Response;

  try {
    response = await request(relayConnection, "/version", { method: "GET" }, fetcher);
  } catch (error) {
    if (error instanceof RelayError && error.status === 404) {
      return null;
    }

    throw error;
  }

  const relayVersion: RelayVersion = await response.json();
  return relayVersion.version;
}

export async function getRooms(
  relayConnection: RelayConnection,
  fetcher: typeof fetch = fetch,
): Promise<Array<RoomSnapshot>> {
  const response = await request(relayConnection, "/rooms", { method: "GET" }, fetcher);
  const rooms: Array<RoomSnapshot> = await response.json();
  return rooms;
}

export async function getRoom(
  relayConnection: RelayConnection,
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<RoomSnapshot> {
  const response = await request(
    relayConnection,
    `/rooms/${encodeURIComponent(code)}`,
    {
      method: "GET",
      notFoundMessage: "This room does not exist.",
    },
    fetcher,
  );
  const room: RoomSnapshot = await response.json();
  return room;
}

export async function getRoomClients(
  relayConnection: RelayConnection,
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<Array<RoomClient>> {
  const response = await request(
    relayConnection,
    `/rooms/${encodeURIComponent(code)}/clients`,
    {
      method: "GET",
      notFoundMessage: "This room does not exist.",
    },
    fetcher,
  );
  const clients: Array<RoomClient> = await response.json();
  return clients;
}

export async function createRoom(
  relayConnection: RelayConnection,
  createRoomRequest: CreateRoomRequest,
  fetcher: typeof fetch = fetch,
): Promise<RoomSnapshot> {
  const response = await request(
    relayConnection,
    "/rooms",
    {
      method: "POST",
      body: createRoomRequest,
    },
    fetcher,
  );
  const room: RoomSnapshot = await response.json();
  return room;
}

export async function patchRoom(
  relayConnection: RelayConnection,
  code: string,
  patchRoomRequest: PatchRoomRequest,
  fetcher: typeof fetch = fetch,
): Promise<RoomSnapshot> {
  const response = await request(
    relayConnection,
    `/rooms/${encodeURIComponent(code)}`,
    {
      method: "PATCH",
      body: patchRoomRequest,
      notFoundMessage: "This room does not exist.",
    },
    fetcher,
  );
  const room: RoomSnapshot = await response.json();
  return room;
}

export async function deleteRoom(
  relayConnection: RelayConnection,
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  await request(
    relayConnection,
    `/rooms/${encodeURIComponent(code)}`,
    {
      method: "DELETE",
      notFoundMessage: "This room does not exist.",
    },
    fetcher,
  );
}

export async function kickClient(
  relayConnection: RelayConnection,
  code: string,
  virtualClientId: number,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  await request(
    relayConnection,
    `/rooms/${encodeURIComponent(code)}/clients/${virtualClientId}`,
    {
      method: "DELETE",
      notFoundMessage: `There is no client with ID ${virtualClientId} in this room.`,
    },
    fetcher,
  );
}

export async function removeHost(
  relayConnection: RelayConnection,
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  await request(
    relayConnection,
    `/rooms/${encodeURIComponent(code)}/host`,
    {
      method: "DELETE",
      notFoundMessage: "This room does not exist.",
    },
    fetcher,
  );
}
