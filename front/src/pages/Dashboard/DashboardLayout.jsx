import styles from "./DashboardLayout.module.css";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

export default function DashboardLayout({ menu, children }) {
  const items = menu ?? [];

  return (
    <div className={styles.page}>
      <Sidebar items={items} />
      <div className={styles.shell}>
        <Header />
        <main className={styles.main}>
          <div className={styles.contentCard}>{children}</div>
        </main>
      </div>
    </div>
  );
}
