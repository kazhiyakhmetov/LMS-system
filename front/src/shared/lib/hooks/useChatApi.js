import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chatApi } from "../api/chat.api";
import { formatChatTime } from "../utils/format";

const POLL_INTERVAL = 6000;

function mapConversation(conv) {
  return {
    id: conv.otherUserId,
    name: conv.otherUserName || "Без имени",
    email: "",
    role: "",
    type: "chat",
    unread: conv.unreadCount || 0,
    avatar: conv.otherUserAvatar || null,
    lastMessage: conv.lastMessage || "",
    lastMessageTime: conv.lastMessageTime,
    messages: [],
  };
}

function mapMessage(msg, currentUserId) {
  return {
    id: msg.id,
    sender: String(msg.senderId) === String(currentUserId) ? "out" : "in",
    text: msg.content || "",
    time: msg.createdAt ? formatChatTime(new Date(msg.createdAt)) : "",
    attachmentUrl: msg.attachmentUrl || null,
    attachmentName: msg.attachmentName || null,
    attachmentSize: msg.attachmentSize ?? null,
    replyTo: msg.replyTo ? {
      id: msg.replyTo.id,
      text: msg.replyTo.content || "",
      senderName: msg.replyTo.senderName || "",
    } : null,
    reactions: msg.reactions || null,
  };
}

export function useChatApi(currentUserId, options = {}) {
  const { searchFields = ["name"] } = options;

  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesCacheRef = useRef(new Map());

  const loadConversations = useCallback(async () => {
    try {
      const list = await chatApi.conversations();
      const mapped = (Array.isArray(list) ? list : []).map(mapConversation);
      mapped.forEach((c) => {
        const cached = messagesCacheRef.current.get(c.id);
        if (cached) c.messages = cached;
      });
      setChats(mapped);
      setLoading(false);
      return mapped;
    } catch (err) {
      setError(err);
      setLoading(false);
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadConversations().then((mapped) => {
      if (!cancelled && mapped.length && activeChatId == null) {
        setActiveChatId(mapped[0].id);
      }
    });
    const timer = setInterval(() => {
      if (!cancelled) loadConversations();
    }, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations]);

  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const list = await chatApi.conversation(chatId);
      const mapped = (Array.isArray(list) ? list : []).map((m) => mapMessage(m, currentUserId));
      messagesCacheRef.current.set(chatId, mapped);
      setChats((prev) => prev.map((c) =>
        String(c.id) === String(chatId) ? { ...c, messages: mapped, unread: 0 } : c,
      ));
    } catch { /* ignore */ }
  }, [currentUserId]);

  useEffect(() => {
    if (!activeChatId) return undefined;
    loadMessages(activeChatId);
    const timer = setInterval(() => loadMessages(activeChatId), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [activeChatId, loadMessages]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => searchFields.some((field) => {
      const v = chat[field];
      return typeof v === "string" && v.toLowerCase().includes(q);
    }));
  }, [chats, search, searchFields]);

  useEffect(() => {
    if (!filteredChats.length) {
      if (activeChatId != null) setActiveChatId(null);
      return;
    }
    const exists = filteredChats.some((c) => String(c.id) === String(activeChatId));
    if (!exists) setActiveChatId(filteredChats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredChats]);

  const activeChat = useMemo(
    () => activeChatId != null ? chats.find((c) => String(c.id) === String(activeChatId)) ?? null : null,
    [chats, activeChatId],
  );

  /**
   * Отправка сообщения. Принимает либо form-event, либо объект-payload
   * с опциональными полями replyToId / attachmentUrl / attachmentName / attachmentSize.
   * Сохраняет обратную совместимость с <form onSubmit={handleSend}>.
   */
  const handleSend = useCallback(async (eventOrPayload) => {
    let extra = {};
    if (eventOrPayload && typeof eventOrPayload.preventDefault === "function") {
      eventOrPayload.preventDefault();
    } else if (eventOrPayload && typeof eventOrPayload === "object") {
      extra = eventOrPayload;
      extra.event?.preventDefault?.();
    }
    const text = draft.trim();
    if (activeChatId == null) return;
    if (!text && !extra.attachmentUrl) return;
    try {
      await chatApi.send({
        receiverId: activeChatId,
        content: text,
        replyToId: extra.replyToId ?? null,
        attachmentUrl: extra.attachmentUrl ?? null,
        attachmentName: extra.attachmentName ?? null,
        attachmentSize: extra.attachmentSize ?? null,
      });
      setDraft("");
      await loadMessages(activeChatId);
      await loadConversations();
    } catch (err) {
      setError(err);
    }
  }, [draft, activeChatId, loadMessages, loadConversations]);

  /**
   * Открыть/создать чат с произвольным пользователем (например, после клика
   * на «Новый чат» → выбор человека). Если у нас уже есть с ним переписка —
   * просто переключаемся; иначе добавляем "stub" в список, чтобы UI мог
   * показать пустой диалог. Реальная запись в БД появится после первого
   * отправленного сообщения.
   */
  const startChat = useCallback((peer) => {
    if (!peer || peer.id == null) return;
    setChats((prev) => {
      if (prev.some((c) => String(c.id) === String(peer.id))) return prev;
      const stub = {
        id: peer.id,
        name: peer.name || peer.fullName || peer.email || "Без имени",
        email: peer.email || "",
        role: peer.role || "",
        type: "chat",
        unread: 0,
        avatar: peer.avatarPath || peer.profilePhotoPath || null,
        lastMessage: "",
        lastMessageTime: null,
        messages: [],
      };
      return [stub, ...prev];
    });
    setActiveChatId(peer.id);
  }, []);

  return {
    chats,
    search,
    setSearch,
    typeFilter: "all",
    setTypeFilter: () => {},
    activeChatId,
    setActiveChatId,
    draft,
    setDraft,
    filteredChats,
    activeChat,
    handleSend,
    startChat,
    loading,
    error,
    refetch: loadConversations,
  };
}
