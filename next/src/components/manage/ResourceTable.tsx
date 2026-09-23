"use client";

import {
  Alert,
  Box,
  Button,
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
  loading: boolean;
  emptyMessage: string;
  error?: string | null;
  onRetry?: () => void;
  /** 指定時のみ「新規作成」ボタンを表示 */
  onCreate?: () => void;
  /** 指定時のみ「操作」列を表示（セルの中身を返す） */
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
 */
export default function ResourceTable<T extends { id: number }>({
  items,
  columns,
  loading,
  emptyMessage,
  error,
  onRetry,
  onCreate,
  actions,
  pagination,
}: Props<T>) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" action={onRetry && <Button onClick={() => onRetry()}>再試行</Button>}>{error}</Alert>;
  }

  const visibleColumns = columns.filter((c) => !(isMobile && c.hideOnMobile));
  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <Box>
      {onCreate && (
        <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
            新規作成
          </Button>
        </Box>
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

      <TableContainer component={Paper}>
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              {visibleColumns.map((col) => (
                <TableCell key={col.header} align={col.align}>
                  {col.header}
                </TableCell>
              ))}
              {actions && <TableCell align="center">操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (actions ? 1 : 0)} align="center">
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
                  {actions && <TableCell align="center">{actions(item)}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
