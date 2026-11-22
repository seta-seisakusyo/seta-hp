"use client";

import { Box, Chip, TextField, Typography } from "@mui/material";
import { useCallback } from "react";
import type { z } from "zod";
import ImageUpload from "@/components/ImageUpload";
import DeleteConfirmDialog from "@/components/manage/DeleteConfirmDialog";
import FormDialog from "@/components/manage/FormDialog";
import {
  CategoryAndTagsFields,
  ResourcePublishedField,
} from "@/components/manage/ResourceFormFields";
import { PublishedChip, ResourceNameCell } from "@/components/manage/ResourceCells";
import ResourceTable, { type ResourceColumn } from "@/components/manage/ResourceTable";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { useResourceEditor } from "@/lib/hooks/useResourceEditor";
import { getManagementPermissions } from "@/lib/management-permissions";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { GALLERY_CATEGORIES, getGalleryCategoryLabel } from "@/lib/constants/categories";
import type { ManagedWork } from "@/lib/types/work";
import type { UserRole } from "@/lib/roles";
import type { WorkCreateSchema } from "@/lib/validation";
import WorkProductsField from "./WorkProductsField";

const LABEL = "作品";

interface GalleryManagementProps {
  role: UserRole;
}

/** 送信内容。項目名・型は API のスキーマ（WorkCreateSchema）に合わせる */
type WorkPayload = z.input<typeof WorkCreateSchema>;

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

const toWorkPayload = (form: WorkForm): WorkPayload => ({
  title: form.title,
  description: form.description,
  category: form.category,
  tags: form.tags,
  image: form.image || null,
  isPublished: form.isPublished,
  productIds: form.productIds,
});

const GalleryManagement: React.FC<GalleryManagementProps> = ({ role }) => {
  const { items: works, loading, refreshing, error, retry, save, remove, pagination } =
    useCrudResource<ManagedWork, WorkPayload>({
      endpoint: "/api/works",
      listUrl: "/api/works?includeUnpublished=true",
      listKey: "works",
      label: LABEL,
      pageSize: 50,
    });
  const isMobile = useIsMobile();

  const { canEdit, canDelete } = getManagementPermissions(role);
  const deletion = useResourceDelete<ManagedWork>(remove);

  const saveWork = useCallback(
    (form: WorkForm, id?: number) => save(toWorkPayload(form), id),
    [save]
  );
  const editor = useResourceEditor<ManagedWork, WorkForm>({
    createForm: createWorkForm,
    editForm: editWorkForm,
    save: saveWork,
  });

  const columns: ResourceColumn<ManagedWork>[] = [
    {
      header: "タイトル",
      render: (work) => (
        <ResourceNameCell
          name={work.title}
          caption={isMobile ? getGalleryCategoryLabel(work.category) : null}
        />
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
      render: (work) => <PublishedChip published={work.isPublished} />,
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
        submitDisabled={!editor.form.title || !editor.form.description}
      >
        <TextField label="タイトル" {...editor.text("title")} fullWidth required />
        <TextField label="説明" {...editor.text("description")} fullWidth multiline rows={3} required />
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
        {...deletion.dialogProps}
        label={LABEL}
        itemName={deletion.target?.title}
      />
    </Box>
  );
};

export default GalleryManagement;
