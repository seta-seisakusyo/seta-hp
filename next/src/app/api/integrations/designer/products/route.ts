import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db";
import { badRequestResponse, notFoundResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/api-utils";
import { revalidateProductPages } from "@/lib/cache-tags";
import { DESIGNER_PRODUCT_MAX_IMAGES, verifyDesignerRequest } from "@/lib/designer-integration";
import { parsePositiveId } from "@/lib/parse-id";
import {
  resolveSleeveImageRefs,
  SleeveImageRefError,
  sleeveImageRefIndexes,
  toSleeveData,
} from "@/lib/product-sleeve";
import { collectImageUrls, deleteUnusedUploadedFiles } from "@/lib/uploaded-files";
import { removeSavedUploads, saveUploadedImage } from "@/lib/upload-storage";
import {
  DesignerProductSchema,
  SLEEVE_MAX_ALTERNATIVES,
  SLEEVE_MAX_IMAGES,
  type DesignerProductInput,
} from "@/lib/validation";

// 設計ツール（display_design）からの商品登録。
// サーバー間通信専用: 同じ Docker ネットワークから next_app:3000 を直接呼ぶ。
// nginx は外部からの /api/integrations/ を通さない（多層防御）。

const productSummary = { id: true, isPublished: true } as const;

function summaryResponse(product: { id: number; isPublished: boolean }, created: boolean, status = 200) {
  return NextResponse.json(
    { id: product.id, isPublished: product.isPublished, url: `/products/${product.id}`, created },
    { status },
  );
}

// 設計に紐づく商品の現状（公開状態など）。設計ツールの「HP掲載中」表示に使う。
export async function GET(req: NextRequest) {
  const denied = verifyDesignerRequest(req);
  if (denied) return denied;
  try {
    const designerDesignId = parsePositiveId(req.nextUrl.searchParams.get("designerDesignId") ?? "");
    if (designerDesignId === null) return badRequestResponse("designerDesignId を指定してください");
    const product = await getPrismaClient().product.findUnique({
      where: { designerDesignId },
      select: productSummary,
    });
    if (!product) return notFoundResponse("この設計の商品はまだ登録されていません");
    return summaryResponse(product, false);
  } catch (error) {
    return handleApiError(error, { log: "設計連携の商品取得エラー", message: "商品の取得に失敗しました" });
  }
}

type ParsedRequest = { input: DesignerProductInput; files: File[]; sleeveFiles: File[] };

/** 対応スリーブの画像の上限(代表とほかの対応スリーブの合計。スキーマで指定できる最大数に合わせる)。 */
const DESIGNER_SLEEVE_MAX_IMAGES = SLEEVE_MAX_IMAGES * (SLEEVE_MAX_ALTERNATIVES + 1);

async function parseRequest(req: NextRequest): Promise<ParsedRequest | NextResponse> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequestResponse("multipart/form-data で送信してください");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return badRequestResponse("payload はJSONで指定してください");
  }
  const parsed = DesignerProductSchema.safeParse(payload);
  if (!parsed.success) return badRequestResponse(parsed.error.issues[0].message);

  const files = form.getAll("images").filter((item): item is File => item instanceof File);
  if (files.length > DESIGNER_PRODUCT_MAX_IMAGES) {
    return badRequestResponse(`画像は${DESIGNER_PRODUCT_MAX_IMAGES}枚までです`);
  }
  // 対応スリーブの画像。payload.sleeve の images が "file:番号" でこの並びを指す。
  const sleeveFiles = form.getAll("sleeve_images").filter((item): item is File => item instanceof File);
  if (sleeveFiles.length > DESIGNER_SLEEVE_MAX_IMAGES) {
    return badRequestResponse(`スリーブの画像は${DESIGNER_SLEEVE_MAX_IMAGES}枚までです`);
  }
  const referenced = sleeveImageRefIndexes(parsed.data.sleeve);
  if (referenced.some((index) => index >= sleeveFiles.length)) {
    return badRequestResponse("スリーブの画像の指定が送られた画像と合いません");
  }
  return { input: parsed.data, files, sleeveFiles };
}

