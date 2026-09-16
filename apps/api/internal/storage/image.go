package storage

import (
	"bytes"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"strings"

	"github.com/disintegration/imaging"
)

// MaxImageWidth is the maximum width for processed images.
const MaxImageWidth = 1920

// ThumbnailSize is the size of generated thumbnails.
const ThumbnailSize = 300

// ProcessImage resizes an image if it exceeds MaxImageWidth, preserving aspect ratio.
// Returns the processed image bytes and format.
func ProcessImage(reader io.Reader, mimeType string) ([]byte, error) {
	img, _, err := image.Decode(reader)
	if err != nil {
		return nil, fmt.Errorf("decoding image: %w", err)
	}

	bounds := img.Bounds()
	if bounds.Dx() > MaxImageWidth {
		img = imaging.Resize(img, MaxImageWidth, 0, imaging.Lanczos)
	}

	var buf bytes.Buffer
	if err := encodeImage(&buf, img, mimeType); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// GenerateThumbnail creates a square thumbnail of the given size.
func GenerateThumbnail(reader io.Reader, mimeType string) ([]byte, error) {
	img, _, err := image.Decode(reader)
	if err != nil {
		return nil, fmt.Errorf("decoding image: %w", err)
	}

	thumb := imaging.Fill(img, ThumbnailSize, ThumbnailSize, imaging.Center, imaging.Lanczos)

	var buf bytes.Buffer
	if err := encodeImage(&buf, thumb, mimeType); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// IsImageMimeType returns true if the MIME type is a supported image format.
func IsImageMimeType(mimeType string) bool {
	switch strings.ToLower(mimeType) {
	case "image/jpeg", "image/png", "image/gif":
		return true
	}
	return false
}

func encodeImage(buf *bytes.Buffer, img image.Image, mimeType string) error {
	switch strings.ToLower(mimeType) {
	case "image/png":
		return png.Encode(buf, img)
	default:
		return jpeg.Encode(buf, img, &jpeg.Options{Quality: 85})
	}
}
