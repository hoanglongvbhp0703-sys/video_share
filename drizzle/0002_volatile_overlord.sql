CREATE TABLE `watchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` int NOT NULL,
	`userId` int NOT NULL,
	`watchedAt` timestamp NOT NULL DEFAULT (now()),
	`watchDuration` int NOT NULL DEFAULT 0,
	CONSTRAINT `watchHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `watchHistory_videoId_userId_idx` ON `watchHistory` (`videoId`,`userId`);--> statement-breakpoint
CREATE INDEX `watchHistory_userId_idx` ON `watchHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `watchHistory_watchedAt_idx` ON `watchHistory` (`watchedAt`);