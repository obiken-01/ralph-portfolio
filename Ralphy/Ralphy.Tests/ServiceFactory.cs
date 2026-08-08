using AutoMapper;
using Microsoft.AspNetCore.Http;
using Moq;
using Ralphy.Application.Mappings;
using Ralphy.Application.Services;
using Ralphy.Domain.Interfaces;
using Ralphy.Domain.Models;
using Ralphy.Infrastructure.Data;

namespace Ralphy.Tests;

/// <summary>
/// Wires the real services over a test database, with only Cloudinary faked —
/// the point of these tests is the authorization and ordering logic, and that
/// lives in the services, not in a mock of them.
/// </summary>
public static class ServiceFactory
{
    public static IMapper Mapper { get; } =
        new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>())
            .CreateMapper();

    public static IUnitOfWork UnitOfWork(TestDb db) => new UnitOfWork(db.Context);

    public static Mock<ICloudinaryService> CloudinaryMock(
        int width = 4000, int height = 3000)
    {
        var mock = new Mock<ICloudinaryService>();

        mock.Setup(c => c.UploadPhotoAsync(
                It.IsAny<IFormFile>(), It.IsAny<string>(), It.IsAny<string?>()))
            .ReturnsAsync(new CloudinaryUploadResult
            {
                Url = "https://res.cloudinary.com/demo/image/upload/new.jpg",
                PublicId = "new",
                Format = "jpg",
                Width = width,
                Height = height,
                ResourceType = "image",
            });

        mock.Setup(c => c.DeleteMediaAsync(It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(true);

        return mock;
    }

    public static PostService Posts(TestDb db) =>
        new(UnitOfWork(db), Mapper, CloudinaryMock().Object);

    public static PhotoService Photos(
        TestDb db, Mock<ICloudinaryService>? cloudinary = null) =>
        new(UnitOfWork(db), (cloudinary ?? CloudinaryMock()).Object, Mapper);

    public static VideoService Videos(TestDb db) =>
        new(UnitOfWork(db), CloudinaryMock().Object, Mapper);

    public static CommentService Comments(TestDb db) =>
        new(UnitOfWork(db), Mapper);

    public static TagService Tags(TestDb db) =>
        new(UnitOfWork(db), Mapper);

    public static LocationService Locations(TestDb db) =>
        new(UnitOfWork(db), Mapper);

    /// <summary>A one-pixel JPEG, enough to satisfy an IFormFile parameter.</summary>
    public static IFormFile FakeImage(string fileName = "shot.jpg")
    {
        var bytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xD9 };
        var stream = new MemoryStream(bytes);

        return new FormFile(stream, 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/jpeg",
        };
    }
}
