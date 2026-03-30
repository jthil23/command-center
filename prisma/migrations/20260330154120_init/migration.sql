-- CreateTable
CREATE TABLE `hunt_state` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `app` VARCHAR(50) NOT NULL,
    `item_id` VARCHAR(100) NOT NULL,
    `item_title` VARCHAR(500) NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `hunt_state_app_expires_at_idx`(`app`, `expires_at`),
    UNIQUE INDEX `hunt_state_app_item_id_key`(`app`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hunt_runs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `app` VARCHAR(50) NOT NULL,
    `run_type` VARCHAR(20) NOT NULL,
    `items_found` INTEGER NOT NULL DEFAULT 0,
    `items_searched` INTEGER NOT NULL DEFAULT 0,
    `errors` INTEGER NOT NULL DEFAULT 0,
    `duration` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL,
    `message` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `hunt_runs_app_started_at_idx`(`app`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheduled_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `cron_expr` VARCHAR(100) NOT NULL,
    `job_type` VARCHAR(50) NOT NULL,
    `config` TEXT NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_executions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `output` TEXT NULL,
    `error` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,

    INDEX `job_executions_job_id_started_at_idx`(`job_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source` VARCHAR(50) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_log_created_at_idx`(`created_at`),
    INDEX `activity_log_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `job_executions` ADD CONSTRAINT `job_executions_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `scheduled_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
