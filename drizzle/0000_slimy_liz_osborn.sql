CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`merchant` text NOT NULL,
	`category` text DEFAULT 'Other' NOT NULL,
	`amount` real NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
