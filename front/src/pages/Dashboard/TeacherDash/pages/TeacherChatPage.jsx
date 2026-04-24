import ChatWorkspace from "../../../../shared/ui/ChatWorkspace/ChatWorkspace";
import { useChatWorkspace } from "../../../../shared/lib/hooks/useChatWorkspace";

const chatFilters = [
  { key: "all", label: "Все" },
  { key: "student", label: "Ученики" },
  { key: "parent", label: "Родители" },
  { key: "admin", label: "Администрация" },
  { key: "class", label: "Классы" },
];

const initialChats = [
  {
    id: "class-10a",
    name: "10-А: классный канал",
    email: "10a.class@school.kz",
    role: "Класс",
    type: "class",
    unread: 3,
    messages: [
      { id: 1, sender: "in", text: "Завтра контрольная по алгебре, начало в 08:00.", time: "14:11" },
      { id: 2, sender: "out", text: "Подтверждаю. Сегодня к вечеру выложу тренировочный вариант.", time: "14:18" },
      { id: 3, sender: "in", text: "Принято, спасибо!", time: "14:20" },
    ],
  },
  {
    id: "aigerim",
    name: "Айгерим Каримова",
    email: "a.karimova@school.kz",
    role: "Ученица 10-А",
    type: "student",
    unread: 1,
    messages: [
      { id: 1, sender: "in", text: "Можно пересдать задачу №4 до пятницы?", time: "12:32" },
      { id: 2, sender: "out", text: "Да, прикрепи обновленный файл в раздел задач.", time: "12:35" },
      { id: 3, sender: "in", text: "Хорошо, отправлю сегодня.", time: "12:37" },
    ],
  },
  {
    id: "parent-damir",
    name: "Родитель: Ахметов Р.",
    email: "r.akhmetov@parent.kz",
    role: "Родитель Дамира",
    type: "parent",
    unread: 0,
    messages: [
      { id: 1, sender: "in", text: "Добрый день. Можно обсудить успеваемость сына?", time: "10:05" },
      { id: 2, sender: "out", text: "Добрый день. Да, после 16:30 буду на связи.", time: "10:07" },
    ],
  },
  {
    id: "admin",
    name: "Завуч по учебной части",
    email: "deputy.edu@school.kz",
    role: "Администрация",
    type: "admin",
    unread: 2,
    messages: [
      { id: 1, sender: "in", text: "Нужен отчет по СОР за III четверть до 18:00.", time: "09:18" },
      { id: 2, sender: "in", text: "Форму отчета отправила на почту.", time: "09:20" },
    ],
  },
  {
    id: "parent-aliya",
    name: "Родитель: Есенова М.",
    email: "m.esenova@parent.kz",
    role: "Родитель Алии",
    type: "parent",
    unread: 0,
    messages: [{ id: 1, sender: "out", text: "Спасибо, Алию добавила в дополнительную консультацию.", time: "18:44" }],
  },
];

export default function TeacherChatPage() {
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
      title="Рабочие чаты"
      primaryActionLabel="Новый чат"
      secondaryActionLabel="Рассылка"
      searchPlaceholder="Поиск по контактам..."
      filters={chatFilters}
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
