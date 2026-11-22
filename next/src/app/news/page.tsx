import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { requireEditorPage } from "@/lib/admin-auth";
import AdminPageShell from "@/components/manage/AdminPageShell";
import NewsManagement from "./NewsManagement";

export const metadata: Metadata = buildPageMetadata({
  title: "お知らせ管理",
  path: "/news",
  noindex: true,
});

export default async function NewsPage() {
  const session = await requireEditorPage();

  return (
    <AdminPageShell title="お知らせ管理">
      <NewsManagement role={session.user.role} />
    </AdminPageShell>
  );
}
