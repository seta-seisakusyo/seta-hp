"use client";

import { Box, Chip, TextField, Typography } from "@mui/material";
import { Session } from "next-auth";
import { useCallback } from "react";
import ImageUpload from "@/components/ImageUpload";
import DeleteConfirmDialog from "@/components/manage/DeleteConfirmDialog";
import ResourceActions from "@/components/manage/ResourceActions";
import FormDialog from "@/components/manage/FormDialog";
import {
  CategoryAndTagsFields,
  ResourcePublishedField,
} from "@/components/manage/ResourceFormFields";
import ResourceTable, { type ResourceColumn } from "@/components/manage/ResourceTable";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { useResourceEditor } from "@/lib/hooks/useResourceEditor";
import { getManagementPermissions } from "@/lib/management-permissions";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { GALLERY_CATEGORIES, getGalleryCategoryLabel } from "@/lib/constants/categories";
import type { ManagedWork } from "@/lib/types/work";
import WorkProductsField from "./WorkProductsField";

interface GalleryManagementProps {
  session: Session;
}

interface WorkForm {
  title: string;
  description: string;
  category: string;
  tags: string;
  image: string;
  isPublished: boolean;
  productIds: number[];
}

const createWorkForm = (): WorkForm => ({
  title: "",
  description: "",
  category: GALLERY_CATEGORIES[0].value,
  tags: "",
  image: "",
  isPublished: true,
  productIds: [],
});

const editWorkForm = (work: ManagedWork): WorkForm => ({
  title: work.title,
  description: work.description,
  category: work.category,
  tags: work.tags,
  image: work.image || "",
  isPublished: work.isPublished,
  productIds: work.productIds ?? [],
});

const GalleryManagement: React.FC<GalleryManagementProps> = ({ session }) => {
  const { items: works, loading, error, retry, save, remove, pagination } = useCrudResource<ManagedWork>({
    endpoint: "/api/works",
    listUrl: "/api/works?includeUnpublished=true",
    listKey: "works",
    label: "作品",
    pageSize: 50,
  });
  const isMobile = useIsMobile();

  const { canEdit, canDelete } = getManagementPermissions(session?.user?.role);
  const { deleteDialogOpen, requestDelete, cancelDelete, confirmDelete, isDeleting } =
    useResourceDelete(remove);

  const saveWork = useCallback((form: WorkForm, id?: number) => save({
    title: form.title,
    description: form.description,
    category: form.category,
    tags: form.tags,
    image: form.image || null,
    isPublished: form.isPublished,
    productIds: form.productIds,
  }, id), [save]);
  const editor = useResourceEditor<ManagedWork, WorkForm>({
    createForm: createWorkForm,
    editForm: editWorkForm,
    save: saveWork,
  });

  const columns: ResourceColumn<ManagedWork>[] = [
    {
      header: "タイトル",
      render: (work) => (
        <>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {work.title}
          </Typography>
          {isMobile && (
            <Typography variant="caption" color="text.secondary">
              {getGalleryCategoryLabel(work.category)}
            </Typography>
          )}
        </>
      ),
    },
    {
      header: "カテゴリ",
      hideOnMobile: true,
      render: (work) => (
        <Chip label={getGalleryCategoryLabel(work.category)} size="small" color="info" />
      ),
    },
    {
      header: "使用商品",
      hideOnMobile: true,
      render: (work) => {
        const count = work.productIds?.length ?? 0;
        return count > 0 ? `${count}件` : "—";
      },
    },
    {
      header: "公開",
      render: (work) => (
        <Chip
          label={work.isPublished ? "公開" : "非公開"}
          size="small"
          color={work.isPublished ? "primary" : "default"}
        />
      ),
    },
  ];

  return (
    <Box>
      <ResourceTable
        error={error}
        onRetry={retry}
        items={works}
        columns={columns}
        loading={loading}
        emptyMessage="作品がありません"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: pagination.setPage,
        }}
        onCreate={canEdit ? editor.openCreate : undefined}
        actions={
          canEdit
            ? (work) => (
                <ResourceActions
                  mode="icon"
                  primaryLabel="作品を編集"
                  onPrimary={() => editor.openEdit(work)}
                  onDelete={canDelete ? () => requestDelete(work.id) : undefined}
                />
              )
            : undefined
        }
      />

      {/* 作成/編集ダイアログ */}
      <FormDialog
        submitting={editor.isSaving}
        open={editor.dialogOpen}
        title={editor.selectedResource ? "作品を編集" : "作品を追加"}
        submitLabel={editor.selectedResource ? "更新" : "追加"}
        submitDisabled={!editor.form.title || !editor.form.description}
        onClose={editor.close}
        onSubmit={editor.submit}
      >
        <TextField
          label="タイトル"
          value={editor.form.title}
          onChange={(e) => editor.setField("title", e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="説明"
          value={editor.form.description}
          onChange={(e) => editor.setField("description", e.target.value)}
          fullWidth
          multiline
          rows={3}
          required
        />
        <CategoryAndTagsFields
          categories={GALLERY_CATEGORIES}
          category={editor.form.category}
          tags={editor.form.tags}
          tagPlaceholder="例: カード, ポケモン, アクリル"
          onCategoryChange={(category) => editor.setField("category", category)}
          onTagsChange={(tags) => editor.setField("tags", tags)}
        />
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            画像
          </Typography>
          <ImageUpload
            value={editor.form.image}
            onChange={(image) => editor.setField("image", image)}
          />
        </Box>
        <WorkProductsField
          value={editor.form.productIds}
          onChange={(productIds) => editor.setField("productIds", productIds)}
        />
        <ResourcePublishedField
          checked={editor.form.isPublished}
          onChange={(isPublished) => editor.setField("isPublished", isPublished)}
        />
      </FormDialog>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        submitting={isDeleting}
        open={deleteDialogOpen}
        title="作品を削除"
        message="この作品を削除してもよろしいですか？"
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};

export default GalleryManagement;
