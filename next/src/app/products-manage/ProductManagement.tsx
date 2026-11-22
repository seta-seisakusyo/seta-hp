"use client";

import { Chip, TextField, Typography, Box } from "@mui/material";
import { useCallback } from "react";
import type { z } from "zod";
import MultiImageUpload from "@/components/MultiImageUpload";
import DeleteConfirmDialog from "@/components/manage/DeleteConfirmDialog";
import FormDialog from "@/components/manage/FormDialog";
import ProductSleeveFields from "./ProductSleeveFields";
import {
  emptySleeveForm,
  toSleeveForm,
  toSleevePayload,
  type SleeveForm,
  type SleevePayload,
} from "@/lib/product-sleeve-form";
import {
  CategoryAndTagsFields,
  ResourcePublishedField,
  SelectField,
  SwitchField,
} from "@/components/manage/ResourceFormFields";
import { PublishedChip, ResourceNameCell } from "@/components/manage/ResourceCells";
import ResourceTable, { type ResourceColumn } from "@/components/manage/ResourceTable";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { useResourceEditor } from "@/lib/hooks/useResourceEditor";
import { getManagementPermissions } from "@/lib/management-permissions";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  PRODUCT_CATEGORIES,
  STOCK_OPTIONS,
  getProductCategoryLabel,
  getStockMeta,
} from "@/lib/constants/categories";
import { parseProductImages, parseProductSleeve, type Product } from "@/lib/types/product";
import type { UserRole } from "@/lib/roles";
import type { ProductCreateSchema } from "@/lib/validation";
import { META_DESCRIPTION_MAX } from "@/lib/seo-keywords";

const LABEL = "商品";

interface ProductManagementProps {
  role: UserRole;
}

/**
 * 送信内容。項目名・型は API のスキーマ（ProductCreateSchema）に合わせる。
 * スリーブの数値欄だけは誤入力を API の検証で弾かせるため文字列も送る（SleevePayload）。
 */
type ProductPayload = Omit<z.input<typeof ProductCreateSchema>, "sleeve"> & {
  sleeve: SleevePayload | null;
};

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  tags: string;
  images: string[];
  stock: string;
  isPublished: boolean;
  isHeroImage: boolean;
  purchaseUrl: string;
  amazonUrl: string;
  seoKeywords: string;
  metaDescription: string;
  sleeve: SleeveForm;
}

const createProductForm = (): ProductForm => ({
  name: "",
  description: "",
  price: "",
  category: PRODUCT_CATEGORIES[0].value,
  tags: "",
  images: [],
  stock: STOCK_OPTIONS[0].value,
  isPublished: true,
  isHeroImage: false,
  purchaseUrl: "",
  amazonUrl: "",
  seoKeywords: "",
  metaDescription: "",
  sleeve: emptySleeveForm(),
});

const editProductForm = (product: Product): ProductForm => ({
  name: product.name,
  description: product.description,
  price: product.price.toString(),
  category: product.category,
  tags: product.tags,
  images: parseProductImages(product.images),
  stock: product.stock,
  isPublished: product.isPublished,
  isHeroImage: product.isHeroImage,
  purchaseUrl: product.purchaseUrl || "",
  amazonUrl: product.amazonUrl || "",
  seoKeywords: product.seoKeywords || "",
  metaDescription: product.metaDescription || "",
  sleeve: toSleeveForm(parseProductSleeve(product.sleeve)),
});

const toProductPayload = (form: ProductForm): ProductPayload => ({
  name: form.name,
  description: form.description,
  price: Number(form.price),
  category: form.category,
  tags: form.tags,
  images: form.images.length > 0 ? form.images : null,
  stock: form.stock,
  isPublished: form.isPublished,
  isHeroImage: form.isHeroImage,
  purchaseUrl: form.purchaseUrl || null,
  amazonUrl: form.amazonUrl || null,
  seoKeywords: form.seoKeywords || null,
  metaDescription: form.metaDescription || null,
  sleeve: toSleevePayload(form.sleeve),
});

