import ChatWorkspace from "../../../../shared/ui/ChatWorkspace/ChatWorkspace";
import { useChatApi } from "../../../../shared/lib/hooks/useChatApi";
import { useAuth } from "../../../../contexts/AuthContext";
import { useT } from "../../../../shared/lib/i18n";

export default function StudentChatPage() {
  const { t } = useT();
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
    loading,
    error,
  } = useChatApi(user?.id);

  if (loading && !filteredChats.length) {
    return <div style={{ padding: 24 }}>{t("student.chat.loading")}</div>;
  }
  if (error && !filteredChats.length) {
    return <div style={{ padding: 24, color: "var(--danger)" }}>{t("common.error")}: {error.message}</div>;
  }

  return (
    <ChatWorkspace
      title={t("student.chat.title")}
      primaryActionLabel={t("student.chat.newChat")}
      secondaryActionLabel={t("common.back")}
      searchPlaceholder={t("student.chat.searchPlaceholder")}
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
      emptyText={t("student.chat.empty")}
    />
  );
}
