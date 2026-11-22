import { Chip, Typography } from "@mui/material";

/** 管理テーブルの公開状態 */
export function PublishedChip({ published }: { published: boolean }) {
  return (
    <Chip
      label={published ? "公開" : "非公開"}
      size="small"
      color={published ? "primary" : "default"}
    />
  );
}

interface ResourceNameCellProps {
  name: string;
  /** 補足（スマホでカテゴリ列を隠すときにカテゴリ名を添える等）。未指定なら出さない */
  caption?: string | null;
}

/** 管理テーブルの名前セル。補足があれば下に小さく添える */
export function ResourceNameCell({ name, caption }: ResourceNameCellProps) {
  return (
    <>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {name}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </>
  );
}