const ProductManagement: React.FC<ProductManagementProps> = ({ role }) => {
  const { items: products, loading, refreshing, error, retry, save, remove, pagination } =
    useCrudResource<Product, ProductPayload>({
      endpoint: "/api/products",
      listUrl: "/api/products?includeUnpublished=true",
      listKey: "products",
      label: LABEL,
      pageSize: 50,
    });
  const isMobile = useIsMobile();

  const { canEdit, canDelete } = getManagementPermissions(role);
  const deletion = useResourceDelete<Product>(remove);

  const saveProduct = useCallback(
    (form: ProductForm, id?: number) => save(toProductPayload(form), id),
    [save]
  );
  const editor = useResourceEditor<Product, ProductForm>({
    createForm: createProductForm,
    editForm: editProductForm,
    save: saveProduct,
  });

  const columns: ResourceColumn<Product>[] = [
    {
      header: "商品名",
      render: (product) => (
        <ResourceNameCell
          name={product.name}
          caption={isMobile ? getProductCategoryLabel(product.category) : null}
        />
      ),
    },
    {
      header: "カテゴリ",
      hideOnMobile: true,
      render: (product) => (
        <Chip
          label={getProductCategoryLabel(product.category)}
          size="small"
          color={product.category === "3d-print" ? "success" : "warning"}
        />
      ),
    },
    {
      header: "価格",
      align: "right",
      render: (product) => `¥${product.price.toLocaleString()}`,
    },
    {
      header: "在庫",
      render: (product) => (
        <Chip
          label={product.stock}
          size="small"
          color={getStockMeta(product.stock)?.muiColor ?? "info"}
        />
      ),
    },
    {
      header: "公開",
      render: (product) => <PublishedChip published={product.isPublished} />,
    },
  ];

  return (
    <Box>
      <ResourceTable
        error={error}
        onRetry={retry}
        items={products}
        columns={columns}
        loading={loading}
        refreshing={refreshing}
        emptyMessage={`${LABEL}がありません`}
        pagination={pagination}
        onCreate={canEdit ? editor.openCreate : undefined}
        onEdit={canEdit ? editor.openEdit : undefined}
        onDelete={canDelete ? deletion.requestDelete : undefined}
        editLabel={`${LABEL}を編集`}
      />

      {/* 作成/編集ダイアログ */}
      <FormDialog
        {...editor.dialogProps}
        label={LABEL}
        submitDisabled={!editor.form.name || !editor.form.description || !editor.form.price}
      >
        <TextField label="商品名" {...editor.text("name")} fullWidth required />
        <TextField label="説明" {...editor.text("description")} fullWidth multiline rows={3} required />
        <TextField
          label="価格（税込）"
          type="number"
          {...editor.text("price")}
          fullWidth
          required
          InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography> }}
        />
        <CategoryAndTagsFields
          categories={PRODUCT_CATEGORIES}
          category={editor.form.category}
          tags={editor.form.tags}
          tagPlaceholder="例: PLA, 実用品, セット"
          onCategoryChange={(category) => editor.setField("category", category)}
          onTagsChange={(tags) => editor.setField("tags", tags)}
        />
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            商品画像（最初の画像がメイン画像になります）
          </Typography>
          <MultiImageUpload
            value={editor.form.images}
            onChange={(images) => editor.setField("images", images)}
          />
        </Box>
        <SelectField
          label="在庫状況"
          value={editor.form.stock}
          options={STOCK_OPTIONS}
          onChange={(stock) => editor.setField("stock", stock)}
        />
        <TextField
          label="購入URL（BASE等の外部ショップURL）"
          {...editor.text("purchaseUrl")}
          fullWidth
          placeholder="https://example.thebase.in/items/..."
        />
        <TextField
          label="Amazon購入URL（任意）"
          {...editor.text("amazonUrl")}
          fullWidth
          placeholder="https://www.amazon.co.jp/dp/..."
          helperText="入力すると商品ページに「Amazon で購入する」ボタンが表示されます"
        />
        <TextField
          label="SEOキーワード（任意・カンマ区切り）"
          {...editor.text("seoKeywords")}
          fullWidth
          placeholder="カードディスプレイ, トレカ 飾る, MLB カード"
        />
        <TextField
          label="検索結果の説明文（任意）"
          {...editor.text("metaDescription")}
          fullWidth
          multiline
          minRows={2}
          inputProps={{ maxLength: META_DESCRIPTION_MAX }}
          helperText={`${editor.form.metaDescription.length}/${META_DESCRIPTION_MAX}文字。未入力なら商品説明を使います（120文字前後が目安）`}
        />
        <ProductSleeveFields
          value={editor.form.sleeve}
          onChange={(sleeve) => editor.setField("sleeve", sleeve)}
        />
        {editor.selectedResource?.designerUrl && (
          <Typography variant="body2">
            設計ツールで作成した商品です:{" "}
            <a href={editor.selectedResource.designerUrl} target="_blank" rel="noopener noreferrer">
              設計を開く
            </a>
          </Typography>
        )}
        <ResourcePublishedField
          checked={editor.form.isPublished}
          onChange={(isPublished) => editor.setField("isPublished", isPublished)}
        />
        <SwitchField
          label="TOPヒーロー画像に使用"
          checked={editor.form.isHeroImage}
          onChange={(isHeroImage) => editor.setField("isHeroImage", isHeroImage)}
        />
      </FormDialog>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        {...deletion.dialogProps}
        label={LABEL}
        itemName={deletion.target?.name}
      />
    </Box>
  );
};

export default ProductManagement;
