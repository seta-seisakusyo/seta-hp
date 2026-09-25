import { NextRequest, NextResponse } from "next/server";
import { badRequestResponse, internalErrorResponse } from "@/lib/api-response";
import { isErrorResponse, requireEditor } from "@/lib/api-utils";
import { saveUploadedImage } from "@/lib/upload-storage";

export async function POST(req: NextRequest) {
  try {
    const session = await requireEditor();
    if (isErrorResponse(session)) return session;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequestResponse("ファイルが選択されていません");
    }

    const saved = await saveUploadedImage(file);
    if ("error" in saved) {
      return badRequestResponse(saved.error);
    }
    return NextResponse.json({ url: saved.url });
  } catch (error) {
    console.error("アップロードエラー:", error);
    return internalErrorResponse("アップロードに失敗しました");
  }
}
