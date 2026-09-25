"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Chip, TextField } from "@mui/material";
import { apiJson, isAbortError } from "@/lib/api-client";
import { WORK_PRODUCTS_MAX } from "@/lib/work-constants";

interface ProductOption {
  id: number;
  name: string;
  isPublished: boolean;
}

interface Props {
  value: number[];
  onChange: (productIds: number[]) => void;
}

const optionLabel = (option: ProductOption) =>
  option.isPublished ? option.name : `${option.name}（非公開）`;

/**
 * 作品に使った商品の複数選択。
 * 非公開商品も選べるが、公開ページでは公開中の商品だけがリンク表示される。
 */
export default function WorkProductsField({ value, onChange }: Props) {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiJson<{ products: ProductOption[] }>("/api/products?includeUnpublished=true", {
      signal: controller.signal,
    })
      .then((data) => {
        setOptions(
          data.products.map(({ id, name, isPublished }) => ({ id, name, isPublished }))
        );
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        console.error("商品一覧の取得に失敗:", err);
        setError("商品一覧を取得できませんでした。使用商品の変更はできません。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () => value
      .map((id) => options.find((option) => option.id === id))
      .filter((option): option is ProductOption => Boolean(option)),
    [value, options]
  );

  if (error) return <Alert severity="warning">{error}</Alert>;

  return (
    <Autocomplete
      multiple
      loading={loading}
      options={options}
      value={selected}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(option, selectedOption) => option.id === selectedOption.id}
      getOptionDisabled={(option) =>
        value.length >= WORK_PRODUCTS_MAX && !value.includes(option.id)
      }
      onChange={(_, next) => onChange(next.map((option) => option.id))}
      renderTags={(tags, getTagProps) =>
        tags.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip key={key} label={optionLabel(option)} size="small" {...tagProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="この展示に使った商品"
          placeholder={selected.length === 0 ? "商品名で検索" : undefined}
          helperText={`商品詳細ページに「この商品を使った展示例」として表示されます（${WORK_PRODUCTS_MAX}件まで）`}
        />
      )}
      noOptionsText="該当する商品がありません"
      loadingText="読み込み中…"
    />
  );
}
