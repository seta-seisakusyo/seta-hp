import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import SectionHeader from "@/components/SectionHeader";
import AboutTwoColumn from "./AboutTwoColumn";

const AboutStory = () => {
  return (
    <Box component="section" sx={{ py: { xs: 10, md: 15 } }}>
      <SectionContainer>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1.4fr" },
            gap: { xs: 4, md: 10 },
            mb: 8,
            alignItems: "baseline",
          }}
        >
          <SectionHeader
            number="01"
            title="Story"
            titleJa="はじまり"
            marginBottom={0}
          />
          <Box />
        </Box>

        <AboutTwoColumn
          lead={
            <>
              欲しいものが
              <br />
              なかったから、
              <br />
              <Box component="span" sx={{ color: "primary.main" }}>作った。</Box>
            </>
          }
        >
            <Box sx={{ fontSize: "15.5px", color: "secondary.main", lineHeight: 2, mb: 3 }}>
              飾Love は、カード好きが営む小さな個人工房です。
            </Box>
            <Box sx={{ fontSize: "15.5px", color: "secondary.main", lineHeight: 2, mb: 3 }}>
              MLBカードを集めていると、「お気に入りのカードをもっとちゃんと飾りたい」
              「コレクションを見やすく整理したい」という気持ちが少しずつ強くなっていきました。
              けれど、いざ探してみると、自分が本当に納得できるディスプレイにはなかなか出会えません。
            </Box>
            <Box sx={{ fontSize: "15.5px", color: "secondary.main", lineHeight: 2, mb: 3 }}>
              ないなら、作ってみよう。
              <br />
              そう思って始めたのが、この工房です。
            </Box>
            <Box sx={{ fontSize: "15.5px", color: "secondary.main", lineHeight: 2 }}>
              レーザー加工で、自分が「これだ」と思える一品仕立てを、
              一つずつ手作業で組み立てています。同じカード好きの方に届くと嬉しいです。
            </Box>
        </AboutTwoColumn>
      </SectionContainer>
    </Box>
  );
};

export default AboutStory;
