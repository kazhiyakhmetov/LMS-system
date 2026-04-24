import { getInitials, getLastMessage } from "../../lib/utils/chat";
import styles from "./ChatWorkspace.module.css";

export default function ChatWorkspace({
  title,
  primaryActionLabel,
  secondaryActionLabel,
  searchPlaceholder = "Поиск...",
  filters = [],
  typeFilter = "all",
  onTypeFilterChange,
  search,
  onSearchChange,
  chats,
  activeChatId,
  onSelectChat,
  activeChat,
  draft,
  onDraftChange,
  onSend,
  emptyText = "Ничего не найдено.",
}) {
  return (
    <div className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.topBar}>
          <h2 className={styles.topTitle}>{title}</h2>
          <div className={styles.topActions}>
            <button type="button" className={styles.primaryBtn}>
              {primaryActionLabel}
            </button>
            <button type="button" className={styles.ghostBtn}>
              {secondaryActionLabel}
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          <aside className={styles.leftPane}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon} aria-hidden="true">
                🔎
              </span>
              <input
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>

            {filters.length ? (
              <div className={styles.filterRow}>
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`${styles.filterChip} ${typeFilter === filter.key ? styles.filterChipActive : ""}`}
                    onClick={() => onTypeFilterChange(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            ) : null}

            <ul className={styles.chatList}>
              {chats.map((chat) => {
                const lastMessage = getLastMessage(chat);
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      className={`${styles.chatItem} ${activeChatId === chat.id ? styles.chatItemActive : ""}`}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <span className={styles.avatar}>{getInitials(chat.name)}</span>
                      <span className={styles.chatInfo}>
                        <span className={styles.chatName}>{chat.name}</span>
                        <span className={styles.chatRole}>{chat.role}</span>
                        <span className={styles.chatPreview}>{lastMessage?.text ?? "Нет сообщений"}</span>
                        <span className={styles.chatDate}>{lastMessage?.time ?? ""}</span>
                      </span>
                      {chat.unread > 0 ? <span className={styles.unread}>{chat.unread}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className={styles.rightPane}>
            {activeChat ? (
              <>
                <header className={styles.dialogHead}>
                  <span className={styles.dialogAvatar}>{getInitials(activeChat.name)}</span>
                  <div className={styles.dialogMeta}>
                    <p className={styles.dialogName}>{activeChat.name}</p>
                    <p className={styles.dialogSub}>
                      {activeChat.role} • {activeChat.email}
                    </p>
                  </div>
                </header>

                <div className={styles.messages}>
                  {activeChat.messages.map((message) => (
                    <div
                      key={`${activeChat.id}-${message.id}`}
                      className={`${styles.messageRow} ${message.sender === "out" ? styles.outgoing : styles.incoming}`}
                    >
                      <div className={styles.messageBubble}>
                        <p className={styles.messageText}>{message.text}</p>
                        <span className={styles.messageTime}>{message.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <form className={styles.composer} onSubmit={onSend}>
                  <textarea
                    className={styles.input}
                    placeholder="Введите сообщение..."
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    rows={2}
                  />
                  <button type="submit" className={styles.sendBtn} disabled={!draft.trim()}>
                    Отправить
                  </button>
                </form>
              </>
            ) : (
              <div className={styles.emptyState}>{emptyText}</div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
