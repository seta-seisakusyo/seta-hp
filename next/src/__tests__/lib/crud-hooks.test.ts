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
vi.mock("@/lib/api-client", () => ({ apiJson: state.apiJson, isAbortError: (error: Error) => error.name === "AbortError" }));
import { useResourceEditor } from "@/lib/hooks/useResourceEditor";
import { useResourceDelete } from "@/lib/hooks/useResourceDelete";
import { useCrudResource } from "@/lib/hooks/useCrudResource";
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
beforeEach(() => { state.runner = createHookRunner(); state.apiJson.mockReset(); });
it("保存の連打と保存中の閉じる・別リソースへの切り替えを防ぐ", async () => {
  const pending = deferred<boolean>(); const save = vi.fn(() => pending.promise);
  const options = { createForm: () => ({ name: "" }), editForm: (item: { id: number; name: string }) => ({ name: item.name }), save };
  const render = () => state.runner!.render(() => useResourceEditor(options));
  let editor = render(); editor.openEdit({ id: 1, name: "A" }); editor = render();
  const first = editor.submit(); expect(await editor.submit()).toBe(false);
  editor.close(); editor.openEdit({ id: 2, name: "B" }); editor.setField("name", "changed"); editor = render();
  expect(editor.isSaving).toBe(true); expect(editor.form.name).toBe("A"); expect(save).toHaveBeenCalledTimes(1);
  pending.resolve(false); await first; editor = render();
  expect(editor.dialogOpen).toBe(true); expect(editor.isSaving).toBe(false);
  editor.openEdit({ id: 2, name: "B" }); editor = render(); expect(editor.form.name).toBe("B");
});
it("削除中の連打・対象切替を防ぐ", async () => {
  const pending = deferred<boolean>(); const remove = vi.fn(() => pending.promise);
  const render = () => state.runner!.render(() => useResourceDelete(remove));
  let deletion = render(); deletion.requestDelete(1); deletion = render();
  const first = deletion.confirmDelete(); await deletion.confirmDelete(); deletion.cancelDelete(); deletion.requestDelete(2);
  expect(render().deleteDialogOpen).toBe(true); expect(remove).toHaveBeenCalledExactlyOnceWith(1);
  pending.resolve(true); await first; expect(render().deleteDialogOpen).toBe(false);
});
it("一覧の失敗を公開し、再試行の成功でエラーを解除する", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.apiJson.mockRejectedValueOnce(new Error("503"));
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); let list = render();
  expect(list.loading).toBe(false); expect(list.error).toContain("取得に失敗");
  state.apiJson.mockResolvedValueOnce({ products: [{ id: 1 }], total: 1 }); await list.retry(); list = render();
  expect(list.error).toBeNull(); expect(list.items).toEqual([{ id: 1 }]); log.mockRestore();
});
it("保存成功後の一覧更新失敗を区別し、再送信を促さない", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.apiJson.mockResolvedValueOnce({ products: [], total: 0 });
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); const list = render();
  state.apiJson.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error("503"));
  expect(await list.save({ name: "saved" })).toBe(true);
  expect(render().error).toContain("商品を保存しました"); log.mockRestore();
});
it("2ページ目から新規保存した後の再取得失敗にも保存成功を表示する", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  state.apiJson.mockResolvedValue({ products: [], total: 100 });
  const render = () => state.runner!.render(() => useCrudResource({ endpoint: "/products", listKey: "products", label: "商品" }));
  render(); await settle(); let list = render(); list.pagination.setPage(2); render(); await settle(); list = render();
  state.apiJson.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error("503"));
  expect(await list.save({ name: "saved" })).toBe(true); render(); await settle();
  expect(render().error).toContain("商品を保存しました"); log.mockRestore();
});
