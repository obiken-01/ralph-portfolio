using FluentAssertions;
using Ralphy.Application.DTOs.Photos;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Camera, lens and exposure: read from EXIF on upload, correctable by hand
/// afterwards. Decoration, so a bad value from a file is dropped, while a bad
/// value typed into the editor is refused.
/// </summary>
public class PhotoCameraInfoTests
{
    private static CameraInfoDto Lightroom() => new()
    {
        Camera = "Sony ILCE-7M4",
        Lens = "FE 35mm F1.8",
        FNumber = 1.8,
        ExposureTime = 0.004,
        Iso = 200,
        FocalLength = 35,
        EditedWith = "Lightroom",
    };

    [Fact]
    public async Task Upload_stores_the_camera_and_exposure_from_EXIF()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var dto = await ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null,
            new PhotoMetadataDto { Camera = Lightroom() },
            TestDb.OwnerId);

        var saved = db.Context.Photos.Single();
        saved.Camera.Should().Be("Sony ILCE-7M4");
        saved.Lens.Should().Be("FE 35mm F1.8");
        saved.FNumber.Should().Be(1.8);
        saved.ExposureTime.Should().Be(0.004);
        saved.Iso.Should().Be(200);
        saved.FocalLength.Should().Be(35);
        saved.EditedWith.Should().Be("Lightroom");

        dto.Camera.Should().Be("Sony ILCE-7M4");
        dto.EditedWith.Should().Be("Lightroom");
    }

    [Fact]
    public async Task Upload_drops_implausible_values_instead_of_failing()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        await ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null,
            new PhotoMetadataDto
            {
                Camera = new CameraInfoDto
                {
                    Camera = "  Fujifilm X100V  ",
                    Lens = "   ",
                    FNumber = 0,
                    ExposureTime = -1,
                    Iso = 0,
                    FocalLength = double.NaN,
                    EditedWith = new string('x', 500),
                },
            },
            TestDb.OwnerId);

        var saved = db.Context.Photos.Single();
        saved.Camera.Should().Be("Fujifilm X100V");
        saved.Lens.Should().BeNull();
        saved.FNumber.Should().BeNull();
        saved.ExposureTime.Should().BeNull();
        saved.Iso.Should().BeNull();
        saved.FocalLength.Should().BeNull();
        saved.EditedWith.Should().BeNull();
    }

    [Fact]
    public async Task UpdateCamera_replaces_every_field()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photo = db.AddPhoto(post.Id);
        var photos = ServiceFactory.Photos(db);

        await photos.UpdateCameraAsync(photo.Id, Lightroom(), TestDb.OwnerId);

        // A film scan: the scanner is not the camera, and exposure is unknown.
        var result = await photos.UpdateCameraAsync(
            photo.Id,
            new CameraInfoDto { Camera = "Pentax K1000", Lens = "SMC 50mm f/2" },
            TestDb.OwnerId);

        result.Camera.Should().Be("Pentax K1000");
        result.Lens.Should().Be("SMC 50mm f/2");
        result.FNumber.Should().BeNull();
        result.Iso.Should().BeNull();
        result.EditedWith.Should().BeNull();
    }

    [Fact]
    public async Task UpdateCamera_leaves_the_caption_alone()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photo = db.AddPhoto(post.Id);
        var photos = ServiceFactory.Photos(db);
        await photos.UpdateAsync(
            photo.Id, new UpdatePhotoDto { Caption = "Sunrise" }, TestDb.OwnerId);

        await photos.UpdateCameraAsync(photo.Id, Lightroom(), TestDb.OwnerId);

        db.Context.Photos.Single().Caption.Should().Be("Sunrise");
    }

    [Theory]
    [InlineData(0.0, null, null)]       // f/0
    [InlineData(null, -0.5, null)]      // negative shutter
    [InlineData(null, null, 0)]         // ISO 0
    public async Task UpdateCamera_refuses_impossible_values(
        double? fNumber, double? exposure, int? iso)
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photo = db.AddPhoto(post.Id);

        var act = () => ServiceFactory.Photos(db).UpdateCameraAsync(
            photo.Id,
            new CameraInfoDto { FNumber = fNumber, ExposureTime = exposure, Iso = iso },
            TestDb.OwnerId);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UpdateCamera_refuses_an_overlong_name()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photo = db.AddPhoto(post.Id);

        var act = () => ServiceFactory.Photos(db).UpdateCameraAsync(
            photo.Id,
            new CameraInfoDto { Camera = new string('x', 101) },
            TestDb.OwnerId);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UpdateCamera_requires_owning_the_post()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photo = db.AddPhoto(post.Id);

        var act = () => ServiceFactory.Photos(db).UpdateCameraAsync(
            photo.Id, Lightroom(), TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
