import styles from "./DashboardLayout.module.css";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import NotificationBannerBar from "../../shared/ui/NotificationBannerBar/NotificationBannerBar";

export default function DashboardLayout({ menu, children, showBanners = true }) {
  const items = menu ?? [];

  return (
    <div className={styles.page}>
      <Sidebar items={items} />
      <div className={styles.shell}>
        <Header />
        {showBanners ? <NotificationBannerBar /> : null}
        <main className={styles.main}>
          <div className={styles.contentCard}>{children}</div>
        </main>
      </div>
    </div>
  );
}
