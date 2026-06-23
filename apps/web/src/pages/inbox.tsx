import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';

type Conversation = {
  id: string;
  listing_id: string | null;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar_url: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
  listing_game_name: string | null;
  listing_created_at: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  sender_name: string | null;
  sender_avatar_url: string | null;
};

type FullConversation = {
  item: Conversation;
  messages: Message[];
};

type CurrentUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export function Inbox({ id }: { id?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<FullConversation | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { path } = useLocation();

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load inbox');
      const data = await res.json();
      setConversations(data.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!id) setLoading(false);
    }
  };

  const loadConversationDetail = async (convId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${convId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load conversation');
      const data = await res.json();
      setActiveConversation(data);
      // Refresh list to update unread counts
      loadConversations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    fetch('/api/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (id) {
      loadConversationDetail(id);
    } else {
      setActiveConversation(null);
    }
  }, [id]);

  const handleReply = async (e: Event) => {
    e.preventDefault();
    if (!id || !replyText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText.trim() }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to send message');
      
      setReplyText('');
      loadConversationDetail(id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0) {
    return <div class="p-8 text-center">Loading inbox...</div>;
  }

  return (
    <div class="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div class={`w-full md:w-80 flex-shrink-0 flex flex-col ${id ? 'hidden md:flex' : 'flex'}`}>
        <h1 class="text-2xl font-bold mb-6">Messages</h1>
        <div class="flex-1 overflow-y-auto space-y-2 pr-2">
          {conversations.length === 0 ? (
            <p class="text-base-content/50 italic text-sm">No messages yet.</p>
          ) : (
            conversations.map(conv => (
              <a
                key={conv.id}
                href={`/inbox/${conv.id}`}
                class={`block p-4 rounded-xl border transition-colors ${
                  conv.id === id 
                    ? 'bg-primary text-primary-content border-primary' 
                    : 'bg-base-100 border-base-300 hover:bg-base-200'
                }`}
              >
                <div class="flex justify-between items-start mb-1">
                  <span class={`font-bold truncate ${conv.unread_count > 0 && conv.id !== id ? 'text-primary' : ''}`}>
                    {conv.other_user_name || 'Neighbor'}
                  </span>
                  {conv.unread_count > 0 && conv.id !== id && (
                    <span class="badge badge-primary badge-sm">{conv.unread_count}</span>
                  )}
                </div>
                {conv.listing_id && conv.listing_game_name && (
                  <p class={`text-xs truncate mb-1 ${conv.id === id ? 'text-primary-content/70' : 'text-base-content/50'}`}>
                    {conv.listing_game_name}
                  </p>
                )}
                <p class={`text-sm truncate ${conv.id === id ? 'text-primary-content/80' : 'text-base-content/60'}`}>
                  {conv.last_message_text || 'No messages yet'}
                </p>
                {conv.last_message_at && (
                  <span class={`text-[10px] mt-2 block ${conv.id === id ? 'text-primary-content/60' : 'text-base-content/40'}`}>
                    {new Date(conv.last_message_at).toLocaleDateString()}
                  </span>
                )}
              </a>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div class={`flex-1 flex flex-col bg-base-100 rounded-2xl border border-base-300 overflow-hidden ${!id ? 'hidden md:flex items-center justify-center italic text-base-content/40' : 'flex'}`}>
        {!id ? (
          <p>Select a conversation to start chatting</p>
        ) : loading && !activeConversation ? (
          <div class="p-8 text-center">Loading conversation...</div>
        ) : activeConversation ? (
          <>
            <div class="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
              <div class="flex items-center gap-3">
                <a href="/inbox" class="md:hidden btn btn-ghost btn-sm btn-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                </a>
                <div>
                  <h2 class="font-bold">{activeConversation.item.other_user_name || 'Neighbor'}</h2>
                  {activeConversation.item.listing_id && activeConversation.item.listing_game_name && (
                    <a href={`/listings/${activeConversation.item.listing_id}`} class="text-xs link link-primary">
                      {activeConversation.item.listing_created_at
                        ? `${new Date(activeConversation.item.listing_created_at).toLocaleDateString()} · ${activeConversation.item.listing_game_name}`
                        : activeConversation.item.listing_game_name}
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
              <div class="space-y-4">
                {activeConversation.messages.map((msg) => {
                  const fromOther = msg.sender_id !== me?.id;
                  return (
                    <div key={msg.id} class={`flex items-end gap-2 ${fromOther ? 'justify-start' : 'justify-start flex-row-reverse'}`}>
                      <MessageAvatar name={msg.sender_name} avatarUrl={msg.sender_avatar_url} title={fromOther ? (msg.sender_name ?? 'Neighbor') : 'Me'} />
                      <div class={`max-w-[75%] p-3 rounded-2xl text-sm border ${
                        fromOther
                          ? 'bg-base-100 text-base-content border-base-300 rounded-bl-none'
                          : 'bg-primary text-primary-content border-primary rounded-br-none'
                      }`}>
                        {msg.text}
                        <div class={`text-[10px] mt-1 ${fromOther ? 'text-base-content/40' : 'text-primary-content/60'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleReply} class="p-4 border-t border-base-300 bg-base-100 flex gap-2">
              <input
                type="text"
                class="input input-bordered flex-1"
                placeholder="Type a message..."
                value={replyText}
                onInput={(e) => setReplyText((e.target as HTMLInputElement).value)}
                disabled={sending}
              />
              <button type="submit" class="btn btn-primary" disabled={sending || !replyText.trim()}>
                {sending ? <span class="loading loading-spinner loading-xs"></span> : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div class="p-8 text-center text-error">{error || 'Failed to load conversation'}</div>
        )}
      </div>
    </div>
  );
}

function MessageAvatar({ name, avatarUrl, title }: { name: string | null; avatarUrl: string | null; title: string }) {
  const initial = (name ?? 'N').slice(0, 1).toUpperCase();
  return (
    <div title={title} class="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-base-300 bg-base-200 grid place-items-center">
      {avatarUrl ? (
        <img alt={name ?? 'User'} src={avatarUrl} referrerpolicy="no-referrer" class="w-full h-full object-cover" />
      ) : (
        <span class="text-xs font-semibold text-base-content/70">{initial}</span>
      )}
    </div>
  );
}
