"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

interface Props {
  open: boolean;
  title: string;
  submitLabel: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

/** 管理画面共通の作成/編集フォームダイアログ（フィールドは children で渡す） */
export default function FormDialog({
  open,
  title,
  submitLabel,
  submitDisabled = false,
  submitting = false,
  onClose,
  onSubmit,
  children,
}: Props) {
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box component="fieldset" disabled={submitting} sx={{ border: 0, p: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>{children}</Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} disabled={submitting}>キャンセル</Button>
        <Button variant="contained" onClick={onSubmit} disabled={submitting || submitDisabled}>
          {submitting ? "保存中..." : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
