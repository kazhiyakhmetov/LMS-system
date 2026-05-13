import { useEffect, useRef, useState } from "react";
import { getInitials, getLastMessage } from "../../lib/utils/chat";
import { friendsApi, filesApi } from "../../lib/api";
import styles from "./ChatWorkspace.module.css";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const EMOJI_INSERT = ["😀", "😂", "😊", "😍", "🤔", "👍", "👏", "❤️", "🔥", "🎉", "✅", "❌", "📚", "📝", "🙏", "💯"];

function humanFileSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

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
  onStartChat,
}) {
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState("");
  const [newChatResults, setNewChatResults] = useState([]);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [newChatError, setNewChatError] = useState("");

  // Локально управляемый reply (если родитель не передал свой через onReply).
  const [localReplyingTo, setLocalReplyingTo] = useState(null);
  const effectiveReplyingTo = replyingTo ?? localReplyingTo;

  // Прикреплённый файл к следующему сообщению.
  const [attachment, setAttachment] = useState(null); // { url, name, size }
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef(null);

  // Эмодзи-палитра.
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef(null);

  useEffect(() => {
    if (!emojiOpen) return undefined;
    const onDocClick = (e) => {
      if (emojiBtnRef.current && !emojiBtnRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [emojiOpen]);

  async function handleFilePick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAttachmentError("");
    setAttachmentUploading(true);
    try {
      const uploaded = await filesApi.uploadSubmission(file);
      setAttachment({
        url: uploaded.filePath ?? uploaded.url ?? null,
        name: uploaded.fileName ?? file.name,
        size: uploaded.fileSize ?? file.size ?? null,
      });
    } catch (err) {
      setAttachmentError(err?.message || "Ошибка загрузки файла");
    } finally {
      setAttachmentUploading(false);
    }
  }

  function insertEmoji(emoji) {
    if (typeof onDraftChange === "function") onDraftChange((draft || "") + emoji);
    setEmojiOpen(false);
  }

  function submitMessage(e) {
    e?.preventDefault?.();
    if (typeof onSend !== "function") return;
    const payload = {
      event: e,
      replyToId: effectiveReplyingTo?.id ?? null,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentSize: attachment?.size ?? null,
    };
    // Сбрасываем UI-состояния ДО await (фикс задержки сетевого вызова).
    setLocalReplyingTo(null);
    setAttachment(null);
    setAttachmentError("");
    try {
      onSend(payload);
    } catch { /* родитель обработает */ }
  }

  // Единый маппер ответа /friends/my и /friends/search — оба возвращают UserSearchDTO[].
  const mapPeer = (u, isFriend = false) => {
    if (!u) return null;
    const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return {
      id: u.id,
      name: full || u.email || `#${u.id}`,
      email: u.email || "",
      role: u.role || "",
      avatarPath: u.profilePhotoPath || null,
      _isFriend: isFriend,
    };
  };

  // При открытии модалки — сразу подгружаем друзей. Поиск в БД работает по
  // вводу (debounce 350ms). Если функция onStartChat не передана родителем,
  // не показываем модалку (компонент остаётся обратно-совместимым).
  useEffect(() => {
    if (!newChatOpen) return;
    let cancelled = false;
    setNewChatLoading(true);
    setNewChatError("");
    friendsApi.myFriends()
      .then((list) => {
        if (cancelled) return;
        const friends = (Array.isArray(list) ? list : [])
          .map((u) => mapPeer(u, true))
          .filter((p) => p && p.id != null);
        setNewChatResults(friends);
      })
      .catch((err) => { if (!cancelled) setNewChatError(err?.message || "Ошибка загрузки друзей"); })
      .finally(() => { if (!cancelled) setNewChatLoading(false); });
    return () => { cancelled = true; };
  }, [newChatOpen]);

  // Поиск по серверу (с дебаунсом). Включается когда юзер начал вводить >=2 символов.
  useEffect(() => {
    if (!newChatOpen) return;
    const q = newChatQuery.trim();
    if (q.length < 2) return;
    const handler = setTimeout(async () => {
      setNewChatLoading(true);
      setNewChatError("");
      try {
        const list = await friendsApi.search(q);
        const mapped = (Array.isArray(list) ? list : [])
          .map((u) => mapPeer(u, u?.friendshipStatus === "ACCEPTED"))
          .filter((p) => p && p.id != null);
        setNewChatResults(mapped);
      } catch (err) {
        setNewChatError(err?.message || "Ошибка поиска");
      } finally {
        setNewChatLoading(false);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [newChatQuery, newChatOpen]);

  function pickPeer(peer) {
    if (onStartChat) onStartChat(peer);
    setNewChatOpen(false);
    setNewChatQuery("");
    setNewChatResults([]);
  }

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
    if (!menu?.message) { setMenu(null); return; }
    if (onReply) onReply(menu.message);
    else setLocalReplyingTo(menu.message);
    setMenu(null);
  }

  // Открыть меню программно через ⋯-кнопку рядом с пузырьком.
  function openMenuFromButton(event, message) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({
      message,
      x: Math.min(rect.left, window.innerWidth - 220),
      y: Math.min(rect.bottom + 6, window.innerHeight - 200),
      anchorTop: rect.top,
    });
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
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => { if (onStartChat) setNewChatOpen(true); }}
              disabled={!onStartChat}
              title={onStartChat ? "" : "Начало нового чата недоступно"}
            >
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
                      <div className={styles.messageActions}>
                        <button
                          type="button"
                          className={styles.messageMoreBtn}
                          onClick={(e) => openMenuFromButton(e, message)}
                          title="Действия с сообщением"
                          aria-label="Действия"
                        >⋯</button>
                      </div>
                      <div
                        className={styles.messageBubble}
                        onContextMenu={(e) => openMenu(e, message)}
                        onDoubleClick={(e) => openMenu(e, message)}
                        title="ПКМ или двойной клик — меню"
                      >
                        {message.replyTo ? (
                          <div className={styles.replyQuote}>
                            <span className={styles.replyQuoteText}>
                              {message.replyTo.senderName ? `${message.replyTo.senderName}: ` : ""}
                              {message.replyTo.text || ""}
                            </span>
                          </div>
                        ) : null}
                        {message.text ? (
                          <p className={styles.messageText}>{message.text}</p>
                        ) : null}
                        {message.attachmentUrl ? (
                          <a
                            href={`/uploads/${message.attachmentUrl.replace(/^\//, "")}`}
                            download={message.attachmentName || ""}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.attachmentLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className={styles.attachmentIcon}>📎</span>
                            <span className={styles.attachmentInfo}>
                              <span className={styles.attachmentName}>{message.attachmentName || "Файл"}</span>
                              {message.attachmentSize != null ? (
                                <span className={styles.attachmentSize}>{humanFileSize(message.attachmentSize)}</span>
                              ) : null}
                            </span>
                          </a>
                        ) : null}
                        {message.reactions && Object.values(message.reactions).length ? (
                          <span className={styles.messageReaction}>
                            {Array.from(new Set(Object.values(message.reactions))).join(" ")}
                          </span>
                        ) : null}
                        <span className={styles.messageTime}>{message.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {effectiveReplyingTo ? (
                  <div className={styles.replyBar}>
                    <div className={styles.replyBarContent}>
                      <span className={styles.replyBarLabel}>Ответ на:</span>
                      <span className={styles.replyBarText}>{effectiveReplyingTo.text}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.replyBarClose}
                      onClick={() => { setLocalReplyingTo(null); if (onCancelReply) onCancelReply(); }}
                      aria-label="Отменить ответ"
                    >×</button>
                  </div>
                ) : null}

                {attachment ? (
                  <div className={styles.attachmentBar}>
                    <span className={styles.attachmentIcon}>📎</span>
                    <span className={styles.attachmentBarInfo}>
                      <span className={styles.attachmentName}>{attachment.name}</span>
                      <span className={styles.attachmentSize}>{humanFileSize(attachment.size)}</span>
                    </span>
                    <button
                      type="button"
                      className={styles.replyBarClose}
                      onClick={() => setAttachment(null)}
                      aria-label="Убрать вложение"
                    >×</button>
                  </div>
                ) : null}

                {attachmentError ? (
                  <p className={styles.attachmentError}>{attachmentError}</p>
                ) : null}

                <form className={styles.composer} onSubmit={submitMessage}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleFilePick}
                  />
                  <div className={styles.composerToolbar}>
                    <button
                      type="button"
                      className={styles.toolBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachmentUploading}
                      title="Прикрепить файл"
                      aria-label="Прикрепить файл"
                    >
                      {attachmentUploading ? "…" : "📎"}
                    </button>
                    <div ref={emojiBtnRef} style={{ position: "relative" }}>
                      <button
                        type="button"
                        className={styles.toolBtn}
                        onClick={() => setEmojiOpen((v) => !v)}
                        title="Эмодзи"
                        aria-label="Эмодзи"
                      >😊</button>
                      {emojiOpen ? (
                        <div className={styles.emojiPopover}>
                          {EMOJI_INSERT.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className={styles.emojiPick}
                              onClick={() => insertEmoji(emoji)}
                            >{emoji}</button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <textarea
                    className={styles.input}
                    placeholder="Введите сообщение..."
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    rows={2}
                  />
                  <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={!draft.trim() && !attachment}
                  >
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

      {newChatOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setNewChatOpen(false); }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <header className={styles.modalHead}>
              <h3 className={styles.modalTitle}>Начать новый чат</h3>
              <button type="button" className={styles.modalClose} onClick={() => setNewChatOpen(false)} aria-label="Закрыть">×</button>
            </header>
            <input
              autoFocus
              type="text"
              className={styles.modalSearch}
              placeholder="Имя или email пользователя"
              value={newChatQuery}
              onChange={(e) => setNewChatQuery(e.target.value)}
            />
            <p className={styles.modalHint}>
              {newChatQuery.trim().length < 2 ? "Показаны ваши друзья" : `Результаты поиска: «${newChatQuery.trim()}»`}
            </p>
            {newChatLoading ? (
              <p className={styles.modalEmpty}>Загрузка…</p>
            ) : newChatError ? (
              <p className={styles.modalEmpty} style={{ color: "var(--danger-strong)" }}>{newChatError}</p>
            ) : newChatResults.length ? (
              <ul className={styles.peerList}>
                {newChatResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={styles.peerItem}
                      onClick={() => pickPeer(p)}
                    >
                      <span className={styles.peerAvatar}>{getInitials(p.name || p.email)}</span>
                      <span className={styles.peerInfo}>
                        <span className={styles.peerName}>{p.name || p.email || `#${p.id}`}</span>
                        <span className={styles.peerMeta}>
                          {p.email}{p.role ? ` • ${p.role}` : ""}
                          {p._isFriend ? " • друг" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.modalEmpty}>
                {newChatQuery.trim().length < 2
                  ? "У вас пока нет друзей. Найдите пользователя по имени или email."
                  : "Никого не найдено."}
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
