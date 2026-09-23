import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { notFoundResponse, successResponse } from "@/lib/api-response";
import {
  handleApiError,
  isErrorResponse,
  parseEditorJson,
} from "@/lib/api-utils";
import { WorkCreateSchema, WorkUpdateSchema } from "@/lib/validation";
import {
  deleteManagedResource,
  getPublishedListParams,
} from "@/lib/managed-resource-route";
import { collectImageUrls, deleteUnusedUploadedFiles } from "@/lib/uploaded-files";
import { revalidateWorkPages } from "@/lib/cache-tags";

// 制作事例一覧取得（公開用）
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const params = await getPublishedListParams(req);
    if (isErrorResponse(params)) return params;
    const { includeUnpublished, page, limit, skip } = params;

    const where = includeUnpublished ? {} : { isPublished: true };
    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          tags: true,
          image: true,
          isPublished: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.work.count({ where }),
    ]);

    return NextResponse.json({ works, total, page, limit });
  } catch (error) {
    return handleApiError(error, { log: "制作事例取得エラー", message: "制作事例の取得に失敗しました" });
  }
}

// 制作事例作成
export async function POST(req: NextRequest) {
  try {
    const parsed = await parseEditorJson(req, WorkCreateSchema);
    if (isErrorResponse(parsed)) return parsed;
    const prisma = getPrismaClient();
    const { title, description, category, tags, image, isPublished } = parsed;

    await prisma.work.create({
      data: {
        title,
        description,
        category,
        tags: tags ?? "",
        image: image || null,
        isPublished: isPublished !== false,
      },
      select: { id: true },
    });

    revalidateWorkPages();

    return successResponse();
  } catch (error) {
    return handleApiError(error, { log: "制作事例作成エラー", message: "制作事例の作成に失敗しました" });
  }
}

// 制作事例更新
export async function PUT(req: NextRequest) {
  try {
    const parsed = await parseEditorJson(req, WorkUpdateSchema);
    if (isErrorResponse(parsed)) return parsed;
    const prisma = getPrismaClient();
    const { id, title, description, category, tags, image, isPublished } = parsed;

    // 画像変更時だけ旧画像を取得する。対象なしの更新は Prisma P2025 で404にする。
    const existing = image !== undefined
      ? await prisma.work.findUnique({ where: { id }, select: { image: true } })
      : null;
    if (image !== undefined && !existing) {
      return notFoundResponse("指定された制作事例が見つかりません");
    }

    await prisma.work.update({
      where: { id },
      data: {
        title,
        description,
        category,
        tags,
        image: image !== undefined ? (image || null) : undefined,
        isPublished,
      },
      select: { id: true },
    });

    if (existing) {
      await deleteUnusedUploadedFiles(prisma, collectImageUrls(existing));
    }

    revalidateWorkPages();

    return successResponse();
  } catch (error) {
    return handleApiError(error, {
      log: "制作事例更新エラー",
      message: "制作事例の更新に失敗しました",
      notFoundMessage: "指定された制作事例が見つかりません",
    });
  }
}

// 制作事例削除
export async function DELETE(req: NextRequest) {
  return deleteManagedResource(req, {
    deleteById: (id) =>
      getPrismaClient().work.delete({ where: { id }, select: { image: true } }),
    afterDelete: async (existing) => {
      await deleteUnusedUploadedFiles(getPrismaClient(), collectImageUrls(existing));
      revalidateWorkPages();
    },
    notFoundMessage: "指定された制作事例が見つかりません",
    errorLog: "制作事例削除エラー",
    errorMessage: "制作事例の削除に失敗しました",
  });
}
