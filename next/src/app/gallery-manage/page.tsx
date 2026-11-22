import type { Metadata } from "next";
import { requireEditorPage } from "@/lib/admin-auth";
import AdminPageShell from "@/components/manage/AdminPageShell";
import GalleryManagement from "./GalleryManagement";

export const metadata: Metadata = {
  title: "ギャラリー管理",
  robots: { index: false, follow: false },
};

export default async function GalleryManagePage() {
  const session = await requireEditorPage();

  return (
    <AdminPageShell title="ギャラリー管理">
      <GalleryManagement session={session} />
    </AdminPageShell>
  );
}
