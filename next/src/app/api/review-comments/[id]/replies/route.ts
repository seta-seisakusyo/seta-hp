/**
 * レビューコメントへの返信 API
 *
 * POST   /api/review-comments/:id/replies            … 返信追加
 * DELETE /api/review-comments/:id/replies?replyId=N  … 返信削除
 *
 * DELETE はcommentIdとreplyIdの組で絞り、別コメントの返信を削除できないようにする。
 */

import { getPrismaClient } from "@/lib/db";
import { badRequestResponse, notFoundResponse, successResponse } from "@/lib/api-response";
import {
  handleApiError,
  isErrorResponse,
  parseJsonWithSchema,
} from "@/lib/api-utils";
import { reviewReplySelect } from "@/lib/review-comment-query";
import { ReviewReplyCreateSchema } from "@/lib/review-validation";
import { parsePositiveId } from "@/lib/parse-id";
import { parseGuardedReviewId } from "@/lib/reviewCommentsGuard";
import { NextRequest, NextResponse } from "next/server";

const prisma = getPrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const commentId = await parseGuardedReviewId(req, params);
  if (isErrorResponse(commentId)) return commentId;

  try {
    const data = await parseJsonWithSchema(req, ReviewReplyCreateSchema);
    if (isErrorResponse(data)) return data;

    const reply = await prisma.reviewCommentReply.create({
      data: { commentId, ...data },
      select: reviewReplySelect,
    });
    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      log: "レビュー返信作成エラー",
      message: "作成に失敗しました",
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const commentId = await parseGuardedReviewId(req, params);
  if (isErrorResponse(commentId)) return commentId;

  const replyId = parsePositiveId(req.nextUrl.searchParams.get("replyId"));
  if (!replyId) return badRequestResponse("replyId is required");

  try {
    const result = await prisma.reviewCommentReply.deleteMany({
      where: { id: replyId, commentId },
    });
    if (result.count === 0) {
      return notFoundResponse("not found");
    }
    return successResponse();
  } catch (error) {
    return handleApiError(error, {
      log: "レビュー返信削除エラー",
      message: "削除に失敗しました",
    });
  }
}
