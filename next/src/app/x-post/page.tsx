import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import AdminPageShell from "@/components/manage/AdminPageShell";
import XPostForm from "./XPostForm";

export const metadata: Metadata = {
  title: "X 投稿",
  robots: { index: false, follow: false },
};

/**
 * X (旧Twitter) への手動投稿ページ。
 *
 * 商品・ギャラリーのレコードに紐づかない投稿（制作過程、コレクター向けの小ネタ等）も
 * 扱えるよう、管理画面から独立したページにしている。
 * 投稿は外部への発信で取り消しが効かないため、EDITOR ではなく ADMIN 限定。
 */
export default async function XPostPage() {
  await requireAdmin();

  return (
    <AdminPageShell title="X 投稿">
      <XPostForm />
    </AdminPageShell>
  );
}
