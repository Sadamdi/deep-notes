import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { AccountRecoveryPage } from "./pages/AccountRecoveryPage";
import { ExplorePage } from "./pages/ExplorePage";
import { HomePage } from "./pages/HomePage";
import { JoinInvitePage } from "./pages/JoinInvitePage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { MobileMenuPage } from "./pages/MobileMenuPage";
import { NotebookPage } from "./pages/NotebookPage";
import { PlannedSectionPage } from "./pages/PlannedSectionPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";

export const router = createBrowserRouter([
  { path: "/pembuka", element: <LandingPage /> },
  { path: "/masuk", element: <LoginPage /> },
  { path: "/daftar", element: <RegisterPage /> },
  { path: "/pemulihan", element: <AccountRecoveryPage /> },
  { path: "/join/:token", element: <JoinInvitePage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage scope="all" /> },
      { path: "mengikuti", element: <HomePage scope="following" /> },
      { path: "jelajah", element: <ExplorePage /> },
      { path: "workspace", element: <WorkspacesPage /> },
      { path: "notebooks/:notebookId", element: <NotebookPage /> },
      { path: "profil", element: <ProfilePage /> },
      { path: "pengaturan", element: <SettingsPage /> },
      { path: "menu", element: <MobileMenuPage /> },
      {
        path: "game",
        element: (
          <PlannedSectionPage
            title="Game dan Kuis"
            description="Buka salah satu workspace milikmu lalu pilih tab Sesi dan Kuis untuk berlatih langsung dari sumber kelompok."
            plannedScope="Mode kuis pilihan ganda, kuis mingguan kelompok, dan mode ujian berwaktu sudah aktif di dalam setiap Workspace (/notebooks/:id?tab=kuis). Arena 7 mini-game mandiri akan dilanjutkan pada tahap berikutnya."
          />
        ),
      },
      {
        path: "studio",
        element: (
          <PlannedSectionPage
            title="Studio Penulis"
            description="Tulis dan terbitkan catatan belajar panjang yang terhubung ke workspace mata kuliah."
            plannedScope="Untuk saat ini kamu bisa membagikan catatan singkat dan melampirkan workspace publik lewat tombol Tulis Unggahan di Beranda. Editor artikel panjang masih berupa rencana antarmuka."
          />
        ),
      },
      {
        path: "*",
        element: (
          <PlannedSectionPage
            title="Halaman tidak ditemukan"
            description="Alamat yang kamu buka tidak tersedia di Deep Notes."
            plannedScope="Gunakan navigasi di samping atau bawah layar untuk kembali ke Beranda atau Workspace Saya."
          />
        ),
      },
    ],
  },
]);
