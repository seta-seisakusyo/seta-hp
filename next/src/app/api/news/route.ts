import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { parsePagination } from "@/lib/pagination";
import {
  handleApiError,
  isErrorResponse,
  parseEditorJson,
} from "@/lib/api-utils";
import {
  NewsCreateSchema,
  NewsUpdateSchema,
} from "@/lib/validation";
import xss from "xss";
import { deleteManagedResource } from "@/lib/managed-resource-route";
import { successResponse } from "@/lib/api-response";
import { getNewsText, type NewsContents } from "@/lib/types/news";

const sanitizeNewsContents = (contents: NewsContents) => ({
  text: xss(getNewsText(contents)),
});

// お知らせ一覧取得
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        select: { id: true, date: true, title: true, contents: true, url: true },
        orderBy: { date: "desc" },
        take: limit,
        skip,
      }),
      prisma.news.count(),
    ]);
    return NextResponse.json({ news, total, page, limit });
  } catch (error) {
    return handleApiError(error, { log: "お知らせ取得エラー", message: "お知らせの取得に失敗しました" });
  }
}

// お知らせ作成
export async function POST(req: NextRequest) {
  try {
    const parsed = await parseEditorJson(req, NewsCreateSchema);
    if (isErrorResponse(parsed)) return parsed;
    const prisma = getPrismaClient();
    const { title, contents, date, url } = parsed;

    await prisma.news.create({
      data: {
        title,
        contents: sanitizeNewsContents(contents),
        date,
        url: url ?? null,
      },
      select: { id: true },
    });

    return successResponse();
  } catch (error) {
    return handleApiError(error, { log: "お知らせ作成エラー", message: "お知らせの作成に失敗しました" });
  }
}

// お知らせ更新
export async function PUT(req: NextRequest) {
  try {
    const parsed = await parseEditorJson(req, NewsUpdateSchema);
    if (isErrorResponse(parsed)) return parsed;
    const prisma = getPrismaClient();
    const { id, title, contents, date, url } = parsed;

    await prisma.news.update({
      where: { id },
      data: {
        title,
        contents: contents !== undefined ? sanitizeNewsContents(contents) : undefined,
        date,
        url,
      },
      select: { id: true },
    });

    return successResponse();
  } catch (error) {
    return handleApiError(error, {
      log: "お知らせ更新エラー",
      message: "お知らせの更新に失敗しました",
      notFoundMessage: "指定されたお知らせが見つかりません",
    });
  }
}

// お知らせ削除
export async function DELETE(req: NextRequest) {
  return deleteManagedResource(req, {
    deleteById: (id) => getPrismaClient().news.delete({ where: { id }, select: { id: true } }),
    notFoundMessage: "指定されたお知らせが見つかりません",
    errorLog: "お知らせ削除エラー",
    errorMessage: "お知らせの削除に失敗しました",
  });
}
