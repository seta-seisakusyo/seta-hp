"use client";

import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import { useId } from "react";

interface SelectOption {
  readonly value: string;
  readonly label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
}

/** 管理フォームの選択欄（カテゴリ・在庫状況など） */
export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const labelId = useId();
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        value={value}
        label={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** 管理フォームのオン/オフ欄（公開する・ヒーロー画像に使用など） */
export function SwitchField({ label, checked, onChange }: SwitchFieldProps) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      }
      label={label}
    />
  );
}

interface CategoryAndTagsFieldsProps {
  categories: readonly SelectOption[];
  category: string;
  tags: string;
  tagPlaceholder: string;
  onCategoryChange: (value: string) => void;
  onTagsChange: (value: string) => void;
}

export function CategoryAndTagsFields({
  categories,
  category,
  tags,
  tagPlaceholder,
  onCategoryChange,
  onTagsChange,
}: CategoryAndTagsFieldsProps) {
  return (
    <>
      <SelectField
        label="カテゴリ"
        value={category}
        options={categories}
        onChange={onCategoryChange}
      />
      <TextField
        label="タグ（カンマ区切り）"
        value={tags}
        onChange={(event) => onTagsChange(event.target.value)}
        fullWidth
        placeholder={tagPlaceholder}
      />
    </>
  );
}

interface ResourcePublishedFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ResourcePublishedField({
  checked,
  onChange,
}: ResourcePublishedFieldProps) {
  return <SwitchField label="公開する" checked={checked} onChange={onChange} />;
}
