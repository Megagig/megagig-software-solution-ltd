package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// ProductService handles business logic for products.
type ProductService struct {
	DB *gorm.DB
}

// ProductListParams holds pagination and filter parameters.
type ProductListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of products.
func (s *ProductService) List(params ProductListParams) ([]models.Product, int64, int, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	if params.SortOrder != "asc" && params.SortOrder != "desc" {
		params.SortOrder = "desc"
	}
	// SortBy is interpolated into ORDER BY below, so it MUST be whitelisted
	// against real columns — never trust a client-supplied sort column.
	sortableProduct := map[string]bool{"id": true, "created_at": true, "updated_at": true, "slug": true, "name": true, "tagline": true, "description": true, "live_url": true, "docs_url": true, "published": true, "sort_order": true}
	if !sortableProduct[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.Product{})

	if params.Search != "" {
		query = query.Where("slug ILIKE ? OR name ILIKE ? OR tagline ILIKE ? OR description ILIKE ? OR live_url ILIKE ? OR docs_url ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.Product
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching products: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single product by ID.
func (s *ProductService) GetByID(id string) (*models.Product, error) {
	var item models.Product
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}
	return &item, nil
}

// Create creates a new product.
func (s *ProductService) Create(item *models.Product) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating product: %w", err)
	}
	return nil
}

// Update modifies an existing product. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *ProductService) Update(id string, updates map[string]interface{}) (*models.Product, error) {
	var item models.Product
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating product: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a product. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *ProductService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.Product{})
	if res.Error != nil {
		return fmt.Errorf("deleting product: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("product not found")
	}
	return nil
}
