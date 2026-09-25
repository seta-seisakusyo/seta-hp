"use client";

import { validateInquiry } from "@/lib/validation";
import { apiJson } from "@/lib/api-client";
import { CheckCircle, Error } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Modal,
  TextField,
  Typography
} from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReCaptcha } from "next-recaptcha-v3";
import { useSearchParams } from "next/navigation";

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  inquiry?: string;
}

const FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    "& fieldset": { borderColor: "divider" },
    "&:hover fieldset": { borderColor: "text.primary" },
    "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: 1 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "primary.main" },
};

interface FieldProps {
  label: string;
  labelEn: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, labelEn, required, children }) => (
  <Box>
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        gap: 1.5,
        mb: 1,
      }}
    >
      <Box
        sx={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {labelEn} {required && <Box component="span" sx={{ color: "primary.main" }}>*</Box>}
      </Box>
      <Box sx={{ fontSize: "12px", color: "text.disabled" }}>
        {label}
      </Box>
    </Box>
    {children}
  </Box>
);

interface ContactFormProps {
  recaptchaEnabled: boolean;
}

export default function ContactForm({ recaptchaEnabled }: ContactFormProps) {
  const theme = useTheme();
  const FONT_DISPLAY = theme.custom.fonts.display;

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const inquiryRef = useRef<HTMLTextAreaElement>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<"loading" | "success" | "error">("loading");

  const { executeRecaptcha, loaded: recaptchaLoaded } = useReCaptcha();
  const searchParams = useSearchParams();

  // URLパラメータから対象名を取得して自動入力
  useEffect(() => {
    const display = searchParams.get("display");
    const product = searchParams.get("product");
    const target = display || product;

    if (target && inquiryRef.current) {
      // textareaへのプレーンテキスト挿入なのでHTMLエスケープは不要（送信時にサーバー側でサニタイズされる）
      const sanitizedTarget = target.slice(0, 200);
      inquiryRef.current.value = display
        ? `【ギャラリー掲載ディスプレイについてのお問い合わせ】\n対象作品: ${sanitizedTarget}\n\n`
        : `【商品購入のお問い合わせ】\n商品名: ${sanitizedTarget}\n\n`;
    }
  }, [searchParams]);

  const closeModal = () => setIsModalOpen(false);
  const handleChange = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      name: nameRef.current?.value || "",
      email: emailRef.current?.value || "",
      phone: phoneRef.current?.value || "",
      inquiry: inquiryRef.current?.value || "",
    };

    const validationErrors = validateInquiry(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsModalOpen(true);
    setModalContent("loading");

    try {
      // reCAPTCHAトークンは送信リクエスト本体に載せ、サーバー側（/api/email）で検証させる。
      // 検証と送信処理を1リクエストに束ねることで、チャレンジ通過と送信を確実に結びつける。
      const recaptchaToken = recaptchaEnabled
        ? await executeRecaptcha("contact_form")
        : undefined;

      const emailData = await apiJson<{ success: boolean }>("/api/email", {
        method: "POST",
        body: { ...formData, recaptchaToken },
      });

      if (emailData.success) {
        setModalContent("success");
        if (nameRef.current) nameRef.current.value = "";
        if (emailRef.current) emailRef.current.value = "";
        if (phoneRef.current) phoneRef.current.value = "";
        if (inquiryRef.current) inquiryRef.current.value = "";
      } else {
        setModalContent("error");
      }
    } catch (error) {
      console.error("送信エラー:", error);
      setModalContent("error");
    }
  }, [executeRecaptcha, recaptchaEnabled]);

  return (
    <Box sx={{ bgcolor: "#FFFFFF", py: { xs: 6, md: 10 } }}>
      <SectionContainer>
        <Box sx={{ maxWidth: 720, mx: "auto" }}>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}
          >
            <Field label="お名前" labelEn="Name" required>
              <TextField
                inputRef={nameRef}
                name="name"
                placeholder="瀬田 太郎"
                error={Boolean(errors.name)}
                helperText={errors.name}
                onChange={() => handleChange("name")}
                fullWidth
                size="medium"
                sx={FIELD_SX}
              />
            </Field>

            <Field label="メールアドレス" labelEn="Email" required>
              <TextField
                inputRef={emailRef}
                name="email"
                placeholder="you@example.com"
                error={Boolean(errors.email)}
                helperText={errors.email}
                onChange={() => handleChange("email")}
                fullWidth
                sx={FIELD_SX}
              />
            </Field>

            <Field label="電話番号 (任意)" labelEn="Phone">
              <TextField
                inputRef={phoneRef}
                name="phone"
                placeholder="090-0000-0000"
                error={Boolean(errors.phone)}
                helperText={errors.phone}
                onChange={() => handleChange("phone")}
                fullWidth
                sx={FIELD_SX}
              />
            </Field>

            <Field label="お問い合わせ内容" labelEn="Message" required>
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    if (inquiryRef.current) {
                      inquiryRef.current.value = `【カスタム対応のご相談】\n\n飾りたいカード: （例: Topps, ポケカ, 写真）\nケースの外形: （例: 96×71mm）\n枚数: （例: 縦4 × 横4）\nカードの間隔: （例: 5mm）\n外形余白: （例: 10mm）\n取り付け穴のサイズ: （例: Φ7）\n\nその他ご要望:\n`;
                      inquiryRef.current.focus();
                      handleChange("inquiry");
                    }
                  }}
                  sx={{
                    fontSize: "12px",
                    borderColor: "divider",
                    color: "text.secondary",
                    borderRadius: "999px",
                    px: 2,
                    "&:hover": { borderColor: "primary.main", color: "primary.main" },
                  }}
                >
                  カスタム対応テンプレート
                </Button>
              </Box>
              <TextField
                inputRef={inquiryRef}
                name="inquiry"
                placeholder="ご質問・ご相談・特注のご依頼など、お気軽にどうぞ。"
                error={Boolean(errors.inquiry)}
                helperText={errors.inquiry}
                onChange={() => handleChange("inquiry")}
                fullWidth
                multiline
                rows={6}
                sx={FIELD_SX}
              />
            </Field>

            <Box
              sx={{
                pt: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ fontSize: "12px", color: "text.disabled", lineHeight: 1.6 }}>
                {recaptchaEnabled ? "送信前に reCAPTCHA による自動判定を行います。" : "現在は reCAPTCHA 無効で送信されます。"}
                <br />
                内容によっては数日以内にメールでご返信します。
              </Box>
              <Button
                type="submit"
                variant="contained"
                disabled={(recaptchaEnabled && !recaptchaLoaded) || isModalOpen}
                sx={{
                  bgcolor: "background.dark",
                  color: "#FFFFFF",
                  px: 3.5,
                  py: 1.75,
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxShadow: "none",
                  fontFamily: FONT_DISPLAY,
                  letterSpacing: "0.02em",
                  "&:hover": { bgcolor: "primary.main", boxShadow: "none", transform: "translateY(-1px)" },
                  "&:disabled": { bgcolor: "divider", color: "#FFFFFF" },
                  transition: "background-color 0.2s, transform 0.2s",
                }}
              >
                {recaptchaEnabled && !recaptchaLoaded ? "準備中…" : isModalOpen ? "送信中…" : "送信する →"}
              </Button>
            </Box>
          </Box>
        </Box>
      </SectionContainer>

      <Modal open={isModalOpen} onClose={modalContent === "loading" ? undefined : closeModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: 320, sm: 400 },
            bgcolor: "#FFFFFF",
            boxShadow: "0 30px 60px -20px rgba(10,10,10,0.3)",
            p: 4,
            textAlign: "center",
            borderRadius: "12px",
          }}
        >
          {modalContent === "loading" && (
            <>
              <CircularProgress sx={{ color: "primary.main" }} />
              <Typography sx={{ mt: 2, color: "secondary.main" }}>送信中…</Typography>
            </>
          )}
          {modalContent === "success" && (
            <>
              <CheckCircle sx={{ color: "primary.main", fontSize: 50 }} />
              <Typography
                sx={{
                  mt: 2,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: "22px",
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                }}
              >
                送信完了
              </Typography>
              <Typography sx={{ mt: 1, fontSize: "13.5px", color: "text.secondary", lineHeight: 1.7 }}>
                お問い合わせありがとうございました。
                <br />
                内容を確認次第、メールでご返信します。
              </Typography>
              <Button
                onClick={closeModal}
                sx={{
                  mt: 3,
                  bgcolor: "background.dark",
                  color: "#FFFFFF",
                  px: 3,
                  py: 1.25,
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  boxShadow: "none",
                  "&:hover": { bgcolor: "primary.main", boxShadow: "none" },
                }}
              >
                閉じる
              </Button>
            </>
          )}
          {modalContent === "error" && (
            <>
              <Error sx={{ color: "#DC2626", fontSize: 50 }} />
              <Typography
                sx={{
                  mt: 2,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: "22px",
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                }}
              >
                送信に失敗しました
              </Typography>
              <Typography sx={{ mt: 1, fontSize: "13.5px", color: "text.secondary", lineHeight: 1.7 }}>
                時間をおいて再度お試しください。
                <br />
                解決しない場合は管理者にご連絡ください。
              </Typography>
              <Button
                onClick={closeModal}
                sx={{
                  mt: 3,
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: "divider",
                  px: 3,
                  py: 1.25,
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  "&:hover": { borderColor: "text.primary", bgcolor: "transparent" },
                }}
              >
                閉じる
              </Button>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
