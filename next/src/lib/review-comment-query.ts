import { Prisma } from "@prisma/client";

export const reviewReplySelect = {
  id: true,
  authorName: true,
  content: true,
  createdAt: true,
} satisfies Prisma.ReviewCommentReplySelect;

export const reviewCommentSelect = {
  id: true,
  xRatio: true,
  yAbsolute: true,
  authorName: true,
  content: true,
  status: true,
  createdAt: true,
  replies: {
    orderBy: { createdAt: "asc" },
    select: reviewReplySelect,
  },
} satisfies Prisma.ReviewCommentSelect;
