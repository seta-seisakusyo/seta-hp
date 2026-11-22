"use client";

import { useCallback, useReducer, useState, type ChangeEvent } from "react";
import type { ActionResult } from "./useCrudResource";
import { usePendingAction } from "./usePendingAction";

export interface ResourceEditorState<T, FormState> {
  dialogOpen: boolean;
  selectedResource: T | null;
  form: FormState;
}

type ResourceEditorAction<T, FormState> =
  | { type: "create"; form: FormState }
  | { type: "edit"; resource: T; form: FormState }
  | { type: "set-field"; field: keyof FormState; value: FormState[keyof FormState] }
  | { type: "close"; form: FormState };

/** フォームのうち文字列の項目（テキスト欄で編集するもの） */
export type TextFieldKey<FormState> = {
  [K in keyof FormState]: FormState[K] extends string ? K : never;
}[keyof FormState];

export function resourceEditorReducer<T, FormState>(
  state: ResourceEditorState<T, FormState>,
  action: ResourceEditorAction<T, FormState>
): ResourceEditorState<T, FormState> {
  switch (action.type) {
    case "create":
      return { dialogOpen: true, selectedResource: null, form: action.form };
    case "edit":
      return { dialogOpen: true, selectedResource: action.resource, form: action.form };
    case "set-field":
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case "close":
      return { dialogOpen: false, selectedResource: null, form: action.form };
  }
}

interface UseResourceEditorOptions<T extends { id: number }, FormState> {
  createForm: () => FormState;
  editForm: (resource: T) => FormState;
  save: (form: FormState, id?: number) => Promise<ActionResult>;
}

/**
 * 管理リソースの作成・編集ダイアログと保存成功後のリセットを一元管理する。
 * 保存に失敗したらダイアログを開いたまま `error` に理由を入れる（FormDialog が表示する）。
 */
export function useResourceEditor<T extends { id: number }, FormState>({
  createForm,
  editForm,
  save,
}: UseResourceEditorOptions<T, FormState>) {
  const { isPending, isRunning, run } = usePendingAction();
  const [error, setError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(resourceEditorReducer<T, FormState>, {
    dialogOpen: false,
    selectedResource: null,
    form: createForm(),
  });

  const openCreate = useCallback(() => {
    if (isRunning()) return;
    setError(null);
    dispatch({ type: "create", form: createForm() });
  }, [createForm, isRunning]);

  const openEdit = useCallback((resource: T) => {
    if (isRunning()) return;
    setError(null);
    dispatch({ type: "edit", resource, form: editForm(resource) });
  }, [editForm, isRunning]);

  const close = useCallback(() => {
    if (isRunning()) return;
    setError(null);
    dispatch({ type: "close", form: createForm() });
  }, [createForm, isRunning]);

  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (isRunning()) return;
    dispatch({ type: "set-field", field, value });
  }, [isRunning]);

  /** 文字列項目を TextField へ渡す `{ value, onChange }`（`{...editor.text("name")}`）。 */
  const text = <K extends TextFieldKey<FormState>>(field: K) => ({
    value: state.form[field] as string,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(field, event.target.value as FormState[K]),
  });

  const submit = useCallback(() => run(async () => {
    setError(null);
    const result = await save(state.form, state.selectedResource?.id);
    if (result.ok) {
      dispatch({ type: "close", form: createForm() });
    } else {
      setError(result.message);
    }
    return result.ok;
  }), [createForm, run, save, state.form, state.selectedResource]);

  return {
    ...state,
    isSaving: isPending,
    error,
    openCreate,
    openEdit,
    close,
    setField,
    text,
    submit,
    /** FormDialog へそのまま渡す状態と操作 */
    dialogProps: {
      open: state.dialogOpen,
      editing: state.selectedResource !== null,
      submitting: isPending,
      error,
      onClose: close,
      onSubmit: submit,
    },
  };
}
