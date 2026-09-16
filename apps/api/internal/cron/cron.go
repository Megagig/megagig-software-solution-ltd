package cron

import (
	"fmt"
	"log"
	"time"

	"github.com/hibiken/asynq"
)

// Task represents a registered cron task for display purposes.
type Task struct {
	Name     string `json:"name"`
	Schedule string `json:"schedule"`
	Type     string `json:"type"`
}

// RegisteredTasks holds the list of cron tasks for the admin API.
var RegisteredTasks []Task

// Scheduler wraps asynq.Scheduler for cron-like job scheduling.
type Scheduler struct {
	scheduler *asynq.Scheduler
}

// New creates a new cron Scheduler connected to Redis.
func New(redisURL string) (*Scheduler, error) {
	redisOpt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis URL for cron: %w", err)
	}

	scheduler := asynq.NewScheduler(redisOpt, nil)

	// Register built-in cron tasks
	RegisteredTasks = []Task{}

	// Cleanup expired tokens — every hour
	_, err = scheduler.Register("0 * * * *", asynq.NewTask("tokens:cleanup", nil))
	if err != nil {
		return nil, fmt.Errorf("registering tokens cleanup: %w", err)
	}
	RegisteredTasks = append(RegisteredTasks, Task{
		Name:     "Cleanup expired tokens",
		Schedule: "0 * * * *",
		Type:     "tokens:cleanup",
	})

	// v3.31.33 -- orphan upload cleanup. Runs daily at 03:15 (low
	// traffic window). Sweeps Upload rows whose claimed_at IS NULL
	// and that are older than 24h, deleting both the S3 object and
	// the DB row. Uses a one-line files.RunOrphanCleanup helper so
	// the cron handler stays thin.
	_, err = scheduler.Register("15 3 * * *", asynq.NewTask("uploads:cleanup_orphans", nil))
	if err != nil {
		return nil, fmt.Errorf("registering orphan upload cleanup: %w", err)
	}
	RegisteredTasks = append(RegisteredTasks, Task{
		Name:     "Cleanup orphan uploads",
		Schedule: "15 3 * * *",
		Type:     "uploads:cleanup_orphans",
	})

	// Automatic full-database backup, settings-driven. Instead of a fixed
	// weekly cron, a lightweight checker runs every 30 minutes and consults the
	// BackupSchedule row (daily / weekly / monthly / yearly + time-of-day,
	// default weekly). When the current period's run is due and hasn't happened
	// yet, it dumps every registered model to a ZIP (CSV per table + dump.sql +
	// metadata.json), uploads it, and prunes to the newest few archives. The
	// period can be changed at runtime from the Data & Backup page — no restart.
	//
	// asynq.Unique bounds it to one enqueue per tick window so overlapping
	// scheduler replicas don't double-run the check.
	_, err = scheduler.Register(
		"*/30 * * * *",
		asynq.NewTask("backup:scheduled", nil),
		asynq.Unique(25*time.Minute),
		asynq.Timeout(30*time.Minute),
		asynq.MaxRetry(1),
	)
	if err != nil {
		return nil, fmt.Errorf("registering scheduled backup: %w", err)
	}
	RegisteredTasks = append(RegisteredTasks, Task{
		Name:     "Automatic database backup",
		Schedule: "every 30 min · honors your backup schedule",
		Type:     "backup:scheduled",
	})

	// grit:cron-tasks

	return &Scheduler{scheduler: scheduler}, nil
}

// Start begins executing scheduled tasks.
func (s *Scheduler) Start() error {
	go func() {
		if err := s.scheduler.Run(); err != nil {
			log.Printf("Cron scheduler error: %v", err)
		}
	}()
	return nil
}

// Stop shuts down the scheduler gracefully.
func (s *Scheduler) Stop() {
	s.scheduler.Shutdown()
}
