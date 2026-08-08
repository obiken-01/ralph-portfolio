using FluentAssertions;
using Moq;
using Ralphy.Domain.Enums;
using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Models;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Photos uploaded before v2.0 carry null Width/Height — the app only started
/// keeping what Cloudinary returns at upload time. The numbers were never lost,
/// they are still on the asset, so the backfill reads them back.
///
/// Cloudinary is mocked here; what's under test is which rows get touched, what
/// happens when an asset is gone, and whether re-running is safe.
/// </summary>
public class DimensionBackfillTests
{
    private static Mock<ICloudinaryService> CloudinaryReturning(
        int width, int height)
    {
        var mock = ServiceFactory.CloudinaryMock();

        mock.Setup(c => c.GetDimensionsAsync(It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(new MediaDimensions { Width = width, Height = height });

        return mock;
    }

    private static Mock<ICloudinaryService> CloudinaryFindingNothing()
    {
        var mock = ServiceFactory.CloudinaryMock();

        mock.Setup(c => c.GetDimensionsAsync(It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(new MediaDimensions());

        return mock;
    }

    [Fact]
    public async Task Fills_in_the_missing_dimensions()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        db.AddPhoto(post.Id, sortOrder: 0);
        db.AddPhoto(post.Id, sortOrder: 1);

        var result = await ServiceFactory
            .Photos(db, CloudinaryReturning(5472, 3648))
            .BackfillDimensionsAsync(50);

        result.Updated.Should().Be(2);
        result.Remaining.Should().Be(0);

        db.Context.Photos.Should().OnlyContain(
            p => p.Width == 5472 && p.Height == 3648);
    }

    [Fact]
    public async Task Leaves_photos_that_already_have_dimensions_alone()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var known = db.AddPhoto(post.Id, sortOrder: 0);
        known.Width = 1920;
        known.Height = 1080;
        db.Context.SaveChanges();

        db.AddPhoto(post.Id, sortOrder: 1);

        var cloudinary = CloudinaryReturning(5472, 3648);
        var result = await ServiceFactory.Photos(db, cloudinary)
            .BackfillDimensionsAsync(50);

        // One row scanned, not two — and no wasted Admin API call on the row
        // that was already fine.
        result.Scanned.Should().Be(1);
        result.Updated.Should().Be(1);

        cloudinary.Verify(
            c => c.GetDimensionsAsync(It.IsAny<string>(), It.IsAny<bool>()),
            Times.Once);

        db.Context.Photos.Single(p => p.Id == known.Id)
            .Width.Should().Be(1920);
    }

    [Fact]
    public async Task Running_it_again_does_nothing()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        db.AddPhoto(post.Id);

        var service = ServiceFactory.Photos(db, CloudinaryReturning(4000, 3000));
        await service.BackfillDimensionsAsync(50);

        var second = await service.BackfillDimensionsAsync(50);

        second.Scanned.Should().Be(0);
        second.Updated.Should().Be(0);
        second.Remaining.Should().Be(0);
    }

    [Fact]
    public async Task Counts_an_asset_Cloudinary_cannot_find_as_failed()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        db.AddPhoto(post.Id);

        var result = await ServiceFactory
            .Photos(db, CloudinaryFindingNothing())
            .BackfillDimensionsAsync(50);

        result.Scanned.Should().Be(1);
        result.Updated.Should().Be(0);
        result.Failed.Should().Be(1);
        // Still outstanding, so a Remaining that never falls is the signal
        // that a row points at a deleted asset.
        result.Remaining.Should().Be(1);
    }

    [Fact]
    public async Task One_missing_asset_does_not_abandon_the_rest_of_the_batch()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var broken = db.AddPhoto(post.Id, sortOrder: 0);
        db.AddPhoto(post.Id, sortOrder: 1);
        db.AddPhoto(post.Id, sortOrder: 2);

        var cloudinary = ServiceFactory.CloudinaryMock();
        cloudinary
            .Setup(c => c.GetDimensionsAsync(It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(new MediaDimensions { Width = 3000, Height = 2000 });
        cloudinary
            .Setup(c => c.GetDimensionsAsync(broken.PublicId, It.IsAny<bool>()))
            .ReturnsAsync(new MediaDimensions());

        var result = await ServiceFactory.Photos(db, cloudinary)
            .BackfillDimensionsAsync(50);

        result.Updated.Should().Be(2);
        result.Failed.Should().Be(1);
    }

    [Fact]
    public async Task Batches_so_the_rate_limited_admin_api_is_not_hammered()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        for (var i = 0; i < 10; i++) db.AddPhoto(post.Id, sortOrder: i);

        var result = await ServiceFactory
            .Photos(db, CloudinaryReturning(3000, 2000))
            .BackfillDimensionsAsync(4);

        result.Scanned.Should().Be(4);
        result.Updated.Should().Be(4);
        result.Remaining.Should().Be(6);
    }

    [Fact]
    public async Task Asks_Cloudinary_for_the_video_resource_type_for_videos()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        db.AddPhoto(post.Id, type: MediaType.Video);

        var cloudinary = CloudinaryReturning(1920, 1080);
        await ServiceFactory.Photos(db, cloudinary).BackfillDimensionsAsync(10);

        // Images and videos live in separate Cloudinary namespaces; asking for
        // the wrong one returns nothing at all.
        cloudinary.Verify(
            c => c.GetDimensionsAsync(It.IsAny<string>(), true), Times.Once);
    }

    [Fact]
    public async Task Reports_how_much_of_the_library_still_needs_it()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var done = db.AddPhoto(post.Id, sortOrder: 0);
        done.Width = 800;
        done.Height = 600;
        db.Context.SaveChanges();

        db.AddPhoto(post.Id, sortOrder: 1);
        db.AddPhoto(post.Id, sortOrder: 2);

        var status = await ServiceFactory.Photos(db).GetDimensionStatusAsync();

        status.Missing.Should().Be(2);
        status.Total.Should().Be(3);
    }

    [Fact]
    public async Task Treats_a_half_filled_row_as_still_missing()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var partial = db.AddPhoto(post.Id);
        partial.Width = 4000;   // height never made it
        db.Context.SaveChanges();

        var result = await ServiceFactory
            .Photos(db, CloudinaryReturning(4000, 2250))
            .BackfillDimensionsAsync(10);

        result.Updated.Should().Be(1);
        db.Context.Photos.Single().Height.Should().Be(2250);
    }
}
