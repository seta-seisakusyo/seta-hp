import { beforeEach, expect, it, vi } from "vitest";
import { createHookRunner, settle } from "../helpers/hooks.mjs";

const state = vi.hoisted(() => ({ runner: null as ReturnType<typeof createHookRunner> | null, apiJson: vi.fn() }));
vi.mock("react", () => ({
  useState: (...args: Parameters<ReturnType<typeof createHookRunner>["react"]["useState"]>) => state.runner!.react.useState(...args),
  useRef: (...args: Parameters<ReturnType<typeof createHookRunner>["react"]["useRef"]>) => state.runner!.react.useRef(...args),
  useCallback: (...args: Parameters<ReturnType<typeof createHookRunner>["react"]["useCallback"]>) => state.runner!.react.useCallback(...args),
  useReducer: (...args: Parameters<ReturnType<typeof createHookRunner>["react"]["useReducer"]>) => state.runner!.react.useReducer(...args),
  useEffect: (...args: Parameters<ReturnType<typeof createHookRunner>["react"]["useEffect"]>) => state.runner!.react.useEffect(...args),
}));
vi.mock("@/lib/api-client", () => ({
  apiJson: state.apiJson,
  isAbortError: (error: Error) => error.name === "AbortError",
  isRateLimitedError: (error: { status?: number }) => error?.status === 429,
  RATE_LIMITED_MESSAGE: "アクセスが集中しています。少し待ってからお試しください。",
}));
import { useResourceEditor } from "@/lib/hooks/useResourceEditor";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
beforeEach(() => { state.runner = createHookRunner(); state.apiJson.mockReset(); });
type Result = { ok: true } | { ok: false; message: string };
it("保存の連打と保存中の閉じる・別リソースへの切り替えを防ぐ", async () => {
  const pending = deferred<Result>(); const save = vi.fn(() => pending.promise);
  const options = { createForm: () => ({ name: "" }), editForm: (item: { id: number; name: string }) => ({ name: item.name }), save };
  const render = () => state.runner!.render(() => useResourceEditor(options));
  let editor = render(); editor.openEdit({ id: 1, name: "A" }); editor = render();
  const first = editor.submit(); expect(await editor.submit()).toBe(false);
  editor.close(); editor.openEdit({ id: 2, name: "B" }); editor.setField("name", "changed"); editor = render();
  expect(editor.isSaving).toBe(true); expect(editor.form.name).toBe("A"); expect(save).toHaveBeenCalledTimes(1);
  pending.resolve({ ok: false, message: "名前は必須です" }); await first; editor = render();
  expect(editor.dialogOpen).toBe(true); expect(editor.isSaving).toBe(false);
  expect(editor.error).toBe("名前は必須です"); expect(editor.dialogProps.error).toBe("名前は必須です");
  editor.openEdit({ id: 2, name: "B" }); editor = render(); expect(editor.form.name).toBe("B");
});
it("削除中の連打・対象切替を防ぐ", async () => {
  const pending = deferred<Result>(); const remove = vi.fn(() => pending.promise);
  const render = () => state.runner!.render(() => useResourceDelete<{ id: number }>(remove));
  let deletion = render(); deletion.requestDelete({ id: 1 }); deletion = render();
  const first = deletion.confirmDelete(); await deletion.confirmDelete(); deletion.cancelDelete(); deletion.requestDelete({ id: 2 });
  expect(render().deleteDialogOpen).toBe(true); expect(render().target).toEqual({ id: 1 }); expect(remove).toHaveBeenCalledExactlyOnceWith(1);
  pending.resolve({ ok: true }); await first; expect(render().deleteDialogOpen).toBe(false);
});
it("一覧の失敗を公開し、再試行の成功でエラーを解除する", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.apiJson.mockRejectedValueOnce(new Error("503"));
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); let list = render();
  expect(list.loading).toBe(false); expect(list.error).toContain("取得に失敗");
  state.apiJson.mockResolvedValueOnce({ products: [{ id: 1 }], total: 1 }); await list.retry(); list = render();
  expect(list.loading).toBe(false); expect(list.refreshing).toBe(false);
  expect(list.error).toBeNull(); expect(list.items).toEqual([{ id: 1 }]); log.mockRestore();
});
it("保存成功後の一覧更新失敗を区別し、再送信を促さない", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.apiJson.mockResolvedValueOnce({ products: [], total: 0 });
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); const list = render();
  state.apiJson.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error("503"));
  expect(await list.save({ name: "saved" })).toEqual({ ok: true });
  expect(render().error).toContain("商品を保存しました"); log.mockRestore();
});
it("2ページ目から新規保存した後の再取得失敗にも保存成功を表示する", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.apiJson.mockResolvedValue({ products: [], total: 100 });
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); let list = render(); list.pagination.setPage(2); render(); await settle(); list = render();
  state.apiJson.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error("503"));
  expect(await list.save({ name: "saved" })).toEqual({ ok: true }); render(); await settle();
  expect(render().error).toContain("商品を保存しました"); log.mockRestore();
});
it("一覧の取得がレート制限（429）なら、理由の分かる案内を出す", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.apiJson.mockRejectedValueOnce(Object.assign(new Error("429"), { status: 429 }));
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); const list = render();
  expect(list.error).toBe("商品一覧を取得できませんでした。アクセスが集中しています。少し待ってからお試しください。");
  log.mockRestore();
});

