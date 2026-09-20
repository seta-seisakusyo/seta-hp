"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link as MuiLink,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MultiImageUpload from "@/components/MultiImageUpload";
import { apiJson } from "@/lib/api-client";
import { X_POST_MAX_IMAGES, X_POST_MAX_LENGTH } from "@/lib/x-constants";
import { X_PROFILE_URL } from "@/lib/site-config";

interface XPostResponse {
  postId?: string;
  url?: string;
}

/** 本文にURLが含まれるか。X API は URL入り投稿だけ課金が13倍（$0.015 → $0.20）になる。 */
const URL_PATTERN = /https?:\/\/\S+/i;

export default function XPostForm() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<XPostResponse | null>(null);

  const remaining = X_POST_MAX_LENGTH - text.length;
  const tooLong = remaining < 0;
  const isEmpty = text.trim().length === 0;
  const containsUrl = useMemo(() => URL_PATTERN.test(text), [text]);

  const handlePost = async () => {
    setPosting(true);
    setError(null);
    setPosted(null);
    try {
      const result = await apiJson<XPostResponse>("/api/x/post", {
        method: "POST",
        body: { text, imageUrls: images },
      });
      setPosted(result);
      setText("");
      setImages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿に失敗しました");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 680, mx: "auto" }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        投稿先は{" "}
        <MuiLink href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer">
          @kaza_love_
        </MuiLink>{" "}
        です。送信すると即座に公開され、取り消しは X 側でしか行えません。
      </Alert>

      {posted && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setPosted(null)}>
          投稿しました。
          {posted.url && (
            <>
              {" "}
              <MuiLink href={posted.url} target="_blank" rel="noopener noreferrer">
                投稿を開く
              </MuiLink>
            </>
          )}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <TextField
            label="本文"
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={5}
            fullWidth
            error={tooLong}
            disabled={posting}
            placeholder="制作の様子、新作の告知など"
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 1,
              color: tooLong ? "error.main" : "text.secondary",
            }}
          >
            <Typography variant="caption">
              残り {remaining} 文字
            </Typography>
          </Box>

          {containsUrl && (
            // 本文にURLを入れると1件 $0.20、入れなければ $0.015。
            // X 側もリンク付き投稿のリーチを絞る傾向があるため、リプライへの分離を促す。
            <Alert severity="warning" sx={{ mt: 1 }}>
              本文にURLが含まれています。URL入りの投稿は課金が約13倍（$0.015 →
              $0.20）になり、表示も伸びにくい傾向があります。リンクは投稿後のリプライに置くことを推奨します。
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              画像（最大 {X_POST_MAX_IMAGES} 枚）
            </Typography>
            <MultiImageUpload
              value={images}
              onChange={setImages}
              maxImages={X_POST_MAX_IMAGES}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              variant="contained"
              startIcon={
                posting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
              }
              onClick={handlePost}
              disabled={posting || isEmpty || tooLong}
            >
              {posting ? "送信中..." : "X に投稿"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
