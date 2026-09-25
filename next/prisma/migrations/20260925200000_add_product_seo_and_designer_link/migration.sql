-- SEO fields (keywords / meta description) and the link back to the designer tool.
-- designerDesignId is unique so that re-registering the same design updates the same product.
-- Additive and nullable: existing rows are unaffected.

ALTER TABLE `Product`
    ADD COLUMN `seoKeywords` VARCHAR(512) NULL,
    ADD COLUMN `metaDescription` VARCHAR(320) NULL,
    ADD COLUMN `designerDesignId` INTEGER NULL,
    ADD COLUMN `designerUrl` VARCHAR(512) NULL;

CREATE UNIQUE INDEX `Product_designerDesignId_key` ON `Product`(`designerDesignId`);
