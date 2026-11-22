"use client";

import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import ResourceActions from "./ResourceActions";

export interface ResourceColumn<T> {
  header: string;
  align?: "left" | "right" | "center";
  /** モバイル幅では列を非表示にする */
  hideOnMobile?: boolean;
  render: (item: T) => React.ReactNode;
}

interface Props<T> {
  items: T[];
  columns: ResourceColumn<T>[];
  /** 初回の読み込み中（表示する行がまだない） */
  loading: boolean;
  /** 再取得中。行・新規作成ボタン・ページ送りは残し、進行表示だけ出す */
  refreshing?: boolean;
  emptyMessage: string;
  error?: string | null;
  onRetry?: () => void;
  /** 指定時のみ「新規作成」ボタンを表示 */
  onCreate?: () => void;
  /** 指定時のみ「操作」列に編集ボタンを表示 */
  onEdit?: (item: T) => void;
  /** 指定時のみ「操作」列に削除ボタンを表示（onEdit と併用） */
  onDelete?: (item: T) => void;
  /** 編集ボタンの読み上げ名（例: "商品を編集"） */
  editLabel?: string;
  /** 操作ボタンの見た目 */
  actionMode?: "button" | "icon";
  /** 「操作」列の中身を自前で描く場合（指定時は onEdit / onDelete より優先） */
  actions?: (item: T) => React.ReactNode;
  /** API側ページネーションの状態 */
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

/**
 * 管理画面共通の一覧テーブル。
 * 新規作成ボタン・ローディング・空状態・モバイル列切替・ページネーションを内包する。
 * 再取得中も表は消さず（スクロール位置を保つ）、上端に細い進行表示を出す。
 */
export default function ResourceTable<T extends { id: number }>({
  items,
  columns,
  loading,
  refreshing = false,
  emptyMessage,
  error,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
  editLabel = "編集",
  actionMode = "icon",
  actions,
  pagination,
}: Props<T>) {
  const isMobile = useIsMobile();

  const renderActions = actions ?? (onEdit
    ? (item: T) => (
        <ResourceActions
          mode={actionMode}
          primaryLabel={editLabel}
          onPrimary={() => onEdit(item)}
          onDelete={onDelete ? () => onDelete(item) : undefined}
        />
      )
    : undefined);

  const visibleColumns = columns.filter((c) => !(isMobile && c.hideOnMobile));
  const columnCount = visibleColumns.length + (renderActions ? 1 : 0);
  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  // 初回の取得に失敗して行がない場合は「〜がありません」と誤解させないよう表を出さない
  const showTable = loading || items.length > 0 || !error;

  return (
    <Box>
      {onCreate && (
        <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
            新規作成
          </Button>
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={onRetry && <Button color="inherit" size="small" onClick={() => onRetry()} disabled={refreshing}>再試行</Button>}
        >
          {error}
        </Alert>
      )}

      {pagination && totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Button
            variant="outlined"
            disabled={currentPage === 1}
            onClick={() => pagination.onPageChange(currentPage - 1)}
          >
            前へ
          </Button>
          <Typography sx={{ fontSize: { xs: "12px", md: "14px" }, alignSelf: "center" }}>
            {currentPage} / {totalPages}
          </Typography>
          <Button
            variant="outlined"
            disabled={currentPage === totalPages}
            onClick={() => pagination.onPageChange(currentPage + 1)}
          >
            次へ
          </Button>
        </Box>
      )}

      {showTable && (
        <TableContainer component={Paper} aria-busy={loading || refreshing}>
          {/* 高さを確保しておき、進行表示の出し入れで表がずれないようにする */}
          <Box sx={{ height: 4 }}>
            {refreshing && <LinearProgress aria-label="一覧を更新中" />}
          </Box>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                {visibleColumns.map((col) => (
                  <TableCell key={col.header} align={col.align}>
                    {col.header}
                  </TableCell>
                ))}
                {renderActions && <TableCell align="center">操作</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading || (refreshing && items.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={columnCount} align="center" sx={{ py: 4 }}>
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} align="center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} hover>
                    {visibleColumns.map((col) => (
                      <TableCell key={col.header} align={col.align}>
                        {col.render(item)}
                      </TableCell>
                    ))}
                    {renderActions && <TableCell align="center">{renderActions(item)}</TableCell>}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
