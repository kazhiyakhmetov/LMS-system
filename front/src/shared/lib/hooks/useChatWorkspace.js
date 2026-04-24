import { useEffect, useMemo, useState } from "react";
import { formatChatTime } from "../utils/format";

const DEFAULT_SEARCH_FIELDS = ["name", "email"];

export function useChatWorkspace(initialChats, options = {}) {
  const { initialFilter = "all", searchFields = DEFAULT_SEARCH_FIELDS, filterField = "type" } = options;

  const [chats, setChats] = useState(initialChats);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(initialFilter);
  const [activeChatId, setActiveChatId] = useState(initialChats[0]?.id ?? null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setChats(initialChats);
    setActiveChatId(initialChats[0]?.id ?? null);
  }, [initialChats]);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    return chats.filter((chat) => {
      const matchesFilter = typeFilter === "all" || chat[filterField] === typeFilter;
      const matchesQuery =
        !query ||
        searchFields.some((field) => {
          const value = chat[field];
          return typeof value === "string" && value.toLowerCase().includes(query);
        });

      return matchesFilter && matchesQuery;
    });
  }, [chats, search, typeFilter, searchFields, filterField]);

  useEffect(() => {
    if (!filteredChats.length) {
      setActiveChatId(null);
      return;
    }

    // Если активный чат исчез из текущего фильтра, выбираем первый доступный.
    const exists = filteredChats.some((chat) => chat.id === activeChatId);
    if (!exists) {
      setActiveChatId(filteredChats[0].id);
    }
  }, [filteredChats, activeChatId]);

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return chats.find((chat) => chat.id === activeChatId) ?? null;
  }, [chats, activeChatId]);

  const handleSend = (event) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !activeChatId) return;

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              unread: 0,
              messages: [
                ...chat.messages,
                {
                  id: Date.now(),
                  sender: "out",
                  text,
                  time: formatChatTime(),
                },
              ],
            }
          : chat,
      ),
    );

    setDraft("");
  };

  return {
    chats,
    setChats,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    activeChatId,
    setActiveChatId,
    draft,
    setDraft,
    filteredChats,
    activeChat,
    handleSend,
  };
}
