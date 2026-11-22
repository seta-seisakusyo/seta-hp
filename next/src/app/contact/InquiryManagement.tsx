"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { Session } from "next-auth";
import { useState } from "react";
import DeleteConfirmDialog from "@/components/manage/DeleteConfirmDialog";
import ResourceActions from "@/components/manage/ResourceActions";
import ResourceTable, { type ResourceColumn } from "@/components/manage/ResourceTable";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { getManagementPermissions } from "@/lib/management-permissions";
import type { Inquiry } from "@/lib/types/inquiry";

interface InquiryManagementProps {
  session: Session;
}

const InquiryManagement: React.FC<InquiryManagementProps> = ({ session }) => {
  const { items: inquiries, loading, refreshing, error, retry, remove, pagination } = useCrudResource<Inquiry>({
    endpoint: "/api/email",
    listKey: "inquiries",
    label: "問い合わせ",
    pageSize: 10,
  });

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  const { canDelete } = getManagementPermissions(session?.user?.role);
  const deletion = useResourceDelete<Inquiry>(remove);

  const columns: ResourceColumn<Inquiry>[] = [
    {
      header: "日付",
      align: "center",
      render: (inquiry) => dayjs(inquiry.createdAt).format("YYYY/MM/DD"),
    },
    {
      header: "時間",
      align: "center",
      hideOnMobile: true,
      render: (inquiry) => dayjs(inquiry.createdAt).format("HH:mm"),
    },
    {
      header: "氏名",
      align: "center",
      render: (inquiry) => (
        <Box sx={{ maxWidth: "140px", overflowX: "auto", whiteSpace: "nowrap" }}>
          {inquiry.name}
        </Box>
      ),
    },
    {
      header: "メールアドレス",
      align: "center",
      hideOnMobile: true,
      render: (inquiry) => (
        <Box sx={{ maxWidth: "220px", overflowX: "auto", whiteSpace: "nowrap" }}>
          {inquiry.email}
        </Box>
      ),
    },
    {
      header: "電話番号",
      align: "center",
      hideOnMobile: true,
      render: (inquiry) => inquiry.phone,
    },
  ];

  return (
    <Box>
      <ResourceTable
        error={error}
        onRetry={retry}
        items={inquiries}
        columns={columns}
        loading={loading}
        refreshing={refreshing}
        emptyMessage="問い合わせはありません"
        pagination={pagination}
        actions={(inquiry) => (
          <ResourceActions
            primaryLabel="詳細"
            onPrimary={() => {
              setSelectedInquiry(inquiry);
              setDetailDialogOpen(true);
            }}
            onDelete={canDelete ? () => deletion.requestDelete(inquiry) : undefined}
          />
        )}
      />

      {/* 詳細ダイアログ */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>問い合わせ詳細</DialogTitle>
        <DialogContent>
          {selectedInquiry && (
            <>
              <Typography>
                <strong>日付:</strong> {dayjs(selectedInquiry.createdAt).format("YYYY/MM/DD HH:mm")}
              </Typography>
              <Typography>
                <strong>氏名:</strong> {selectedInquiry.name}
              </Typography>
              <Typography>
                <strong>メールアドレス:</strong> {selectedInquiry.email}
              </Typography>
              <Typography>
                <strong>電話番号:</strong> {selectedInquiry.phone}
              </Typography>
              <Typography sx={{ mt: 2 }}>
                <strong>お問い合わせ内容:</strong>
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", maxHeight: "300px", overflowY: "auto" }}>
                {selectedInquiry.inquiry}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        {...deletion.dialogProps}
        label="問い合わせ"
        itemName={deletion.target ? `${deletion.target.name}さんからの問い合わせ` : null}
      />
    </Box>
  );
};

export default InquiryManagement;
