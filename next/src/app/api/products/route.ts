import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { notFoundResponse, successResponse } from "@/lib/api-response";
import {
  handleApiError,
  isErrorResponse,
  parseEditorJson,
  sanitizeNullableText,
  sanitizeOptionalNullableText,
  sanitizeOptionalText,
  sanitizeTags,
} from "@/lib/api-utils";
import { ProductCreateSchema, ProductUpdateSchema } from "@/lib/validation";
import {
  deleteManagedResource,
  getPublishedListParams,
} from "@/lib/managed-resource-route";
import { collectImageUrls, deleteUnusedUploadedFiles } from "@/lib/uploaded-files";
import { revalidateProductPages } from "@/lib/cache-tags";
import xss from "xss";

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
    } = parsed;

    await prisma.product.create({
      data: {
        name: xss(name),
        description: xss(description),
        price,
        category,
        tags: sanitizeTags(tags),
        images: images ?? Prisma.JsonNull,
        stock: stock || "在庫あり",
        isPublished: isPublished !== false,
        isHeroImage: isHeroImage === true,
        purchaseUrl: sanitizeNullableText(purchaseUrl),
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
    } = parsed;

    // 存在確認
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { images: true },
    });
    if (!existing) {
      return notFoundResponse("指定された商品が見つかりません");
    }

    await prisma.product.update({
      where: { id },
      data: {
        name: sanitizeOptionalText(name),
        description: sanitizeOptionalText(description),
        price,
        category,
        tags: tags !== undefined ? sanitizeTags(tags) : undefined,
        images: images !== undefined ? (images ?? Prisma.JsonNull) : undefined,
        stock,
        isPublished,
        isHeroImage: isHeroImage !== undefined ? isHeroImage === true : undefined,
        purchaseUrl: sanitizeOptionalNullableText(purchaseUrl),
      },
      select: { id: true },
    });

    await deleteUnusedUploadedFiles(prisma, collectImageUrls(existing));

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
  const prisma = getPrismaClient();
  return deleteManagedResource(req, {
    findById: (id) =>
      prisma.product.findUnique({ where: { id }, select: { images: true } }),
    deleteById: (id) =>
      prisma.product.delete({ where: { id }, select: { id: true } }),
    afterDelete: async (existing) => {
      await deleteUnusedUploadedFiles(prisma, collectImageUrls(existing));
      revalidateProductPages();
    },
    notFoundMessage: "指定された商品が見つかりません",
    errorLog: "商品削除エラー",
    errorMessage: "商品の削除に失敗しました",
  });
}
