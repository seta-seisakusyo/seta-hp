"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

interface Props {
  open: boolean;
  /** リソース表示名（例: "商品"）。見出し「〈label〉を削除」に使う */
  label: string;
  /** 削除対象の名前。確認文「「〈name〉」を削除しますか？」に使う（省略時は「この〈label〉を削除しますか？」） */
  itemName?: string | null;
  /** 削除に失敗した理由。ダイアログ内に表示する */
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
}

/** 削除確認ダイアログの見出しと確認文（画面ごとに文言を揃える） */
export function deleteDialogLabels(label: string, itemName?: string | null) {
  return {
    title: `${label}を削除`,
    message: itemName ? `「${itemName}」を削除しますか？` : `この${label}を削除しますか？`,
  };
}

/** 管理画面共通の削除確認ダイアログ */
export default function DeleteConfirmDialog({
  open,
  label,
  itemName,
  error,
  onClose,
  onConfirm,
  submitting = false,
}: Props) {
  const { title, message } = deleteDialogLabels(label, itemName);
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ overflowWrap: "anywhere" }}>{message}</Typography>
        {error && (
          <Alert severity="error" role="alert" sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>キャンセル</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={submitting}>
          {submitting ? "削除中..." : "削除"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
