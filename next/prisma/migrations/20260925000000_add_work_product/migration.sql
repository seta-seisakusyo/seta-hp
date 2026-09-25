-- Link gallery works to the products used in them (many-to-many).
-- Product detail pages list the works that use the product, and the gallery lists
-- the products used in each work. Deleting either side removes its links.
-- Additive only: no existing table or column changes.

CREATE TABLE `WorkProduct` (
    `workId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,

    INDEX `WorkProduct_productId_idx`(`productId`),
    PRIMARY KEY (`workId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WorkProduct` ADD CONSTRAINT `WorkProduct_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WorkProduct` ADD CONSTRAINT `WorkProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
