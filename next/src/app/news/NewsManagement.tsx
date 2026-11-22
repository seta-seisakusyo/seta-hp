"use client";

import { Box, TextField, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useCallback } from "react";
import type { z } from "zod";
import DeleteConfirmDialog from "@/components/manage/DeleteConfirmDialog";
import FormDialog from "@/components/manage/FormDialog";
import ResourceTable, { type ResourceColumn } from "@/components/manage/ResourceTable";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { useResourceEditor } from "@/lib/hooks/useResourceEditor";
import { getManagementPermissions } from "@/lib/management-permissions";
import { getNewsText, type News } from "@/lib/types/news";
import type { UserRole } from "@/lib/roles";
import type { NewsCreateSchema } from "@/lib/validation";

const LABEL = "お知らせ";

interface NewsManagementProps {
  role: UserRole;
}

/** 送信内容。項目名・型は API のスキーマ（NewsCreateSchema）に合わせる */
type NewsPayload = z.input<typeof NewsCreateSchema>;

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

const toNewsPayload = (form: NewsForm): NewsPayload => ({
  title: form.title,
  contents: { text: form.contents },
  date: form.date,
  url: form.url || null,
});

const NewsManagement: React.FC<NewsManagementProps> = ({ role }) => {
  const { items: newsList, loading, refreshing, error, retry, save, remove, pagination } =
    useCrudResource<News, NewsPayload>({
      endpoint: "/api/news",
      listKey: "news",
      label: LABEL,
      pageSize: 10,
    });

  const { canEdit, canDelete } = getManagementPermissions(role);
  const deletion = useResourceDelete<News>(remove);

  const saveNews = useCallback(
    (form: NewsForm, id?: number) => save(toNewsPayload(form), id),
    [save]
  );
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
        refreshing={refreshing}
        emptyMessage={`${LABEL}はありません`}
        pagination={pagination}
        onCreate={canEdit ? editor.openCreate : undefined}
        onEdit={canEdit ? editor.openEdit : undefined}
        onDelete={canDelete ? deletion.requestDelete : undefined}
        editLabel="編集"
        actionMode="button"
      />

      {/* 作成/編集ダイアログ */}
      <FormDialog
        {...editor.dialogProps}
        label={LABEL}
        submitDisabled={!editor.form.title || !editor.form.contents || !editor.form.date}
      >
        <TextField
          label="日付"
          type="date"
          {...editor.text("date")}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField label="タイトル" {...editor.text("title")} fullWidth required />
        <TextField label="内容" {...editor.text("contents")} fullWidth multiline rows={4} required />
        <TextField label="リンクURL（任意）" {...editor.text("url")} fullWidth />
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

export default NewsManagement;
