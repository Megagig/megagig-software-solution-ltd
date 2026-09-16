package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
)

// JobsHandler handles admin job queue endpoints.
type JobsHandler struct {
	RedisURL string
}

func (h *JobsHandler) getInspector() (*asynq.Inspector, error) {
	redisOpt, err := asynq.ParseRedisURI(h.RedisURL)
	if err != nil {
		return nil, err
	}
	return asynq.NewInspector(redisOpt), nil
}

// Stats returns queue statistics.
func (h *JobsHandler) Stats(c *gin.Context) {
	inspector, err := h.getInspector()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "REDIS_UNAVAILABLE",
				"message": "Job queue not available",
			},
		})
		return
	}
	defer inspector.Close()

	queues, err := inspector.Queues()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch queue info",
			},
		})
		return
	}

	stats := make([]gin.H, 0)
	for _, q := range queues {
		info, err := inspector.GetQueueInfo(q)
		if err != nil {
			continue
		}
		stats = append(stats, gin.H{
			"queue":     info.Queue,
			"size":      info.Size,
			"active":    info.Active,
			"pending":   info.Pending,
			"completed": info.Completed,
			"failed":    info.Failed,
			"retry":     info.Retry,
			"scheduled": info.Scheduled,
			"processed": info.Processed,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// ListByStatus returns jobs filtered by status.
func (h *JobsHandler) ListByStatus(c *gin.Context) {
	status := c.Param("status")
	queue := c.DefaultQuery("queue", "default")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	inspector, err := h.getInspector()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "REDIS_UNAVAILABLE",
				"message": "Job queue not available",
			},
		})
		return
	}
	defer inspector.Close()

	type jobInfo struct {
		ID       string `json:"id"`
		Type     string `json:"type"`
		Queue    string `json:"queue"`
		MaxRetry int    `json:"max_retry"`
		Retried  int    `json:"retried"`
		LastErr  string `json:"last_error"`
	}

	var jobs []jobInfo

	opts := []asynq.ListOption{asynq.PageSize(pageSize), asynq.Page(page)}

	switch status {
	case "active":
		tasks, err := inspector.ListActiveTasks(queue, opts...)
		if err == nil {
			for _, t := range tasks {
				jobs = append(jobs, jobInfo{ID: t.ID, Type: t.Type, Queue: t.Queue, MaxRetry: t.MaxRetry, Retried: t.Retried, LastErr: t.LastErr})
			}
		}
	case "pending":
		tasks, err := inspector.ListPendingTasks(queue, opts...)
		if err == nil {
			for _, t := range tasks {
				jobs = append(jobs, jobInfo{ID: t.ID, Type: t.Type, Queue: t.Queue, MaxRetry: t.MaxRetry, Retried: t.Retried, LastErr: t.LastErr})
			}
		}
	case "completed":
		tasks, err := inspector.ListCompletedTasks(queue, opts...)
		if err == nil {
			for _, t := range tasks {
				jobs = append(jobs, jobInfo{ID: t.ID, Type: t.Type, Queue: t.Queue, MaxRetry: t.MaxRetry, Retried: t.Retried, LastErr: t.LastErr})
			}
		}
	case "failed":
		tasks, err := inspector.ListArchivedTasks(queue, opts...)
		if err == nil {
			for _, t := range tasks {
				jobs = append(jobs, jobInfo{ID: t.ID, Type: t.Type, Queue: t.Queue, MaxRetry: t.MaxRetry, Retried: t.Retried, LastErr: t.LastErr})
			}
		}
	case "retry":
		tasks, err := inspector.ListRetryTasks(queue, opts...)
		if err == nil {
			for _, t := range tasks {
				jobs = append(jobs, jobInfo{ID: t.ID, Type: t.Type, Queue: t.Queue, MaxRetry: t.MaxRetry, Retried: t.Retried, LastErr: t.LastErr})
			}
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_STATUS",
				"message": "Status must be: active, pending, completed, failed, or retry",
			},
		})
		return
	}

	if jobs == nil {
		jobs = make([]jobInfo, 0)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": jobs,
	})
}

// Retry re-enqueues a failed job.
func (h *JobsHandler) Retry(c *gin.Context) {
	id := c.Param("id")
	queue := c.DefaultQuery("queue", "default")

	inspector, err := h.getInspector()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "REDIS_UNAVAILABLE",
				"message": "Job queue not available",
			},
		})
		return
	}
	defer inspector.Close()

	if err := inspector.RunTask(queue, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "RETRY_FAILED",
				"message": "Failed to retry job: " + err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Job queued for retry",
	})
}

// ClearQueue deletes all tasks in a queue.
func (h *JobsHandler) ClearQueue(c *gin.Context) {
	queue := c.Param("queue")

	inspector, err := h.getInspector()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "REDIS_UNAVAILABLE",
				"message": "Job queue not available",
			},
		})
		return
	}
	defer inspector.Close()

	if _, err := inspector.DeleteAllCompletedTasks(queue); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "CLEAR_FAILED",
				"message": "Failed to clear queue",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Queue cleared",
	})
}
