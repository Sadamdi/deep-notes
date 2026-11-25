import gameIcon from "@/assets/icons/game.svg";
import noteIcon from "@/assets/icons/note.svg";
import notebookIcon from "@/assets/icons/notebook.svg";
import profileIcon from "@/assets/icons/profile.svg";
import quoteIcon from "@/assets/icons/quote.svg";
import searchIcon from "@/assets/icons/search.svg";

export type NavItem = {
  to: string;
  label: string;
  icon: string;
};

export const DESKTOP_PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Beranda", icon: noteIcon },
  { to: "/jelajah", label: "Jelajah", icon: searchIcon },
  { to: "/workspace", label: "Workspace Saya", icon: notebookIcon },
  { to: "/game", label: "Game", icon: gameIcon },
  { to: "/studio", label: "Studio Penulis", icon: quoteIcon },
  { to: "/profil", label: "Profil", icon: profileIcon },
];

export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Beranda", icon: noteIcon },
  { to: "/jelajah", label: "Jelajah", icon: searchIcon },
  { to: "/workspace", label: "Ruang", icon: notebookIcon },
  { to: "/game", label: "Game", icon: gameIcon },
  { to: "/menu", label: "Menu", icon: profileIcon },
];

const MOBILE_MENU_CHILD_PATHS = new Set(["/menu", "/studio", "/profil", "/pengaturan", "/mengikuti"]);

export function isDesktopNavActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to === "/workspace") return pathname === "/workspace" || pathname.startsWith("/notebooks/");
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function isMobileNavActive(pathname: string, to: string): boolean {
  if (to === "/menu") return MOBILE_MENU_CHILD_PATHS.has(pathname);
  return isDesktopNavActive(pathname, to);
}
