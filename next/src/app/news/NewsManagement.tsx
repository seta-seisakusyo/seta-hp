"use client";

import { Box, TextField, Typography } from "@mui/material";
import dayjs from "dayjs";
import { Session } from "next-auth";
import { useCallback } from "react";
import DeleteConfirmDialog from "@/components/manage/DeleteConfirmDialog";
import ResourceActions from "@/components/manage/ResourceActions";
import FormDialog from "@/components/manage/FormDialog";
import ResourceTable, { type ResourceColumn } from "@/components/manage/ResourceTable";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { useResourceEditor } from "@/lib/hooks/useResourceEditor";
import { getManagementPermissions } from "@/lib/management-permissions";
import { getNewsText, type News } from "@/lib/types/news";

interface NewsManagementProps {
  session: Session;
}

interface NewsForm {
  title: string;
  contents: string;
  date: string;
  url: string;
}

const createNewsForm = (): NewsForm => ({
  title: "",
  contents: "",
  date: dayjs().format("YYYY-MM-DD"),
  url: "",
});

const editNewsForm = (news: News): NewsForm => ({
  title: news.title,
  contents: getNewsText(news.contents),
  date: dayjs(news.date).format("YYYY-MM-DD"),
  url: news.url || "",
});

const NewsManagement: React.FC<NewsManagementProps> = ({ session }) => {
  const { items: newsList, loading, error, retry, save, remove, pagination } = useCrudResource<News>({
    endpoint: "/api/news",
    listKey: "news",
    label: "お知らせ",
    pageSize: 10,
  });

  const { canEdit, canDelete } = getManagementPermissions(session?.user?.role);
  const { deleteDialogOpen, requestDelete, cancelDelete, confirmDelete, isDeleting } =
    useResourceDelete(remove);

  const saveNews = useCallback((form: NewsForm, id?: number) => save({
    title: form.title,
    contents: { text: form.contents },
    date: form.date,
    url: form.url || null,
  }, id), [save]);
  const editor = useResourceEditor<News, NewsForm>({
    createForm: createNewsForm,
    editForm: editNewsForm,
    save: saveNews,
  });

  const columns: ResourceColumn<News>[] = [
    {
      header: "日付",
      align: "center",
      render: (news) => dayjs(news.date).format("YYYY/MM/DD"),
    },
    {
      header: "タイトル",
      render: (news) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {news.title}
        </Typography>
      ),
    },
    {
      header: "内容",
      hideOnMobile: true,
      render: (news) => (
        <Box
          sx={{
            maxWidth: "200px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getNewsText(news.contents)}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <ResourceTable
        error={error}
        onRetry={retry}
        items={newsList}
        columns={columns}
        loading={loading}
        emptyMessage="お知らせはありません"
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          onPageChange: pagination.setPage,
        }}
        onCreate={canEdit ? editor.openCreate : undefined}
        actions={
          canEdit
            ? (news) => (
                <ResourceActions
                  primaryLabel="編集"
                  onPrimary={() => editor.openEdit(news)}
                  onDelete={canDelete ? () => requestDelete(news.id) : undefined}
                />
              )
            : undefined
        }
      />

      {/* 作成/編集ダイアログ */}
      <FormDialog
        submitting={editor.isSaving}
        open={editor.dialogOpen}
        title={editor.selectedResource ? "お知らせ編集" : "お知らせ新規作成"}
        submitLabel={editor.selectedResource ? "更新" : "作成"}
        submitDisabled={!editor.form.title || !editor.form.contents || !editor.form.date}
        onClose={editor.close}
        onSubmit={editor.submit}
      >
        <TextField
          label="日付"
          type="date"
          value={editor.form.date}
          onChange={(e) => editor.setField("date", e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="タイトル"
          value={editor.form.title}
          onChange={(e) => editor.setField("title", e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="内容"
          value={editor.form.contents}
          onChange={(e) => editor.setField("contents", e.target.value)}
          fullWidth
          multiline
          rows={4}
          required
        />
        <TextField
          label="リンクURL（任意）"
          value={editor.form.url}
          onChange={(e) => editor.setField("url", e.target.value)}
          fullWidth
        />
      </FormDialog>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        submitting={isDeleting}
        open={deleteDialogOpen}
        title="お知らせを削除"
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};

export default NewsManagement;
