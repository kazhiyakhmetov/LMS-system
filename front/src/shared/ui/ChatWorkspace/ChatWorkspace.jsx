import { useEffect, useRef, useState } from "react";
import { getInitials, getLastMessage } from "../../lib/utils/chat";
import styles from "./ChatWorkspace.module.css";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

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
  onReply,
  onReact,
  replyingTo,
  onCancelReply,
}) {
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function openMenu(event, message) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({
      message,
      x: Math.min(event.clientX, window.innerWidth - 220),
      y: Math.min(event.clientY, window.innerHeight - 200),
      anchorTop: rect.top,
    });
  }

  function handleCopy() {
    if (!menu?.message?.text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(menu.message.text);
    }
    setMenu(null);
  }

  function handleReply() {
    if (onReply && menu?.message) onReply(menu.message);
    setMenu(null);
  }

  function handleReact(emoji) {
    if (onReact && menu?.message) onReact(menu.message, emoji);
    setMenu(null);
  }
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
                      <div
                        className={styles.messageBubble}
                        onContextMenu={(e) => openMenu(e, message)}
                        onDoubleClick={(e) => openMenu(e, message)}
                        title="ПКМ или двойной клик — меню"
                      >
                        {message.replyTo ? (
                          <div className={styles.replyQuote}>
                            <span className={styles.replyQuoteText}>{message.replyTo.text || ""}</span>
                          </div>
                        ) : null}
                        <p className={styles.messageText}>{message.text}</p>
                        {message.reaction ? (
                          <span className={styles.messageReaction}>{message.reaction}</span>
                        ) : null}
                        <span className={styles.messageTime}>{message.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {replyingTo ? (
                  <div className={styles.replyBar}>
                    <div className={styles.replyBarContent}>
                      <span className={styles.replyBarLabel}>Ответ на:</span>
                      <span className={styles.replyBarText}>{replyingTo.text}</span>
                    </div>
                    <button type="button" className={styles.replyBarClose} onClick={onCancelReply} aria-label="Отменить ответ">×</button>
                  </div>
                ) : null}

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

                {menu ? (
                  <div
                    ref={menuRef}
                    className={styles.contextMenu}
                    style={{ top: menu.y, left: menu.x }}
                  >
                    {onReply ? (
                      <button type="button" className={styles.contextItem} onClick={handleReply}>
                        <span className={styles.contextIcon}>↩</span> Ответить
                      </button>
                    ) : null}
                    {onReact ? (
                      <div className={styles.reactionRow}>
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className={styles.reactionBtn}
                            onClick={() => handleReact(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button type="button" className={styles.contextItem} onClick={handleCopy}>
                      <span className={styles.contextIcon}>⎘</span> Копировать текст
                    </button>
                  </div>
                ) : null}
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
