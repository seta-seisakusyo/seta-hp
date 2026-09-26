-- Compatible card sleeve for each product (name, maker, size, bundled count,
-- and the discount when the customer brings their own sleeves).
-- Stored as JSON validated by productSleeveSchema; additive and nullable.

ALTER TABLE `Product` ADD COLUMN `sleeve` JSON NULL;
