"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

interface Props {
  open: boolean;
  /** リソース表示名（例: "商品"）。見出しとボタンの文言をここから作る */
  label: string;
  /** 既存リソースの編集なら true（見出し「〈label〉を編集」・ボタン「保存」） */
  editing: boolean;
  submitDisabled?: boolean;
  submitting?: boolean;
  /** 保存に失敗した理由。ダイアログ内に表示する */
  error?: string | null;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

/** 作成/編集ダイアログの見出しと送信ボタンの文言（3画面で同じ規則にする） */
export function formDialogLabels(label: string, editing: boolean) {
  return editing
    ? { title: `${label}を編集`, submitLabel: "保存" }
    : { title: `${label}を追加`, submitLabel: "追加" };
}

/** 管理画面共通の作成/編集フォームダイアログ（フィールドは children で渡す） */
export default function FormDialog({
  open,
  label,
  editing,
  submitDisabled = false,
  submitting = false,
  error,
  onClose,
  onSubmit,
  children,
}: Props) {
  const { title, submitLabel } = formDialogLabels(label, editing);
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box component="fieldset" disabled={submitting} sx={{ border: 0, p: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>{children}</Box>
      </DialogContent>
      {error && (
        <Alert severity="error" role="alert" sx={{ mx: 3, mb: 2, whiteSpace: "pre-wrap" }}>
          {error}
        </Alert>
      )}
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} disabled={submitting}>キャンセル</Button>
        <Button variant="contained" onClick={onSubmit} disabled={submitting || submitDisabled}>
          {submitting ? "保存中..." : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
