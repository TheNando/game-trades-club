import { useEffect, useState } from 'preact/hooks';

type Props = {
  recipientId: string;
  recipientName: string;
  listingId?: string | null;
  onSuccess?: (conversationId: string) => void;
  onCancel?: () => void;
};

type ListingOption = {
  id: string;
  game: { name: string };
};

type ExistingConversation = {
  id: string;
  created_at: string;
  listing_id: string | null;
};

/** Renders a form for starting a conversation with another user. */
export function MessageForm({
  recipientId,
  recipientName,
  listingId: initialListingId,
  onSuccess,
  onCancel,
}: Props) {
  const [text, setText] = useState('');
  const [listingId, setListingId] = useState<string | null>(initialListingId ?? null);
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [existingConversations, setExistingConversations] = useState<ExistingConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialListingId) {
      // Load recipient's open listings
      fetch(`/api/listings?user_id=${encodeURIComponent(recipientId)}&status=open`)
        .then((res) => res.json())
        .then((data) => setListings(data.items || []))
        .catch(console.error);
    }
  }, [recipientId, initialListingId]);

  useEffect(() => {
    if (listingId) {
      fetch(
        `/api/conversations/existing?other_user_id=${encodeURIComponent(recipientId)}&listing_id=${encodeURIComponent(listingId)}`,
      )
        .then((res) => res.json())
        .then((data) => setExistingConversations(data.items || []))
        .catch(console.error);
    } else {
      setExistingConversations([]);
    }
  }, [recipientId, listingId]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: recipientId,
          listing_id: listingId,
          text: text.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await response.json();
      onSuccess?.(data.item.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="bg-base-100 p-6 rounded-xl border border-base-300 shadow-sm">
      <h3 class="text-lg font-bold mb-4">Message {recipientName}</h3>

      {existingConversations.length > 0 && (
        <div class="mb-6 p-4 bg-info/10 text-info-content rounded-lg border border-info/20 text-sm">
          <p class="font-semibold mb-2">You've talked to {recipientName} about this before:</p>
          <ul class="space-y-1">
            {existingConversations.map((conv) => (
              <li key={conv.id}>
                <a href={`/inbox/${conv.id}`} class="link link-primary">
                  Resume conversation from {new Date(conv.created_at).toLocaleDateString()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} class="space-y-4">
        {!initialListingId && listings.length > 0 && (
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">Attach a listing (optional)</span>
            </label>
            <select
              class="select select-bordered w-full"
              value={listingId || ''}
              onChange={(e) => setListingId((e.target as HTMLSelectElement).value || null)}
            >
              <option value="">None</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.game.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Message</span>
          </label>
          <textarea
            class="textarea textarea-bordered h-32 w-full"
            placeholder={`Hi ${recipientName}, I'm interested in...`}
            value={text}
            onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
            required
          />
        </div>

        {error && <p class="text-error text-sm">{error}</p>}

        <div class="flex justify-end gap-3 mt-6">
          {onCancel && (
            <button type="button" class="btn btn-ghost" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          )}
          <button type="submit" class="btn btn-primary px-8" disabled={loading || !text.trim()}>
            {loading ? <span class="loading loading-spinner loading-xs" /> : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
}
