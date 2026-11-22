import type { Metadata } from "next";
import { requireEditorPage } from "@/lib/admin-auth";
import AdminPageShell from "@/components/manage/AdminPageShell";
import ProductManagement from "./ProductManagement";

export const metadata: Metadata = {
  title: "商品管理",
  robots: { index: false, follow: false },
};

export default async function ProductsPage() {
  const session = await requireEditorPage();

  return (
    <AdminPageShell title="商品管理">
      <ProductManagement session={session} />
    </AdminPageShell>
  );
}
