package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"megagig-software-solution/apps/api/internal/ai"
)

// AIHandler handles AI completion endpoints.
type AIHandler struct {
	AI *ai.AI
}

type completionRequest struct {
	Prompt      string  `json:"prompt" binding:"required"`
	MaxTokens   int     `json:"max_tokens"`
	Temperature float64 `json:"temperature"`
}

type chatRequest struct {
	Messages    []ai.Message `json:"messages" binding:"required"`
	MaxTokens   int          `json:"max_tokens"`
	Temperature float64      `json:"temperature"`
}

// Complete handles a single prompt completion.
func (h *AIHandler) Complete(c *gin.Context) {
	if h.AI == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "AI_UNAVAILABLE",
				"message": "AI service is not configured",
			},
		})
		return
	}

	var req completionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	resp, err := h.AI.Complete(c.Request.Context(), ai.CompletionRequest{
		Prompt:      req.Prompt,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "AI_ERROR",
				"message": "Failed to generate completion",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resp,
	})
}

// Chat handles a multi-turn conversation.
func (h *AIHandler) Chat(c *gin.Context) {
	if h.AI == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "AI_UNAVAILABLE",
				"message": "AI service is not configured",
			},
		})
		return
	}

	var req chatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	resp, err := h.AI.Complete(c.Request.Context(), ai.CompletionRequest{
		Messages:    req.Messages,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "AI_ERROR",
				"message": "Failed to generate response",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resp,
	})
}

// Stream handles a streaming completion via SSE.
func (h *AIHandler) Stream(c *gin.Context) {
	if h.AI == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "AI_UNAVAILABLE",
				"message": "AI service is not configured",
			},
		})
		return
	}

	var req chatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	err := h.AI.Stream(c.Request.Context(), ai.CompletionRequest{
		Messages:    req.Messages,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
	}, func(chunk string) error {
		c.SSEvent("message", chunk)
		c.Writer.Flush()
		return nil
	})

	if err != nil {
		c.SSEvent("error", fmt.Sprintf("Stream error: %v", err))
		c.Writer.Flush()
	}

	c.SSEvent("done", "[DONE]")
	c.Writer.Flush()
}
