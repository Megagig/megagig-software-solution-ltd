package handlers

import (
	"encoding/xml"
	"log"
	"net/http"
	"strings"

	"github.com/crewjam/saml"
	"github.com/gin-gonic/gin"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

// SAMLMetadata publishes this application's service-provider metadata.
//
// The customer's IdP admin uploads this document (or its URL) to create the
// application on their side — it carries the entity ID, the ACS endpoint and
// the certificate they must verify our requests against.
//
//	GET /api/auth/saml/:slug/metadata
func (h *SSOHandler) SAMLMetadata(c *gin.Context) {
	slug := strings.ToLower(c.Param("slug"))

	sp, err := h.SAML.Provider(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "no SAML connection named " + slug},
		})
		return
	}

	out, err := xml.MarshalIndent(sp.Metadata(), "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "could not render metadata"},
		})
		return
	}
	c.Data(http.StatusOK, "application/samlmetadata+xml", append([]byte(xml.Header), out...))
}

// SAMLBegin sends the user to their IdP with a signed authentication request.
//
//	GET /api/auth/saml/:slug
func (h *SSOHandler) SAMLBegin(c *gin.Context) {
	slug := strings.ToLower(c.Param("slug"))

	sp, err := h.SAML.Provider(slug)
	if err != nil {
		h.failLogin(c, "That sign-in method is not available.")
		return
	}

	authURL, err := sp.MakeRedirectAuthenticationRequest("")
	if err != nil {
		log.Printf("saml %s: authn request: %v", slug, err)
		h.failLogin(c, "Could not reach the identity provider.")
		return
	}

	c.Redirect(http.StatusFound, authURL.String())
}

// SAMLACS is the Assertion Consumer Service — where the IdP POSTs the signed
// assertion once the user has authenticated.
//
// ParseResponse does the security-critical work: it verifies the signature
// against the certificate in the IdP metadata, checks the audience is us, and
// enforces the assertion's validity window. Anything it rejects is treated as a
// failed login with a generic message, because the detail is only useful to an
// attacker.
//
//	POST /api/auth/saml/:slug/acs
func (h *SSOHandler) SAMLACS(c *gin.Context) {
	slug := strings.ToLower(c.Param("slug"))

	sp, err := h.SAML.Provider(slug)
	if err != nil {
		h.failLogin(c, "That sign-in method is not available.")
		return
	}

	var conn models.SSOConnection
	if err := h.DB.Where("slug = ? AND enabled = ? AND protocol = ?", slug, true, "saml").
		First(&conn).Error; err != nil {
		h.failLogin(c, "That sign-in method is not available.")
		return
	}

	if err := c.Request.ParseForm(); err != nil {
		h.failLogin(c, "Sign-in was not completed.")
		return
	}

	// No tracked request IDs: an IdP-initiated login has no request to match,
	// and crewjam skips the InResponseTo check when the connection allows that.
	// With it disallowed, an unsolicited assertion is refused here.
	assertion, err := sp.ParseResponse(c.Request, []string{})
	if err != nil {
		log.Printf("saml %s: assertion rejected: %v", slug, err)
		h.failLogin(c, "Sign-in could not be verified. Please try again.")
		return
	}

	ident := samlIdentity(&conn, assertion)
	if strings.TrimSpace(ident.Email) == "" {
		h.failLogin(c, "Your identity provider did not release an email address.")
		return
	}
	if strings.TrimSpace(ident.Subject) == "" {
		h.failLogin(c, "Your identity provider did not release an identifier.")
		return
	}

	user, err := h.resolveUser(c, &conn, ident)
	if err != nil {
		h.failLogin(c, err.Error())
		return
	}
	if err := h.applyGroupRoles(&conn, user, ident); err != nil {
		log.Printf("saml %s: role mapping for %s: %v", slug, user.ID, err)
	}

	// Reload so the token carries any role the mapping just assigned.
	if err := h.DB.Where("id = ?", user.ID).First(user).Error; err != nil {
		h.failLogin(c, "Could not complete sign-in.")
		return
	}

	tokens, err := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		h.failLogin(c, "Could not complete sign-in.")
		return
	}
	if _, err := services.CreateSession(h.DB, c, user.ID, tokens.RefreshToken); err != nil {
		log.Printf("saml: failed to record session for %s: %v", user.ID, err)
	}
	h.AuthService.SetAuthCookies(c, tokens)

	services.TouchConnection(h.DB, conn.ID)

	c.Redirect(http.StatusFound, h.Config.OAuthFrontendURL+"/auth/callback")
}

// samlIdentity normalizes an assertion onto the same shape the OIDC callback
// produces, so both protocols share one provisioning path. Each lookup falls
// back to the conventional attribute names when the connection doesn't pin one.
func samlIdentity(conn *models.SSOConnection, assertion *saml.Assertion) externalIdentity {
	emailNames := conn.AttributeOr(conn.EmailAttribute,
		"email", "mail", "emailaddress", "urn:oid:0.9.2342.19200300.100.1.3",
		"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")
	firstNames := conn.AttributeOr(conn.FirstNameAttribute,
		"firstName", "givenName", "urn:oid:2.5.4.42",
		"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname")
	lastNames := conn.AttributeOr(conn.LastNameAttribute,
		"lastName", "surname", "sn", "urn:oid:2.5.4.4",
		"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname")
	groupNames := conn.AttributeOr(conn.GroupsAttribute,
		"groups", "memberOf", "Role",
		"http://schemas.microsoft.com/ws/2008/06/identity/claims/groups")

	return externalIdentity{
		Subject:   services.SAMLSubject(assertion, emailNames...),
		Email:     strings.ToLower(services.SAMLAttribute(assertion, emailNames...)),
		FirstName: services.SAMLAttribute(assertion, firstNames...),
		LastName:  services.SAMLAttribute(assertion, lastNames...),
		Groups:    services.SAMLAttributeValues(assertion, groupNames...),
	}
}
