using FluentAssertions;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Domain.Enums;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// The photo gallery's data path: dimensions off the Cloudinary result, EXIF
/// off the browser, sort order maintained by the reorder endpoint.
/// </summary>
public class PhotoMetadataTests
{
    [Fact]
    public async Task Upload_keeps_the_dimensions_Cloudinary_already_measured()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var cloudinary = ServiceFactory.CloudinaryMock(width: 5472, height: 3648);

        await ServiceFactory.Photos(db, cloudinary).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null, null, TestDb.OwnerId);

        var saved = db.Context.Photos.Single();
        saved.Width.Should().Be(5472);
        saved.Height.Should().Be(3648);
    }

    [Fact]
    public async Task Upload_stores_EXIF_the_browser_read_before_compressing()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var takenAt = new DateTime(2025, 3, 14, 6, 30, 0, DateTimeKind.Utc);

        await ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null,
            new PhotoMetadataDto
            {
                TakenAt = takenAt,
                Latitude = 13.35,
                Longitude = 120.63,
            },
            TestDb.OwnerId);

        var saved = db.Context.Photos.Single();
        saved.TakenAt.Should().Be(takenAt);
        saved.Latitude.Should().Be(13.35);
        saved.Longitude.Should().Be(120.63);
    }

    [Fact]
    public async Task Upload_without_EXIF_is_the_normal_case_not_an_error()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        await ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null, null, TestDb.OwnerId);

        var saved = db.Context.Photos.Single();
        saved.TakenAt.Should().BeNull();
        saved.Latitude.Should().BeNull();
        saved.Longitude.Should().BeNull();
    }

    [Theory]
    [InlineData(95.0, 120.0)]     // latitude past the pole
    [InlineData(-91.0, 120.0)]
    [InlineData(13.0, 181.0)]     // longitude past the antimeridian
    [InlineData(13.0, -181.0)]
    public async Task Upload_rejects_out_of_range_coordinates(double lat, double lng)
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null,
            new PhotoMetadataDto { Latitude = lat, Longitude = lng },
            TestDb.OwnerId);

        // Rejected, not clamped — a clamped pin lands somewhere plausible
        // and wrong, which is worse than a failed upload.
        await act.Should().ThrowAsync<ArgumentException>();
        db.Context.Photos.Should().BeEmpty();
    }

    [Fact]
    public async Task Upload_rejects_a_capture_date_in_the_future()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null,
            new PhotoMetadataDto { TakenAt = DateTime.UtcNow.AddYears(1) },
            TestDb.OwnerId);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task Upload_tolerates_a_camera_clock_that_runs_slightly_fast()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        await ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null,
            new PhotoMetadataDto { TakenAt = DateTime.UtcNow.AddHours(2) },
            TestDb.OwnerId);

        db.Context.Photos.Should().ContainSingle();
    }

    [Fact]
    public async Task Sequential_uploads_land_in_upload_order()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photos = ServiceFactory.Photos(db);

        for (var i = 0; i < 3; i++)
        {
            await photos.UploadPhotoAsync(
                ServiceFactory.FakeImage($"shot{i}.jpg"), post.Id,
                null, null, TestDb.OwnerId);
        }

        // Not all zero: an absent sortOrder means "next", not "first".
        db.Context.Photos.OrderBy(p => p.Id)
            .Select(p => p.SortOrder)
            .Should().Equal(0, 1, 2);
    }

    [Fact]
    public async Task Upload_sets_PostTakenAt_to_the_earliest_shot()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photos = ServiceFactory.Photos(db);

        var later = new DateTime(2025, 6, 1, 12, 0, 0, DateTimeKind.Utc);
        var earlier = new DateTime(2025, 5, 20, 8, 0, 0, DateTimeKind.Utc);

        await photos.UploadPhotoAsync(
            ServiceFactory.FakeImage("b.jpg"), post.Id, null,
            new PhotoMetadataDto { TakenAt = later }, TestDb.OwnerId);

        await photos.UploadPhotoAsync(
            ServiceFactory.FakeImage("a.jpg"), post.Id, null,
            new PhotoMetadataDto { TakenAt = earlier }, TestDb.OwnerId);

        db.Context.Posts.Single().TakenAt.Should().Be(earlier);
    }

    [Fact]
    public async Task Reorder_assigns_SortOrder_by_position()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var a = db.AddPhoto(post.Id, sortOrder: 0);
        var b = db.AddPhoto(post.Id, sortOrder: 1);
        var c = db.AddPhoto(post.Id, sortOrder: 2);

        await ServiceFactory.Photos(db).ReorderAsync(
            post.Id,
            new ReorderPhotosDto { PhotoIds = new List<int> { c.Id, a.Id, b.Id } },
            TestDb.OwnerId);

        db.Context.Photos.OrderBy(p => p.SortOrder)
            .Select(p => p.Id)
            .Should().Equal(c.Id, a.Id, b.Id);
    }

    [Fact]
    public async Task Reorder_rejects_a_partial_list_without_writing_anything()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var a = db.AddPhoto(post.Id, sortOrder: 0);
        db.AddPhoto(post.Id, sortOrder: 1);

        var act = () => ServiceFactory.Photos(db).ReorderAsync(
            post.Id,
            new ReorderPhotosDto { PhotoIds = new List<int> { a.Id } },
            TestDb.OwnerId);

        await act.Should().ThrowAsync<ArgumentException>();
        db.Context.Photos.OrderBy(p => p.Id)
            .Select(p => p.SortOrder)
            .Should().Equal(0, 1);
    }

    [Fact]
    public async Task Reorder_rejects_an_id_belonging_to_another_post()
    {
        using var db = new TestDb();
        var mine = db.AddPost();
        var theirs = db.AddPost(title: "Another");
        var a = db.AddPhoto(mine.Id, sortOrder: 0);
        var foreign = db.AddPhoto(theirs.Id, sortOrder: 0);

        var act = () => ServiceFactory.Photos(db).ReorderAsync(
            mine.Id,
            new ReorderPhotosDto { PhotoIds = new List<int> { a.Id, foreign.Id } },
            TestDb.OwnerId);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task Photos_come_back_in_SortOrder_not_creation_order()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var first = db.AddPhoto(post.Id, sortOrder: 2);
        var second = db.AddPhoto(post.Id, sortOrder: 0);
        var third = db.AddPhoto(post.Id, sortOrder: 1);

        var result = await ServiceFactory.Photos(db).GetByPostIdAsync(post.Id);

        result.Select(p => p.Id)
            .Should().Equal(second.Id, third.Id, first.Id);
    }
}
