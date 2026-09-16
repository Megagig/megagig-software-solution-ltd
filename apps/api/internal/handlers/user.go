package handlers

import (
	"log"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/authz"
	"megagig-software-solution/apps/api/internal/crypto"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

// UserHandler handles user management endpoints.
type UserHandler struct {
	DB *gorm.DB
	// AuthService is used by DeleteProfile to clear the HttpOnly auth
	// cookies as part of the soft-delete response. Optional — if nil,
	// the cookies just won't be cleared and the client's next request
	// will 401 normally.
	AuthService *services.AuthService
}

// Create creates a new user (admin only).
func (h *UserHandler) Create(c *gin.Context) {
	var req struct {
		FirstName string `json:"first_name" binding:"required"`
		LastName  string `json:"last_name" binding:"required"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=6"`
		Role      string `json:"role"`
		Avatar    string `json:"avatar"`
		JobTitle  string `json:"job_title"`
		Active    *bool  `json:"active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	// Check email uniqueness
	var existing models.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "EMAIL_EXISTS",
				"message": "A user with this email already exists",
			},
		})
		return
	}

	user := models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  req.Password,
		Role:      req.Role,
		Avatar:    req.Avatar,
		JobTitle:  req.JobTitle,
		Active:    true,
	}

	if req.Active != nil {
		user.Active = *req.Active
	}
	if user.Role == "" {
		user.Role = models.RoleUser
	}

	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create user",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    user,
		"message": "User created successfully",
	})
}

// List returns a paginated list of users.
func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Validate sort order
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	// Validate sort column
	allowedSorts := map[string]bool{
		"id": true, "first_name": true, "last_name": true, "email": true, "role": true, "created_at": true,
	}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}

	query := h.DB.Model(&models.User{})

	// Search
	if search != "" {
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Count total
	var total int64
	query.Count(&total)

	// Fetch paginated results
	var users []models.User
	offset := (page - 1) * pageSize
	if err := query.Order(sortBy + " " + sortOrder).Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch users",
			},
		})
		return
	}

	pages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": users,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}

// GetByID returns a single user by ID.
func (h *UserHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := h.DB.Where("id = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "User not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// syncUserRoleAssignment makes the user_roles table reflect a single role name.
//
// The admin UI edits a user's role as one string, while authorization resolves
// through the many-to-many user_roles table. This bridges the two so the simple
// dropdown keeps working and actually takes effect.
//
// Assign several roles to one user with PUT /api/users/:id/roles instead — that
// endpoint is the full many-to-many path and this helper is its one-role case.
//
// A role name with no matching row (a custom legacy string) clears the
// assignments and lets grant resolution fall back to users.role, rather than
// failing the update.
func syncUserRoleAssignment(db *gorm.DB, userID, roleName string) error {
	var role models.Role
	err := db.Where("name = ?", roleName).First(&role).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	txErr := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserRole{}).Error; err != nil {
			return err
		}
		if role.ID == "" {
			return nil // unknown name — fall back to the legacy string
		}
		return tx.Create(&models.UserRole{UserID: userID, RoleID: role.ID}).Error
	})
	if txErr != nil {
		return txErr
	}

	// Permissions just changed for this user; drop the cached grants.
	authz.Invalidate()
	return nil
}

// Update modifies an existing user.
func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := h.DB.Where("id = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "User not found",
			},
		})
		return
	}

	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Password  string `json:"password"`
		Role      string `json:"role"`
		Avatar    string `json:"avatar"`
		JobTitle  string `json:"job_title"`
		Bio       string `json:"bio"`
		Active    *bool  `json:"active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.FirstName != "" {
		updates["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		updates["last_name"] = req.LastName
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Failed to hash password",
				},
			})
			return
		}
		updates["password"] = string(hashedPassword)
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.JobTitle != "" {
		updates["job_title"] = req.JobTitle
	}
	if req.Bio != "" {
		updates["bio"] = crypto.EncryptedString(req.Bio)
	}
	if req.Active != nil {
		updates["active"] = *req.Active
	}

	// Keep role ASSIGNMENTS in step with the role string.
	//
	// Grant resolution prefers the user_roles table and only falls back to
	// users.role. Without this, changing the Role dropdown for a user who
	// already has an assignment would update the string and change nothing
	// about what they can actually do — a silent no-op, and a nasty one to
	// debug.
	if req.Role != "" {
		if err := syncUserRoleAssignment(h.DB, user.ID, req.Role); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Failed to update role assignment",
				},
			})
			return
		}
	}

	if err := h.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update user",
			},
		})
		return
	}

	// Reload to get updated values
	h.DB.Where("id = ?", id).First(&user)

	c.JSON(http.StatusOK, gin.H{
		"data":    user,
		"message": "User updated successfully",
	})
}

// Delete soft-deletes a user.
func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := h.DB.Where("id = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "User not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete user",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deleted successfully",
	})
}

// GetProfile returns the currently authenticated user's profile.
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "User not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// UpdateProfile updates the currently authenticated user's profile.
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "User not found",
			},
		})
		return
	}

	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Password  string `json:"password"`
		Avatar    string `json:"avatar"`
		JobTitle  string `json:"job_title"`
		Bio       string `json:"bio"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	updates := map[string]interface{}{}
	passwordChanged := false
	if req.FirstName != "" {
		updates["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		updates["last_name"] = req.LastName
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Failed to hash password",
				},
			})
			return
		}
		updates["password"] = string(hashedPassword)
		passwordChanged = true
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.JobTitle != "" {
		updates["job_title"] = req.JobTitle
	}
	if req.Bio != "" {
		updates["bio"] = crypto.EncryptedString(req.Bio)
	}

	if err := h.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update profile",
			},
		})
		return
	}

	h.DB.Where("id = ?", userID).First(&user)

	// Changing a password must invalidate every logged-in device — that is the
	// whole point of changing it after a suspected compromise.
	//
	// The caller is then re-issued a brand-new session rather than spared: the
	// grit_refresh cookie is scoped to /api/auth, so a PUT /api/profile never
	// carries it and there is no way to recognise "this device" here. Revoking
	// everything and minting a fresh pair is both simpler and stricter — the old
	// token is dead even for the caller, and they stay signed in.
	if passwordChanged {
		if err := services.RevokeAllUserSessions(h.DB, user.ID, ""); err != nil {
			// Log it; the password DID change, so failing the request now would be
			// misleading. Sessions still die at their idle/absolute timeout.
			log.Printf("failed to revoke sessions after password change for user %s: %v", user.ID, err)
		} else if h.AuthService != nil {
			pair, terr := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
			if terr != nil {
				log.Printf("failed to re-issue tokens after password change for user %s: %v", user.ID, terr)
			} else if _, serr := services.CreateSession(h.DB, c, user.ID, pair.RefreshToken); serr != nil {
				log.Printf("failed to open a session after password change for user %s: %v", user.ID, serr)
			} else {
				h.AuthService.SetAuthCookies(c, pair)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    user,
		"message": "Profile updated successfully",
	})
}

// DeleteProfile soft-deletes the currently authenticated user's account.
func (h *UserHandler) DeleteProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "User not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete account",
			},
		})
		return
	}

	// Soft-delete leaves the JWT valid in theory; the auth middleware
	// would still 401 on the next request because the user row is
	// excluded by the default scope. We still expire the HttpOnly auth
	// cookies on the way out so the next /api/* call from this browser
	// doesn't even attempt — saves a round trip and a confusing 401 in
	// the dev console.
	if h.AuthService != nil {
		h.AuthService.ClearAuthCookies(c)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account deleted successfully",
	})
}
