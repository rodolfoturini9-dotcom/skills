ALTER TABLE `evolutions` ADD `print_json` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `evolutions` ADD `source_version` integer DEFAULT 0 NOT NULL;