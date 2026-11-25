import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { ExplorePage } from "./pages/ExplorePage";
import { HomePage } from "./pages/HomePage";
import { MobileMenuPage } from "./pages/MobileMenuPage";
import { NotebookPage } from "./pages/NotebookPage";
import { PlannedSectionPage } from "./pages/PlannedSectionPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "jelajah", element: <ExplorePage /> },
      { path: "workspace", element: <WorkspacesPage /> },
      { path: "notebooks/:notebookId", element: <NotebookPage /> },
      { path: "menu", element: <MobileMenuPage /> },
      {
        path: "game",
        element: (
          <PlannedSectionPage
            title="Game dan Kuis"
            description="Latihan soal otomatis dari sumber kelompok, duel, balapan kelompok, dan jelaskan balik ke Bubi."
            plannedScope="Antarmuka sesi kuis dan 7 mode permainan dari Desain Final Deep Notes akan disambungkan ke endpoint /api/v1/notebooks/:id/sessions dan /quizzes pada tahap berikutnya."
          />
        ),
      },
      {
        path: "studio",
        element: (
          <PlannedSectionPage
            title="Studio Penulis"
            description="Tulis dan terbitkan catatan belajar panjang yang terhubung ke workspace mata kuliah."
            plannedScope="Layar Studio Penulis, Editor Tulisan, dan Detail Artikel masih berupa rencana antarmuka dan belum memiliki modul terpisah di frontend."
          />
        ),
      },
      {
        path: "profil",
        element: (
          <PlannedSectionPage
            title="Profil Saya"
            description="Ringkasan poin belajar, streak harian, lencana, dan preferensi teman belajar."
            plannedScope="Layar profil dan statistik belajar akan dihubungkan ke endpoint GET /api/v1/auth/me, PATCH /api/v1/me/profile, dan GET /api/v1/me/stats setelah layar autentikasi selesai."
          />
        ),
      },
      {
        path: "pengaturan",
        element: (
          <PlannedSectionPage
            title="Pengaturan Akun"
            description="Kelola kata sandi, sesi perangkat aktif, dan ekspor data akun."
            plannedScope="Layar pengaturan akun akan dihubungkan ke endpoint /api/v1/me/password, /api/v1/me/logout-all, dan /api/v1/me/export."
          />
        ),
      },
      {
        path: "mengikuti",
        element: (
          <PlannedSectionPage
            title="Mengikuti"
            description="Kiriman belajar dari teman dan penulis yang kamu ikuti."
            plannedScope="Tampilan feed terfilter akan dihubungkan ke endpoint GET /api/v1/feed?scope=following setelah layar masuk selesai."
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