/**
 * 設計1件につき商品1件を作成または更新する（designerDesignId で照合）。
 * - 新規は必ず非公開で作る。公開は HP の管理画面で内容を確かめてから人が行う
 * - 更新では公開状態を変えない（公開後に設計ツールから更新しても非公開に戻さない）
 * - 画像を送った場合だけ差し替え、使われなくなった旧画像を消す
 */
export async function POST(req: NextRequest) {
  const denied = verifyDesignerRequest(req);
  if (denied) return denied;

  const request = await parseRequest(req);
  if (request instanceof NextResponse) return request;
  const { input, files, sleeveFiles } = request;

  const savedUrls: string[] = [];
  const productImageUrls: string[] = [];
  // 添字は sleeve_images の何番目か。どこからも指されていない画像は保存しない（参照されず残るため）。
  const sleeveImageUrls: string[] = [];
  const referenced = new Set(sleeveImageRefIndexes(input.sleeve));
  try {
    for (const [file, store] of [
      ...files.map((file) => [file, (url: string) => productImageUrls.push(url)] as const),
      ...sleeveFiles.flatMap((file, index) =>
        referenced.has(index) ? [[file, (url: string) => { sleeveImageUrls[index] = url; }] as const] : []
      ),
    ]) {
      const saved = await saveUploadedImage(file);
      if ("error" in saved) {
        await removeSavedUploads(savedUrls);
        return badRequestResponse(`${file.name || "画像"}: ${saved.error}`);
      }
      savedUrls.push(saved.url);
      store(saved.url);
    }
    // "file:番号" を、いま保存したスリーブ画像の URL に置き換える。
    const sleeve = input.sleeve ? resolveSleeveImageRefs(input.sleeve, sleeveImageUrls) : input.sleeve;

    const prisma = getPrismaClient();
    const existing = await prisma.product.findUnique({
      where: { designerDesignId: input.designerDesignId },
      select: { id: true, images: true, sleeve: true },
    });
    const data = {
      name: input.name,
      description: input.description,
      price: input.price,
      category: input.category,
      tags: input.tags ?? "",
      stock: input.stock || "受注生産",
      purchaseUrl: input.purchaseUrl ?? null,
      seoKeywords: input.seoKeywords ?? null,
      metaDescription: input.metaDescription ?? null,
      designerUrl: input.designerUrl ?? null,
      // 未送信なら変えない（HP 管理画面で入れた値を残す）
      sleeve: toSleeveData(sleeve, existing?.sleeve),
    };

    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: { ...data, ...(productImageUrls.length > 0 ? { images: productImageUrls } : {}) },
        select: productSummary,
      });
      // 差し替えで使われなくなった旧画像(商品画像・スリーブ画像)を消す。
      if (productImageUrls.length > 0 || input.sleeve !== undefined) {
        await deleteUnusedUploadedFiles(prisma, collectImageUrls(existing));
      }
      revalidateProductPages();
      return summaryResponse(updated, false);
    }

    const created = await prisma.product.create({
      data: {
        ...data,
        designerDesignId: input.designerDesignId,
        images: productImageUrls.length > 0 ? productImageUrls : Prisma.JsonNull,
        isPublished: false,
        isHeroImage: false,
      },
      select: productSummary,
    });
    revalidateProductPages();
    return summaryResponse(created, true, 201);
  } catch (error) {
    // DB に書けなかった画像は誰からも参照されないので、その場で消す。
    await removeSavedUploads(savedUrls);
    if (error instanceof SleeveImageRefError) return badRequestResponse(error.message);
    return handleApiError(error, {
      log: "設計連携の商品登録エラー",
      message: "商品の登録に失敗しました",
      // 同じ設計の登録が同時に走り、後から来た作成が一意制約に当たった場合。
      uniqueConstraintMessage: "同じ設計の登録が同時に行われました。もう一度お試しください",
    });
  }
}
