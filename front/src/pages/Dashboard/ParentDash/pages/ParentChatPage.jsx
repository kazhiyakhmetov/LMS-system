import ChatWorkspace from "../../../../shared/ui/ChatWorkspace/ChatWorkspace";
import { useChatApi } from "../../../../shared/lib/hooks/useChatApi";
import { useAuth } from "../../../../contexts/AuthContext";

export default function ParentChatPage() {
  const { user } = useAuth();
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filteredChats,
    activeChatId,
    setActiveChatId,
    activeChat,
    draft,
    setDraft,
    handleSend,
    startChat,
    loading,
    error,
  } = useChatApi(user?.id);

  if (loading && !filteredChats.length) {
    return <div style={{ padding: 24 }}>Загрузка чатов…</div>;
  }
  if (error && !filteredChats.length) {
    return <div style={{ padding: 24, color: "var(--danger)" }}>Ошибка: {error.message}</div>;
  }

  return (
    <ChatWorkspace
      title="Чаты с преподавателями"
      primaryActionLabel="Новый чат"
      secondaryActionLabel="Архив"
      searchPlaceholder="Поиск по контактам..."
      filters={[]}
      typeFilter={typeFilter}
      onTypeFilterChange={setTypeFilter}
      search={search}
      onSearchChange={setSearch}
      chats={filteredChats}
      activeChatId={activeChatId}
      onSelectChat={setActiveChatId}
      activeChat={activeChat}
      draft={draft}
      onDraftChange={setDraft}
      onSend={handleSend}
      onStartChat={startChat}
      emptyText="Нет активных диалогов."
    />
  );
}
