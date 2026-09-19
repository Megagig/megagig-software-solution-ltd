import sanitizeHtml from "sanitize-html";

// Blog bodies are admin-authored rich-text HTML. Admins are trusted, but the
// HTML is still rendered into a public page, so it is sanitized at the point
// of output with an allow-list: a compromised admin account or a pasted
// snippet must not be able to inject scripts, handlers or odd URL schemes.
//
// - The page already has its own <h1>, so any <h1> in a body is demoted to <h2>.
// - External links open in a new tab with rel="noopener noreferrer";
//   internal (relative) links are left alone.
// - Images may only use http(s) or relative URLs (no data: URIs).
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr",
    "ul", "ol", "li",
    "strong", "b", "em", "i", "u", "s", "sub", "sup",
    "blockquote", "pre", "code",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    h1: "h2",
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      if (/^https?:\/\//i.test(href)) {
        return { tagName, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } };
      }
      // Drop any author-supplied target/rel on non-external links.
      const { target: _target, rel: _rel, ...rest } = attribs;
      void _target;
      void _rel;
      return { tagName, attribs: rest };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
  },
};

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}
