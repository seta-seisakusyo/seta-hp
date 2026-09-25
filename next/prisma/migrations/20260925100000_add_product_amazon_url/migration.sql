-- Per-product Amazon purchase URL, shown next to the BASE purchase link.
-- VARCHAR(512) because product URLs copied from Amazon carry slugs and tracking params.
-- Additive and nullable: existing rows are unaffected.

ALTER TABLE `Product` ADD COLUMN `amazonUrl` VARCHAR(512) NULL;
