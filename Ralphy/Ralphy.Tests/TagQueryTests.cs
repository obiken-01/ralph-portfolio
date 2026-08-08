using FluentAssertions;
using Ralphy.Domain.Enums;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Tags replace Trip as the grouping mechanism, so reading by tag has to work
/// as well as writing one did.
/// </summary>
public class TagQueryTests
{
    [Fact]
    public async Task Posts_by_tag_returns_only_published_ones()
    {
        using var db = new TestDb();
        var published = db.AddPost(status: PostStatus.Published, title: "Live");
        var draft = db.AddPost(status: PostStatus.Draft, title: "Draft");
        db.AddTag("paluan", published.Id, draft.Id);

        var result = await ServiceFactory.Posts(db).GetByTagAsync("paluan");

        result.Should().ContainSingle().Which.Title.Should().Be("Live");
    }

    [Fact]
    public async Task Posts_by_tag_matches_regardless_of_case()
    {
        using var db = new TestDb();
        var post = db.AddPost(status: PostStatus.Published);
        db.AddTag("paluan", post.Id);

        // Names are lowercased on write, so /tags/Paluan must find /tags/paluan.
        var result = await ServiceFactory.Posts(db).GetByTagAsync("Paluan");

        result.Should().ContainSingle();
    }

    [Fact]
    public async Task An_unknown_tag_is_a_404_not_an_empty_list()
    {
        using var db = new TestDb();

        var act = () => ServiceFactory.Posts(db).GetByTagAsync("typo");

        // An empty list is indistinguishable from a misspelling.
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task The_public_tag_cloud_leaves_out_tags_with_nothing_behind_them()
    {
        using var db = new TestDb();
        var published = db.AddPost(status: PostStatus.Published);
        var draft = db.AddPost(status: PostStatus.Draft);

        db.AddTag("paluan", published.Id);
        db.AddTag("unpublished-only", draft.Id);
        db.AddTag("orphan");

        var result = await ServiceFactory.Tags(db).GetPublishedAsync();

        result.Select(t => t.Name).Should().Equal("paluan");
    }

    [Fact]
    public async Task The_admin_tag_picker_still_offers_unused_tags()
    {
        using var db = new TestDb();
        db.AddTag("orphan");

        var result = await ServiceFactory.Tags(db).GetAllAsync();

        // Worth re-selecting while drafting even with no published post yet.
        result.Should().ContainSingle().Which.Name.Should().Be("orphan");
    }

    [Fact]
    public async Task Tag_counts_only_count_published_posts()
    {
        using var db = new TestDb();
        var a = db.AddPost(status: PostStatus.Published);
        var b = db.AddPost(status: PostStatus.Published);
        var c = db.AddPost(status: PostStatus.Draft);
        db.AddTag("paluan", a.Id, b.Id, c.Id);

        var result = await ServiceFactory.Tags(db).GetPublishedAsync();

        result.Single().PostCount.Should().Be(2);
    }

    [Fact]
    public async Task The_feed_carries_tags_and_the_place_name()
    {
        using var db = new TestDb();
        var post = db.AddPost(status: PostStatus.Published);
        db.AddPhoto(post.Id);
        db.AddTag("paluan", post.Id);

        var result = (await ServiceFactory.Posts(db).GetAllPublishedAsync())
            .Single();

        // Both come from Includes that were missing before v2.0.
        result.Tags.Should().Equal("paluan");
        result.LocationName.Should().Be("Bugtong Bato Falls");
    }

    [Fact]
    public async Task The_admin_list_carries_a_thumbnail()
    {
        using var db = new TestDb();
        var post = db.AddPost(status: PostStatus.Draft);
        db.AddPhoto(post.Id, sortOrder: 1);
        db.AddPhoto(post.Id, sortOrder: 0);

        var result = (await ServiceFactory.Posts(db).GetAllAsync()).Single();

        // GetAllAsync used to fall through to BaseRepository with no Include,
        // so every admin row had a null thumbnail.
        result.ThumbnailUrl.Should().NotBeNullOrEmpty();
        result.PhotoCount.Should().Be(2);
    }

    [Fact]
    public async Task The_card_thumbnail_is_the_first_photo_in_gallery_order()
    {
        using var db = new TestDb();
        var post = db.AddPost(status: PostStatus.Published);
        db.AddPhoto(post.Id, sortOrder: 1);
        var lead = db.AddPhoto(post.Id, sortOrder: 0);

        var result = (await ServiceFactory.Posts(db).GetAllPublishedAsync())
            .Single();

        result.ThumbnailUrl.Should().Be(lead.Url);
    }
}
