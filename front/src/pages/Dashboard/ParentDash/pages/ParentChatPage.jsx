import ChatWorkspace from "../../../../shared/ui/ChatWorkspace/ChatWorkspace";
import { useChatWorkspace } from "../../../../shared/lib/hooks/useChatWorkspace";

const filters = [
  { key: "all", label: "Все" },
  { key: "curator", label: "Куратор" },
  { key: "teacher", label: "Учителя" },
  { key: "admin", label: "Школа" },
];

const initialChats = [
  {
    id: "curator",
    name: "Динара Турсынова",
    email: "d.tursynova@school.kz",
    role: "Куратор 10-А",
    type: "curator",
    unread: 1,
    messages: [
      { id: 1, sender: "in", text: "Добрый день. Хотела обсудить динамику Алии по геометрии.", time: "13:42" },
      { id: 2, sender: "out", text: "Добрый день, давайте. Удобно сегодня после 18:00?", time: "13:50" },
    ],
  },
  {
    id: "math-teacher",
    name: "К. Муханова",
    email: "k.mukhanova@school.kz",
    role: "Учитель алгебры",
    type: "teacher",
    unread: 0,
    messages: [
      { id: 1, sender: "in", text: "Алия хорошо пишет самостоятельные, но нужно усилить подготовку к СОР.", time: "10:05" },
      { id: 2, sender: "out", text: "Спасибо, будем дома дополнительно тренироваться.", time: "10:21" },
    ],
  },
  {
    id: "deputy",
    name: "Завуч по учебной части",
    email: "deputy.edu@school.kz",
    role: "Администрация",
    type: "admin",
    unread: 2,
    messages: [
      { id: 1, sender: "in", text: "Напоминаем о родительском собрании в пятницу, 18:30.", time: "09:10" },
      { id: 2, sender: "in", text: "Просьба подтвердить участие в LMS.", time: "09:11" },
    ],
  },
  {
    id: "informatics",
    name: "А. Жанибек",
    email: "a.zhanibek@school.kz",
    role: "Учитель информатики",
    type: "teacher",
    unread: 0,
    messages: [{ id: 1, sender: "out", text: "Спасибо за обратную связь по проектной работе.", time: "18:12" }],
  },
];

export default function ParentChatPage() {
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
      title="Чаты с преподавателями"
      primaryActionLabel="Новый чат"
      secondaryActionLabel="Архив"
      searchPlaceholder="Поиск по контактам..."
      filters={filters}
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
      emptyText="По выбранным условиям чаты не найдены."
    />
  );
}
