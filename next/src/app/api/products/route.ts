import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { badRequestResponse, notFoundResponse, successResponse } from "@/lib/api-response";
import {
  handleApiError,
  isErrorResponse,
  parseEditorJson,
} from "@/lib/api-utils";
import { ProductCreateSchema, ProductUpdateSchema } from "@/lib/validation";
import {
  deleteManagedResource,
  getPublishedListParams,
} from "@/lib/managed-resource-route";
import { collectImageUrls, deleteUnusedUploadedFiles } from "@/lib/uploaded-files";
import { revalidateProductPages } from "@/lib/cache-tags";
import { hasPendingSleeveImageRefs, toSleeveData } from "@/lib/product-sleeve";

// 商品一覧取得（公開用）
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const params = await getPublishedListParams(req);
    if (isErrorResponse(params)) return params;
    const { includeUnpublished, page, limit, skip } = params;

    const where = includeUnpublished ? {} : { isPublished: true };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          tags: true,
          images: true,
          stock: true,
          isPublished: true,
          isHeroImage: true,
          purchaseUrl: true,
          amazonUrl: true,
          seoKeywords: true,
          metaDescription: true,
          sleeve: true,
          designerDesignId: true,
          designerUrl: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total, page, limit });
  } catch (error) {
    return handleApiError(error, { log: "商品取得エラー", message: "商品の取得に失敗しました" });
  }
}

// 商品作成
export async function POST(req: NextRequest) {
  try {
    const parsed = await parseEditorJson(req, ProductCreateSchema);
    if (isErrorResponse(parsed)) return parsed;
    const prisma = getPrismaClient();
    const {
      name,
      description,
      price,
      category,
      tags,
      images,
      stock,
      isPublished,
      isHeroImage,
      purchaseUrl,
      amazonUrl,
      seoKeywords,
      metaDescription,
      sleeve,
    } = parsed;
    // "file:番号" は設計ツール連携の同じリクエストで送る画像を指す。管理画面からは受け付けない。
    if (hasPendingSleeveImageRefs(sleeve)) {
      return badRequestResponse("スリーブの画像はアップロードしてから指定してください");
    }

    await prisma.product.create({
      data: {
        name,
        description,
        price,
        category,
        tags: tags ?? "",
        images: images ?? Prisma.JsonNull,
        stock: stock || "在庫あり",
        isPublished: isPublished !== false,
        isHeroImage: isHeroImage === true,
        purchaseUrl: purchaseUrl ?? null,
        amazonUrl: amazonUrl ?? null,
        seoKeywords: seoKeywords ?? null,
        metaDescription: metaDescription ?? null,
        sleeve: toSleeveData(sleeve),
      },
      select: { id: true },
    });

    revalidateProductPages();

    return successResponse();
  } catch (error) {
    return handleApiError(error, { log: "商品作成エラー", message: "商品の作成に失敗しました" });
  }
}

// 商品更新
export async function PUT(req: NextRequest) {
  try {
    const parsed = await parseEditorJson(req, ProductUpdateSchema);
    if (isErrorResponse(parsed)) return parsed;
    const prisma = getPrismaClient();
    const {
      id,
      name,
      description,
      price,
      category,
      tags,
      images,
      stock,
      isPublished,
      isHeroImage,
      purchaseUrl,
      amazonUrl,
      seoKeywords,
      metaDescription,
      sleeve,
    } = parsed;
    // "file:番号" は設計ツール連携の同じリクエストで送る画像を指す。管理画面からは受け付けない。
    if (hasPendingSleeveImageRefs(sleeve)) {
      return badRequestResponse("スリーブの画像はアップロードしてから指定してください");
    }

    // 画像か対応スリーブを変えるときだけ旧値を取得する(使われなくなった画像の後片付け用)。
    // 対象なしの更新は Prisma P2025 で404にする。
    const touchesImages = images !== undefined || sleeve !== undefined;
    const existing = touchesImages
      ? await prisma.product.findUnique({ where: { id }, select: { images: true, sleeve: true } })
      : null;
    if (touchesImages && !existing) {
      return notFoundResponse("指定された商品が見つかりません");
    }

    await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        category,
        tags,
        images: images !== undefined ? (images ?? Prisma.JsonNull) : undefined,
        stock,
        isPublished,
        isHeroImage,
        purchaseUrl,
        amazonUrl,
        seoKeywords,
        metaDescription,
        sleeve: toSleeveData(sleeve, existing?.sleeve),
      },
      select: { id: true },
    });

    if (existing) {
      await deleteUnusedUploadedFiles(prisma, collectImageUrls(existing));
    }

    revalidateProductPages();

    return successResponse();
  } catch (error) {
    return handleApiError(error, {
      log: "商品更新エラー",
      message: "商品の更新に失敗しました",
      notFoundMessage: "指定された商品が見つかりません",
    });
  }
}

// 商品削除
export async function DELETE(req: NextRequest) {
  return deleteManagedResource(req, {
    deleteById: (id) =>
      getPrismaClient().product.delete({ where: { id }, select: { images: true, sleeve: true } }),
    afterDelete: async (existing) => {
      await deleteUnusedUploadedFiles(getPrismaClient(), collectImageUrls(existing));
      revalidateProductPages();
    },
    notFoundMessage: "指定された商品が見つかりません",
    errorLog: "商品削除エラー",
    errorMessage: "商品の削除に失敗しました",
  });
}
