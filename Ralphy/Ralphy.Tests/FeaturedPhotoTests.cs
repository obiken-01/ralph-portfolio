using FluentAssertions;
using Ralphy.Domain.Enums;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// The home page slideshow's data source. It is public and unauthenticated, so
/// the interesting cases are what it refuses to hand out.
/// </summary>
public class FeaturedPhotoTests
{
    /// <summary>Seeds n published photos plus some that must never surface.</summary>
    private static TestDb SeedLibrary(int publishedPhotos)
    {
        var db = new TestDb();

        var published = db.AddPost(status: PostStatus.Published, title: "Reef");
        for (var i = 0; i < publishedPhotos; i++)
            db.AddPhoto(published.Id, sortOrder: i);

        var draft = db.AddPost(status: PostStatus.Draft, title: "Unfinished");
        db.AddPhoto(draft.Id, sortOrder: 0);

        // Videos live in the same table with Type = Video.
        db.AddPhoto(published.Id, sortOrder: 99, type: MediaType.Video);

        return db;
    }

    [Fact]
    public async Task Returns_only_photos_from_published_posts()
    {
        using var db = SeedLibrary(publishedPhotos: 4);

        var result = await ServiceFactory.Photos(db).GetRandomAsync(30);

        // The draft's photo would otherwise leak an unpublished post onto the
        // front page.
        result.Should().HaveCount(4);
        result.Should().OnlyContain(p => p.PostTitle == "Reef");
    }

    [Fact]
    public async Task Leaves_videos_out()
    {
        using var db = SeedLibrary(publishedPhotos: 2);

        var result = await ServiceFactory.Photos(db).GetRandomAsync(30);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Caps_the_count_so_the_endpoint_cannot_dump_the_library()
    {
        using var db = SeedLibrary(publishedPhotos: 50);

        var result = await ServiceFactory.Photos(db).GetRandomAsync(9999);

        result.Should().HaveCount(30);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task Treats_a_nonsense_count_as_one(int count)
    {
        using var db = SeedLibrary(publishedPhotos: 5);

        var result = await ServiceFactory.Photos(db).GetRandomAsync(count);

        result.Should().ContainSingle();
    }

    [Fact]
    public async Task Returns_fewer_than_asked_when_the_library_is_small()
    {
        using var db = SeedLibrary(publishedPhotos: 3);

        var result = await ServiceFactory.Photos(db).GetRandomAsync(10);

        // A new blog with three photos should not error, just return three.
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task Carries_the_post_and_place_so_a_slide_can_caption_itself()
    {
        using var db = SeedLibrary(publishedPhotos: 1);

        var photo = (await ServiceFactory.Photos(db).GetRandomAsync(1)).Single();

        photo.PostId.Should().BeGreaterThan(0);
        photo.PostTitle.Should().Be("Reef");
        photo.LocationName.Should().Be("Bugtong Bato Falls");
    }

    [Fact]
    public async Task Hides_a_placeholder_location_rather_than_captioning_it()
    {
        using var db = new TestDb();
        var placeholder = db.AddLocation("West Philippine Sea", isPlaceholder: true);
        var post = db.AddPost(status: PostStatus.Published, locationId: placeholder.Id);
        db.AddPhoto(post.Id);

        var photo = (await ServiceFactory.Photos(db).GetRandomAsync(1)).Single();

        // Mid-cleanup posts shouldn't announce "West Philippine Sea" on the
        // front page.
        photo.LocationName.Should().BeNull();
        photo.PostTitle.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Returns_nothing_when_nothing_is_published()
    {
        using var db = new TestDb();
        var draft = db.AddPost(status: PostStatus.Draft);
        db.AddPhoto(draft.Id);

        var result = await ServiceFactory.Photos(db).GetRandomAsync(10);

        result.Should().BeEmpty();
    }
}
