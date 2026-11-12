CREATE TABLE `answers` (
	`player` text NOT NULL,
	`code` text NOT NULL,
	`idx` integer NOT NULL,
	`value` text NOT NULL,
	`elapsed` integer NOT NULL,
	PRIMARY KEY(`player`, `code`, `idx`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`stage` text NOT NULL,
	`idx` integer NOT NULL,
	`started` integer NOT NULL,
	`duration` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL
);
