using Microsoft.AspNetCore.Mvc;
using Ralphy.Application.Services.Interfaces;
using System.Text;
using System.Xml.Linq;

namespace Ralphy.Api.Controllers
{
    [ApiController]
    public class SitemapController : ControllerBase
    {
        private readonly IPostService _postService;
        private readonly ITagService _tagService;
        private readonly IConfiguration _configuration;

        private static readonly XNamespace Ns =
            "http://www.sitemaps.org/schemas/sitemap/0.9";

        public SitemapController(
            IPostService postService,
            ITagService tagService,
            IConfiguration configuration)
        {
            _postService = postService;
            _tagService = tagService;
            _configuration = configuration;
        }

        [HttpGet("api/sitemap.xml")]
        [ResponseCache(Duration = 3600)]
        public async Task<IActionResult> Get()
        {
            var siteUrl = (_configuration["Seo:SiteUrl"]
                ?? "https://ralph-portfolio-production.up.railway.app").TrimEnd('/');

            var posts = await _postService.GetAllPublishedAsync();
            var tags = await _tagService.GetPublishedAsync();

            var urls = new List<XElement>
            {
                UrlElement($"{siteUrl}/", null, "weekly", "1.0"),
                UrlElement($"{siteUrl}/posts", null, "weekly", "0.9"),
                UrlElement($"{siteUrl}/map", null, "monthly", "0.6"),
                UrlElement($"{siteUrl}/timeline", null, "weekly", "0.6"),
                UrlElement($"{siteUrl}/about", null, "monthly", "0.5"),
            };

            // The old /trips and /trips/{id}/posts/{id} URLs are 301'd by
            // nginx; they are deliberately no longer advertised here.
            urls.AddRange(posts.Select(p =>
                UrlElement($"{siteUrl}/posts/{p.Id}",
                    p.PublishedAt ?? p.CreatedAt, "monthly", "0.7")));

            urls.AddRange(tags.Select(t =>
                UrlElement($"{siteUrl}/tags/{Uri.EscapeDataString(t.Name)}",
                    null, "weekly", "0.5")));

            var doc = new XDocument(
                new XDeclaration("1.0", "utf-8", null),
                new XElement(Ns + "urlset", urls));

            var xml = new StringBuilder()
                .AppendLine("<?xml version=\"1.0\" encoding=\"utf-8\"?>")
                .Append(doc.Root)
                .ToString();

            return Content(xml, "application/xml", Encoding.UTF8);
        }

        private static XElement UrlElement(
            string loc, DateTime? lastMod, string changeFreq, string priority)
        {
            var element = new XElement(Ns + "url",
                new XElement(Ns + "loc", loc));

            if (lastMod.HasValue)
                element.Add(new XElement(Ns + "lastmod",
                    lastMod.Value.ToString("yyyy-MM-dd")));

            element.Add(new XElement(Ns + "changefreq", changeFreq));
            element.Add(new XElement(Ns + "priority", priority));

            return element;
        }
    }
}
