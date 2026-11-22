import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { requireEditorPage } from "@/lib/admin-auth";
import AdminPageShell from "@/components/manage/AdminPageShell";
import ProductManagement from "./ProductManagement";

export const metadata: Metadata = buildPageMetadata({
  title: "商品管理",
  path: "/products-manage",
  noindex: true,
});

export default async function ProductsPage() {
  const session = await requireEditorPage();

  return (
    <AdminPageShell title="商品管理">
      <ProductManagement session={session} />
    </AdminPageShell>
  );
}
