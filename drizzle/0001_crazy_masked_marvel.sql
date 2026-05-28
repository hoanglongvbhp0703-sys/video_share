CREATE TABLE `channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`avatarUrl` text,
	`bannerUrl` text,
	`subscriberCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`likeCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('like','dislike') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`videoUrl` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int,
	`viewCount` bigint NOT NULL DEFAULT 0,
	`likeCount` int NOT NULL DEFAULT 0,
	`dislikeCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`isPublished` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `channels` (`userId`);--> statement-breakpoint
CREATE INDEX `videoId_idx` ON `comments` (`videoId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `comments` (`userId`);--> statement-breakpoint
CREATE INDEX `videoId_userId_idx` ON `likes` (`videoId`,`userId`);--> statement-breakpoint
CREATE INDEX `channelId_userId_idx` ON `subscriptions` (`channelId`,`userId`);--> statement-breakpoint
CREATE INDEX `channelId_idx` ON `videos` (`channelId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `videos` (`createdAt`);