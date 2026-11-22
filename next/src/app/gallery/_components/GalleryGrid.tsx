"use client";

import { Box } from "@mui/material";
import SectionContainer from "@/components/SectionContainer";
import type { WorkGridItem } from "@/lib/types/work";
import WorkCard from "./WorkCard";
import WorkLightbox from "./WorkLightbox";
import { useWorkLightbox } from "./useWorkLightbox";

interface Props {
  /** 公開中の作品（1件以上。0件の空表示はページ側で出す） */
  works: WorkGridItem[];
  /** /gallery?work={id} で指定された作品。存在すれば開いた状態で表示する */
  initialWorkId?: number | null;
}

const GalleryGrid: React.FC<Props> = ({ works, initialWorkId = null }) => {
  const { selectedWork, openWork, closeWork } = useWorkLightbox(works, initialWorkId);

  return (
    <Box component="section" sx={{ py: { xs: 4, md: 6 } }}>
      <SectionContainer>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: { xs: 3, md: 4 },
          }}
        >
          {works.map((work, idx) => (
            <WorkCard key={work.id} work={work} index={idx} onOpen={openWork} />
          ))}
        </Box>
      </SectionContainer>

      <WorkLightbox work={selectedWork} onClose={closeWork} />
    </Box>
  );
};

export default GalleryGrid;
