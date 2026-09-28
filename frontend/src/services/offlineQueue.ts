export interface QueuedMutation {
  id:        string;
  endpoint:  string;
  method:    string;
  body:      unknown;
  title:     string;
  createdAt: string;
}

const STORAGE_KEY = "deped_offline_mutation_queue";

export function getPendingMutations(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingMutations(queue: QueuedMutation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent("offline-queue-changed", { detail: { count: queue.length } }));
  } catch (err) {
    console.error("Failed to save offline mutation queue:", err);
  }
}

export function enqueueMutation(mutation: Omit<QueuedMutation, "id" | "createdAt">): QueuedMutation {
  const item: QueuedMutation = {
    ...mutation,
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  const queue = getPendingMutations();
  queue.push(item);
  savePendingMutations(queue);
  return item;
}

export function removeMutation(id: string): void {
  const queue = getPendingMutations().filter((m) => m.id !== id);
  savePendingMutations(queue);
}

export function clearMutationQueue(): void {
  savePendingMutations([]);
}

let isReplaying = false;

export async function replayPendingMutations(): Promise<{ synced: number; failed: number }> {
  if (isReplaying || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const queue = getPendingMutations();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  isReplaying = true;
  let synced = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  for (const item of queue) {
    try {
      const res = await fetch(`/api/v1${item.endpoint}`, {
        method: item.method,
        headers,
        body: JSON.stringify(item.body),
      });

      if (res.ok) {
        synced++;
      } else {
        console.warn(`Mutation ${item.id} failed with status: ${res.status}`);
        failed++;
        remaining.push(item);
      }
    } catch (err) {
      console.warn(`Network error replaying mutation ${item.id}:`, err);
      failed++;
      remaining.push(item);
    }
  }

  savePendingMutations(remaining);
  isReplaying = false;

  window.dispatchEvent(
    new CustomEvent("offline-queue-replayed", {
      detail: { synced, failed, remaining: remaining.length },
    })
  );

  return { synced, failed };
}

// Auto replay when connection is restored
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Delay slightly to allow connection to settle
    setTimeout(() => {
      replayPendingMutations();
    }, 1500);
  });
}
