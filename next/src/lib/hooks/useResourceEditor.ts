"use client";

import { useCallback, useReducer } from "react";
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
  save: (form: FormState, id?: number) => Promise<boolean>;
}

/** 管理リソースの作成・編集ダイアログと保存成功後のリセットを一元管理する。 */
export function useResourceEditor<T extends { id: number }, FormState>({
  createForm,
  editForm,
  save,
}: UseResourceEditorOptions<T, FormState>) {
  const { isPending, isRunning, run } = usePendingAction();
  const [state, dispatch] = useReducer(resourceEditorReducer<T, FormState>, {
    dialogOpen: false,
    selectedResource: null,
    form: createForm(),
  });

  const openCreate = useCallback(() => {
    if (isRunning()) return;
    dispatch({ type: "create", form: createForm() });
  }, [createForm, isRunning]);

  const openEdit = useCallback((resource: T) => {
    if (isRunning()) return;
    dispatch({ type: "edit", resource, form: editForm(resource) });
  }, [editForm, isRunning]);

  const close = useCallback(() => {
    if (isRunning()) return;
    dispatch({ type: "close", form: createForm() });
  }, [createForm, isRunning]);

  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (isRunning()) return;
    dispatch({ type: "set-field", field, value });
  }, [isRunning]);

  const submit = useCallback(() => run(async () => {
    const ok = await save(state.form, state.selectedResource?.id);
    if (ok) {
      dispatch({ type: "close", form: createForm() });
    }
    return ok;
  }), [createForm, run, save, state.form, state.selectedResource]);

  return { ...state, isSaving: isPending, openCreate, openEdit, close, setField, submit };
}
