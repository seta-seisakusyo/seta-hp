import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { requireEditorPage } from "@/lib/admin-auth";
import AdminPageShell from "@/components/manage/AdminPageShell";
import GalleryManagement from "./GalleryManagement";

export const metadata: Metadata = buildPageMetadata({
  title: "ギャラリー管理",
  path: "/gallery-manage",
  noindex: true,
});

export default async function GalleryManagePage() {
  const session = await requireEditorPage();

  return (
    <AdminPageShell title="ギャラリー管理">
      <GalleryManagement role={session.user.role} />
    </AdminPageShell>
  );
}
