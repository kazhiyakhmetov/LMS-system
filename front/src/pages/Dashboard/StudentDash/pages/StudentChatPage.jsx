import ChatWorkspace from "../../../../shared/ui/ChatWorkspace/ChatWorkspace";
import { useChatWorkspace } from "../../../../shared/lib/hooks/useChatWorkspace";

const initialChats = [
  {
    id: "aigul",
    name: "Айгуль Смагулова",
    email: "a.smagulova@school.kz",
    role: "Куратор",
    unread: 2,
    type: "teacher",
    messages: [
      { id: 1, sender: "in", text: "Привет! Успеваешь с проектом по истории?", time: "16:20" },
      { id: 2, sender: "out", text: "Да, готовлю презентацию, отправлю вечером.", time: "16:31" },
      { id: 3, sender: "in", text: "Отлично, жду до 18:00 в LMS.", time: "16:34" },
    ],
  },
  {
    id: "damir",
    name: "Дамир Ахметов",
    email: "damir.akhmetov@school.kz",
    role: "Одноклассник",
    unread: 0,
    type: "classmate",
    messages: [
      { id: 1, sender: "in", text: "Ты сделал алгебру №12?", time: "14:08" },
      { id: 2, sender: "out", text: "Да, могу скинуть решение первого задания.", time: "14:12" },
    ],
  },
  {
    id: "asylbek",
    name: "Alihanchik Asylbekchik",
    email: "ttt.mas@school.kz",
    role: "Одноклассник",
    unread: 1,
    type: "classmate",
    messages: [
      { id: 1, sender: "out", text: "Здравствуйте! Я хотел спросить, когда будет урок?", time: "20:55" },
      { id: 2, sender: "out", text: "И еще: будет ли проверка тетрадей завтра?", time: "21:01" },
    ],
  },
  {
    id: "sultan",
    name: "Султан Алиев",
    email: "s.aliev@school.kz",
    role: "Одноклассник",
    unread: 0,
    type: "classmate",
    messages: [{ id: 1, sender: "in", text: "Калайсын братишка!", time: "12:16" }],
  },
];

export default function StudentChatPage() {
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
  } = useChatWorkspace(initialChats, {
    initialFilter: "all",
    filterField: "type",
    searchFields: ["name", "email", "role"],
  });

  return (
    <ChatWorkspace
      title="Мои чаты"
      primaryActionLabel="Новый чат"
      secondaryActionLabel="Назад"
      searchPlaceholder="Поиск пользователей..."
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
      emptyText="Ничего не найдено. Измените запрос поиска."
    />
  );
}
