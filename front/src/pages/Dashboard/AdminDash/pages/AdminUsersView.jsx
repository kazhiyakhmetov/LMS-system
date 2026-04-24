import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./AdminPages.module.css";

const users = [
  { id: "ST-1001", name: "Алина Бекенова", role: "STUDENT", classGroup: "10-А", phone: "+7 707 111 22 31", status: "Активен" },
  { id: "ST-1002", name: "Дамир Нуртаев", role: "STUDENT", classGroup: "10-А", phone: "+7 707 111 22 32", status: "Активен" },
  { id: "ST-1003", name: "Сафия Каримова", role: "STUDENT", classGroup: "9-Б", phone: "+7 707 111 22 33", status: "Активен" },
  { id: "ST-1004", name: "Рамазан Абдуллин", role: "STUDENT", classGroup: "8-В", phone: "+7 707 111 22 34", status: "Нужна проверка данных" },
  { id: "ST-1005", name: "Ева Ли", role: "STUDENT", classGroup: "11-А", phone: "+7 707 111 22 35", status: "Активен" },
  { id: "ST-1006", name: "Айбек Жумабеков", role: "STUDENT", classGroup: "7-Г", phone: "+7 707 111 22 36", status: "Активен" },
  { id: "TC-2001", name: "Надежда Волкова", role: "TEACHER", classGroup: "-", phone: "+7 700 332 44 11", status: "Активен" },
  { id: "TC-2002", name: "Руслан Турсынов", role: "TEACHER", classGroup: "-", phone: "+7 700 332 44 12", status: "Активен" },
  { id: "TC-2003", name: "Ольга Ким", role: "TEACHER", classGroup: "-", phone: "+7 700 332 44 13", status: "В отпуске" },
  { id: "PT-3001", name: "Гульнар Сарсенова", role: "PARENT", classGroup: "10-А", phone: "+7 705 998 12 01", status: "Активен" },
  { id: "PT-3002", name: "Алексей Смирнов", role: "PARENT", classGroup: "9-Б", phone: "+7 705 998 12 02", status: "Активен" },
  { id: "PT-3003", name: "Жанна Набиуллина", role: "PARENT", classGroup: "11-А", phone: "+7 705 998 12 03", status: "Нужна верификация" },
];

function roleLabel(role) {
  switch (role) {
    case "STUDENT":
      return "Ученик";
    case "TEACHER":
      return "Учитель";
    case "PARENT":
      return "Родитель";
    default:
      return role;
  }
}

function roleClass(role) {
  switch (role) {
    case "STUDENT":
      return "roleStudent";
    case "TEACHER":
      return "roleTeacher";
    case "PARENT":
      return "roleParent";
    default:
      return "";
  }
}

export default function AdminUsersView() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") ?? "ALL";
  const initialClass = searchParams.get("class") ?? "ALL";

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [classFilter, setClassFilter] = useState(initialClass);
  const [sortBy, setSortBy] = useState("name-asc");

  const classOptions = useMemo(() => {
    const values = new Set(users.filter((item) => item.classGroup !== "-").map((item) => item.classGroup));
    return ["ALL", ...Array.from(values).sort((a, b) => a.localeCompare(b, "ru"))];
  }, []);

  const filteredUsers = useMemo(() => {
    let list = users.filter((item) => {
      const byRole = roleFilter === "ALL" ? true : item.role === roleFilter;
      const byClass = classFilter === "ALL" ? true : item.classGroup === classFilter;
      const search = query.trim().toLowerCase();
      const byQuery =
        search.length === 0
          ? true
          : `${item.name} ${item.id} ${item.phone} ${item.classGroup}`.toLowerCase().includes(search);
      return byRole && byClass && byQuery;
    });

    list = [...list];

    switch (sortBy) {
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name, "ru"));
        break;
      case "class-asc":
        list.sort((a, b) => a.classGroup.localeCompare(b.classGroup, "ru"));
        break;
      case "class-desc":
        list.sort((a, b) => b.classGroup.localeCompare(a.classGroup, "ru"));
        break;
      default:
        list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }

    return list;
  }, [query, roleFilter, classFilter, sortBy]);

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Списки пользователей</h2>
          <p className={styles.sectionSub}>
            Поиск и фильтрация учеников, учителей и родителей по ролям и классам.
          </p>
        </div>
        <span className={styles.statusChip}>
          <span className={styles.dot} />
          Найдено: {filteredUsers.length}
        </span>
      </section>

      <section className={styles.formCard}>
        <div className={styles.usersToolbar}>
          <label className={styles.field}>
            <span className={styles.label}>Поиск</span>
            <input
              className={styles.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Имя, ID, телефон или класс"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Роль</span>
            <select className={styles.select} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="ALL">Все роли</option>
              <option value="STUDENT">Ученики</option>
              <option value="TEACHER">Учителя</option>
              <option value="PARENT">Родители</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Класс</span>
            <select className={styles.select} value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              {classOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "Все классы" : item}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Сортировка</span>
            <select className={styles.select} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name-asc">Имя: А-Я</option>
              <option value="name-desc">Имя: Я-А</option>
              <option value="class-asc">Класс: по возрастанию</option>
              <option value="class-desc">Класс: по убыванию</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>ФИО</th>
              <th>Роль</th>
              <th>Класс</th>
              <th>Телефон</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <p className={styles.emptyState}>По выбранным фильтрам ничего не найдено.</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>
                    <span className={`${styles.rolePill} ${styles[roleClass(item.role)]}`}>{roleLabel(item.role)}</span>
                  </td>
                  <td>{item.classGroup}</td>
                  <td>{item.phone}</td>
                  <td>{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
