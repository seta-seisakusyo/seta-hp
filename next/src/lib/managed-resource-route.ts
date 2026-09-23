import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  isErrorResponse,
  parseAdminJson,
  requireEditor,
} from "@/lib/api-utils";
import { successResponse } from "@/lib/api-response";
import { parsePagination } from "@/lib/pagination";
import { RequiredIdSchema } from "@/lib/validation";

export async function getPublishedListParams(req: NextRequest): Promise<
  | {
      includeUnpublished: boolean;
      page: number;
      limit: number | undefined;
      skip: number | undefined;
    }
  | NextResponse
> {
  const includeUnpublished =
    req.nextUrl.searchParams.get("includeUnpublished") === "true";
  if (includeUnpublished) {
    const session = await requireEditor();
    if (isErrorResponse(session)) return session;
  }

  return {
    includeUnpublished,
    ...parsePagination(req.nextUrl.searchParams),
  };
}

interface DeleteManagedResourceOptions<T> {
  deleteById: (id: number) => Promise<T>;
  afterDelete?: (resource: T) => Promise<void> | void;
  notFoundMessage: string;
  errorLog: string;
  errorMessage: string;
}

/** 管理リソース削除の認証・ID検証・削除・後処理・エラー応答を統一する。 */
export async function deleteManagedResource<T>(
  req: NextRequest,
  options: DeleteManagedResourceOptions<T>
): Promise<NextResponse> {
  try {
    const parsed = await parseAdminJson(req, RequiredIdSchema);
    if (isErrorResponse(parsed)) return parsed;

    const deleted = await options.deleteById(parsed.id);
    await options.afterDelete?.(deleted);

    return successResponse();
  } catch (error) {
    return handleApiError(error, {
      log: options.errorLog,
      message: options.errorMessage,
      notFoundMessage: options.notFoundMessage,
    });
  }
}