it("初回の読み込みと再取得を区別し、再取得中も行を残す", async () => {
  const first = deferred<unknown>();
  state.apiJson.mockReturnValueOnce(first.promise);
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  let list = render();
  expect(list.loading).toBe(true); expect(list.refreshing).toBe(false);
  first.resolve({ products: [{ id: 1 }], total: 1 }); await settle(); list = render();
  expect(list.loading).toBe(false); expect(list.items).toEqual([{ id: 1 }]);
  const second = deferred<unknown>();
  state.apiJson.mockReturnValueOnce(second.promise);
  const refetch = list.retry(); list = render();
  expect(list.loading).toBe(false); expect(list.refreshing).toBe(true); expect(list.items).toEqual([{ id: 1 }]);
  second.resolve({ products: [{ id: 2 }], total: 1 }); await refetch; list = render();
  expect(list.refreshing).toBe(false); expect(list.items).toEqual([{ id: 2 }]);
});

it("保存・削除の失敗は理由を返し、alert も一覧の再取得もしない", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const alert = vi.fn(); vi.stubGlobal("alert", alert);
  state.apiJson.mockResolvedValueOnce({ products: [{ id: 1 }], total: 1 });
  const render = () => state.runner!.render(() => useCrudResource<{ id: number }, { name: string }>({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); const list = render();
  state.apiJson.mockClear();
  state.apiJson.mockRejectedValueOnce(new Error("名前は必須です"));
  expect(await list.save({ name: "" }, 1)).toEqual({ ok: false, message: "名前は必須です" });
  state.apiJson.mockRejectedValueOnce("unknown");
  expect(await list.remove(1)).toEqual({ ok: false, message: "商品の削除に失敗しました" });
  expect(state.apiJson).toHaveBeenCalledTimes(2);
  expect(render().error).toBeNull(); expect(render().items).toEqual([{ id: 1 }]);
  expect(alert).not.toHaveBeenCalled();
  vi.unstubAllGlobals(); log.mockRestore();
});

it("保存に失敗したらダイアログを開いたまま理由を出し、閉じる・開き直しで消す", async () => {
  const save = vi.fn().mockResolvedValueOnce({ ok: false, message: "通信に失敗しました" }).mockResolvedValueOnce({ ok: true });
  const options = { createForm: () => ({ name: "", price: "", published: true }), editForm: (item: { id: number; name: string }) => ({ name: item.name, price: "1", published: true }), save };
  const render = () => state.runner!.render(() => useResourceEditor(options));
  let editor = render(); editor.openEdit({ id: 3, name: "A" }); editor = render();
  editor.text("name").onChange({ target: { value: "B" } } as never); editor = render();
  expect(editor.text("name").value).toBe("B");
  expect(await editor.submit()).toBe(false); editor = render();
  expect(save).toHaveBeenLastCalledWith({ name: "B", price: "1", published: true }, 3);
  expect(editor.dialogOpen).toBe(true); expect(editor.form.name).toBe("B");
  expect(editor.dialogProps).toMatchObject({ open: true, editing: true, error: "通信に失敗しました" });
  expect(await editor.submit()).toBe(true); editor = render();
  expect(editor.dialogOpen).toBe(false); expect(editor.error).toBeNull();
  editor.openCreate(); editor = render(); expect(editor.dialogProps).toMatchObject({ editing: false, error: null });
});

it("削除に失敗したら確認ダイアログを開いたまま理由を出し、キャンセルで消す", async () => {
  const remove = vi.fn().mockResolvedValueOnce({ ok: false, message: "権限がありません" });
  const render = () => state.runner!.render(() => useResourceDelete<{ id: number; name: string }>(remove));
  let deletion = render(); deletion.requestDelete({ id: 5, name: "X" }); deletion = render();
  expect(await deletion.confirmDelete()).toBe(false); deletion = render();
  expect(deletion.dialogProps).toMatchObject({ open: true, error: "権限がありません" });
  expect(deletion.target).toEqual({ id: 5, name: "X" });
  deletion.cancelDelete(); deletion = render();
  expect(deletion.dialogProps).toMatchObject({ open: false, error: null });
});
