import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./FriendsView.module.css";
import { friendsApi } from "../../lib/api/friends.api";
import { getAvatarUrl, getInitials } from "../../lib/utils/avatar";

const TABS = {
  FRIENDS: "friends",
  REQUESTS: "requests",
  SEARCH: "search",
};

const ROLE_LABELS_RU = {
  ADMIN: "Админ",
  TEACHER: "Учитель",
  STUDENT: "Ученик",
  PARENT: "Родитель",
};

function roleLabel(role) {
  if (!role) return "";
  const upper = String(role).toUpperCase();
  return ROLE_LABELS_RU[upper] || role;
}

function isAdminRole(role) {
  return role && String(role).toUpperCase() === "ADMIN";
}

function Avatar({ name, photoPath }) {
  const url = getAvatarUrl(photoPath);
  if (url) {
    return (
      <span className={styles.avatar}>
        <img src={url} alt={name || ""} />
      </span>
    );
  }
  return <span className={styles.avatar}>{getInitials(name)}</span>;
}

function FriendCard({ name, email, role, photoPath, actions, isAdmin = false }) {
  return (
    <li className={styles.card}>
      <div className={styles.cardLeft}>
        <Avatar name={name} photoPath={photoPath} />
        <div className={styles.cardBody}>
          <p className={styles.cardName}>
            {name}
            {role ? (
              <span className={`${styles.rolePill} ${isAdmin ? styles.rolePillAdmin : ""}`}>
                {roleLabel(role)}
              </span>
            ) : null}
          </p>
          <p className={styles.cardMeta}>{email}</p>
        </div>
      </div>
      <div className={styles.cardActions}>{actions}</div>
    </li>
  );
}

export default function FriendsView() {
  const [activeTab, setActiveTab] = useState(TABS.FRIENDS);

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ friendsCount: 0, pendingRequestsCount: 0 });

  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyUsers, setBusyUsers] = useState({});

  const setBusy = useCallback((key, value) => {
    setBusyUsers((prev) => {
      if (value) return { ...prev, [key]: true };
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const s = await friendsApi.stats();
      setStats(s || { friendsCount: 0, pendingRequestsCount: 0 });
    } catch {
      /* non-critical */
    }
  }, []);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    setError("");
    try {
      const data = await friendsApi.myFriends();
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Не удалось загрузить друзей");
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    setError("");
    try {
      const data = await friendsApi.pending();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Не удалось загрузить запросы");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
    loadRequests();
    refreshStats();
  }, [loadFriends, loadRequests, refreshStats]);

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const data = await friendsApi.search(q);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || "Ошибка поиска");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const handleSendRequest = useCallback(
    async (user) => {
      if (!user?.id) return;
      if (isAdminRole(user.role)) {
        setError("Нельзя добавить администратора в друзья");
        return;
      }
      setBusy(`send-${user.id}`, true);
      setError("");
      try {
        await friendsApi.request(user.id);
        showToast("Запрос отправлен");
        setSearchResults((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, friendshipStatus: "PENDING" } : u)),
        );
        refreshStats();
      } catch (e) {
        setError(e?.message || "Не удалось отправить запрос");
      } finally {
        setBusy(`send-${user.id}`, false);
      }
    },
    [setBusy, showToast, refreshStats],
  );

  const handleAccept = useCallback(
    async (req) => {
      setBusy(`accept-${req.id}`, true);
      setError("");
      try {
        await friendsApi.accept(req.id);
        showToast("Запрос принят");
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        await loadFriends();
        refreshStats();
      } catch (e) {
        setError(e?.message || "Не удалось принять запрос");
      } finally {
        setBusy(`accept-${req.id}`, false);
      }
    },
    [setBusy, showToast, loadFriends, refreshStats],
  );

  const handleReject = useCallback(
    async (req) => {
      setBusy(`reject-${req.id}`, true);
      setError("");
      try {
        await friendsApi.reject(req.id);
        showToast("Запрос отклонён");
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        refreshStats();
      } catch (e) {
        setError(e?.message || "Не удалось отклонить запрос");
      } finally {
        setBusy(`reject-${req.id}`, false);
      }
    },
    [setBusy, showToast, refreshStats],
  );

  const handleRemove = useCallback(
    async (friend) => {
      if (!friend?.id) return;
      if (!window.confirm(`Удалить из друзей: ${friend.firstName} ${friend.lastName}?`)) return;
      setBusy(`remove-${friend.id}`, true);
      setError("");
      try {
        await friendsApi.remove(friend.id);
        showToast("Удалено из друзей");
        setFriends((prev) => prev.filter((f) => f.id !== friend.id));
        refreshStats();
      } catch (e) {
        setError(e?.message || "Не удалось удалить из друзей");
      } finally {
        setBusy(`remove-${friend.id}`, false);
      }
    },
    [setBusy, showToast, refreshStats],
  );

  const pendingCount = requests.length || stats.pendingRequestsCount || 0;

  const friendsContent = useMemo(() => {
    if (loadingFriends && friends.length === 0) {
      return <p className={styles.empty}>Загрузка…</p>;
    }
    if (friends.length === 0) {
      return <p className={styles.empty}>У вас пока нет друзей. Найдите кого-нибудь во вкладке «Поиск».</p>;
    }
    return (
      <ul className={styles.list}>
        {friends.map((friend) => {
          const fullName = `${friend.firstName || ""} ${friend.lastName || ""}`.trim();
          const busy = !!busyUsers[`remove-${friend.id}`];
          return (
            <FriendCard
              key={friend.id}
              name={fullName}
              email={friend.email}
              role={friend.role}
              photoPath={friend.profilePhotoPath}
              isAdmin={isAdminRole(friend.role)}
              actions={
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => handleRemove(friend)}
                  disabled={busy}
                >
                  {busy ? "Удаление…" : "Удалить"}
                </button>
              }
            />
          );
        })}
      </ul>
    );
  }, [loadingFriends, friends, busyUsers, handleRemove]);

  const requestsContent = useMemo(() => {
    if (loadingRequests && requests.length === 0) {
      return <p className={styles.empty}>Загрузка…</p>;
    }
    if (requests.length === 0) {
      return <p className={styles.empty}>Новых запросов нет.</p>;
    }
    return (
      <ul className={styles.list}>
        {requests.map((req) => {
          const acceptBusy = !!busyUsers[`accept-${req.id}`];
          const rejectBusy = !!busyUsers[`reject-${req.id}`];
          return (
            <FriendCard
              key={req.id}
              name={req.requesterName}
              email={req.requesterEmail}
              role={req.requesterRole}
              photoPath={req.requesterPhotoPath}
              isAdmin={isAdminRole(req.requesterRole)}
              actions={
                <>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => handleAccept(req)}
                    disabled={acceptBusy || rejectBusy}
                  >
                    {acceptBusy ? "…" : "Принять"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={() => handleReject(req)}
                    disabled={acceptBusy || rejectBusy}
                  >
                    {rejectBusy ? "…" : "Отклонить"}
                  </button>
                </>
              }
            />
          );
        })}
      </ul>
    );
  }, [loadingRequests, requests, busyUsers, handleAccept, handleReject]);

  const searchContent = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return <p className={styles.searchHint}>Введите минимум 2 символа для поиска (имя или email).</p>;
    }
    if (searching && searchResults.length === 0) {
      return <p className={styles.empty}>Поиск…</p>;
    }
    if (searchResults.length === 0) {
      return <p className={styles.empty}>Ничего не найдено.</p>;
    }
    return (
      <ul className={styles.list}>
        {searchResults.map((user) => {
          const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
          const status = user.friendshipStatus;
          const admin = isAdminRole(user.role);
          const busy = !!busyUsers[`send-${user.id}`];

          let action = null;
          if (admin) {
            action = <span className={styles.statusPill}>Админ</span>;
          } else if (status === "SELF") {
            action = <span className={styles.statusPill}>Это вы</span>;
          } else if (status === "ACCEPTED") {
            action = <span className={styles.statusPill}>В друзьях</span>;
          } else if (status === "PENDING") {
            action = <span className={styles.statusPill}>Запрос отправлен</span>;
          } else if (status === "INCOMING_REQUEST") {
            action = <span className={styles.statusPill}>Ждёт ответа</span>;
          } else if (status === "BLOCKED") {
            action = <span className={styles.statusPill}>Заблокирован</span>;
          } else {
            action = (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => handleSendRequest(user)}
                disabled={busy}
              >
                {busy ? "Отправка…" : "Добавить"}
              </button>
            );
          }

          return (
            <FriendCard
              key={user.id}
              name={fullName}
              email={user.email}
              role={user.role}
              photoPath={user.profilePhotoPath}
              isAdmin={admin}
              actions={action}
            />
          );
        })}
      </ul>
    );
  }, [searchQuery, searching, searchResults, busyUsers, handleSendRequest]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h2 className={styles.heroTitle}>Друзья</h2>
          <p className={styles.heroSub}>
            Добавляйте друзей, чтобы общаться в чате — писать сообщения можно только друзьям.
          </p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Всего друзей</p>
            <p className={styles.statValue}>{stats.friendsCount ?? friends.length}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Входящие запросы</p>
            <p className={styles.statValue}>{stats.pendingRequestsCount ?? requests.length}</p>
          </div>
        </div>
      </section>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === TABS.FRIENDS ? styles.tabActive : ""}`}
          onClick={() => setActiveTab(TABS.FRIENDS)}
        >
          Мои друзья
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === TABS.REQUESTS ? styles.tabActive : ""}`}
          onClick={() => setActiveTab(TABS.REQUESTS)}
        >
          Запросы
          {pendingCount > 0 ? <span className={styles.badge}>{pendingCount}</span> : null}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === TABS.SEARCH ? styles.tabActive : ""}`}
          onClick={() => setActiveTab(TABS.SEARCH)}
        >
          Поиск
        </button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {toast ? <div className={styles.toast}>{toast}</div> : null}

      <section className={styles.panel}>
        {activeTab === TABS.FRIENDS && (
          <>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Мои друзья</h3>
                <p className={styles.panelSub}>Список пользователей, с которыми вы можете общаться в чате.</p>
              </div>
            </div>
            {friendsContent}
          </>
        )}

        {activeTab === TABS.REQUESTS && (
          <>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Входящие запросы</h3>
                <p className={styles.panelSub}>Принимайте или отклоняйте запросы от других пользователей.</p>
              </div>
            </div>
            {requestsContent}
          </>
        )}

        {activeTab === TABS.SEARCH && (
          <>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Поиск пользователей</h3>
                <p className={styles.panelSub}>Найдите пользователя по имени или email и отправьте запрос на дружбу.</p>
              </div>
            </div>

            <div className={styles.searchBox}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Введите имя или email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {searchContent}
          </>
        )}
      </section>
    </div>
  );
}
