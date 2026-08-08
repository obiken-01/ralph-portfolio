using FluentAssertions;
using Ralphy.Application.DTOs.Comments;
using Ralphy.Application.DTOs.Photos;
using Ralphy.Application.DTOs.Posts;
using Ralphy.Application.DTOs.Tags;
using Ralphy.Domain.Enums;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// The highest-value suite in v2.0. Ownership used to resolve through
/// `post → trip → trip.UserId`; it now resolves through `post.UserId`. A silent
/// regression here means one logged-in user can edit another's posts, and
/// nothing on screen would say so.
///
/// Every rewritten call site gets the same three questions: does the owner get
/// through, is a stranger refused, and does a missing row say so plainly.
/// </summary>
public class OwnershipTests
{
    // ── PostService ──────────────────────────────────────────────────

    [Fact]
    public async Task UpdatePost_allows_the_owner()
    {
        using var db = new TestDb();
        var post = db.AddPost(title: "Before");

        var result = await ServiceFactory.Posts(db).UpdateAsync(
            post.Id,
            new UpdatePostDto { Title = "After", LocationId = 1 },
            TestDb.OwnerId);

        result.Title.Should().Be("After");
    }

    [Fact]
    public async Task UpdatePost_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Posts(db).UpdateAsync(
            post.Id,
            new UpdatePostDto { Title = "Hijacked", LocationId = 1 },
            TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdatePost_reports_a_missing_post()
    {
        using var db = new TestDb();

        var act = () => ServiceFactory.Posts(db).UpdateAsync(
            9999,
            new UpdatePostDto { Title = "x", LocationId = 1 },
            TestDb.OwnerId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeletePost_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Posts(db)
            .DeleteAsync(post.Id, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        db.Context.Posts.Should().ContainSingle();
    }

    [Fact]
    public async Task PublishPost_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Posts(db)
            .PublishAsync(post.Id, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task PublishPost_allows_the_owner_and_stamps_PublishedAt()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        await ServiceFactory.Posts(db).PublishAsync(post.Id, TestDb.OwnerId);

        var saved = db.Context.Posts.Single();
        saved.Status.Should().Be(PostStatus.Published);
        saved.PublishedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UnpublishPost_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost(status: PostStatus.Published);

        var act = () => ServiceFactory.Posts(db)
            .UnpublishAsync(post.Id, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── PostService.CreateAsync — the non-mechanical one ─────────────

    [Fact]
    public async Task CreatePost_takes_ownership_from_the_caller()
    {
        using var db = new TestDb();

        var created = await ServiceFactory.Posts(db).CreateAsync(
            new CreatePostDto { Title = "Mine", LocationId = 1 },
            TestDb.OtherUserId);

        // Whoever is holding the token owns the result — there is no trip to
        // authorize against on create.
        db.Context.Posts.Single(p => p.Id == created.Id)
            .UserId.Should().Be(TestDb.OtherUserId);
    }

    [Fact]
    public async Task CreatePost_rejects_a_location_that_does_not_exist()
    {
        using var db = new TestDb();

        var act = () => ServiceFactory.Posts(db).CreateAsync(
            new CreatePostDto { Title = "Nowhere", LocationId = 9999 },
            TestDb.OwnerId);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── PhotoService ─────────────────────────────────────────────────

    [Fact]
    public async Task UploadPhoto_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Photos(db).UploadPhotoAsync(
            ServiceFactory.FakeImage(), post.Id, null, null, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task DeletePhoto_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photo = db.AddPhoto(post.Id);

        var act = () => ServiceFactory.Photos(db)
            .DeleteAsync(photo.Id, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        db.Context.Photos.Should().ContainSingle();
    }

    [Fact]
    public async Task UpdatePhotoCaption_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var photo = db.AddPhoto(post.Id);

        var act = () => ServiceFactory.Photos(db).UpdateAsync(
            photo.Id, new UpdatePhotoDto { Caption = "nope" },
            TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task ReorderPhotos_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var a = db.AddPhoto(post.Id, sortOrder: 0);
        var b = db.AddPhoto(post.Id, sortOrder: 1);

        var act = () => ServiceFactory.Photos(db).ReorderAsync(
            post.Id,
            new ReorderPhotosDto { PhotoIds = new List<int> { b.Id, a.Id } },
            TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── VideoService ─────────────────────────────────────────────────

    [Fact]
    public async Task DeleteVideo_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        var video = db.AddPhoto(post.Id, type: MediaType.Video);

        var act = () => ServiceFactory.Videos(db)
            .DeleteAsync(video.Id, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UploadVideo_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Videos(db).UploadVideoAsync(
            ServiceFactory.FakeImage("clip.mp4"), post.Id, null, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── CommentService ───────────────────────────────────────────────

    [Fact]
    public async Task DeleteComment_allows_the_post_owner()
    {
        using var db = new TestDb();
        var post = db.AddPost(status: PostStatus.Published);
        var comment = db.AddComment(post.Id);

        await ServiceFactory.Comments(db)
            .DeleteAsync(comment.Id, TestDb.OwnerId);

        db.Context.Comments.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteComment_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost(status: PostStatus.Published);
        var comment = db.AddComment(post.Id);

        var act = () => ServiceFactory.Comments(db)
            .DeleteAsync(comment.Id, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        db.Context.Comments.Should().ContainSingle();
    }

    // ── TagService ───────────────────────────────────────────────────

    [Fact]
    public async Task AssignTags_allows_the_owner()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        await ServiceFactory.Tags(db).AssignTagsToPostAsync(
            post.Id,
            new AssignTagDto { Tags = new List<string> { "Paluan", "falls" } },
            TestDb.OwnerId);

        db.Context.PostTags.Count(pt => pt.PostId == post.Id).Should().Be(2);
    }

    [Fact]
    public async Task AssignTags_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();

        var act = () => ServiceFactory.Tags(db).AssignTagsToPostAsync(
            post.Id,
            new AssignTagDto { Tags = new List<string> { "hijack" } },
            TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        db.Context.PostTags.Should().BeEmpty();
    }

    [Fact]
    public async Task RemoveTags_refuses_a_stranger()
    {
        using var db = new TestDb();
        var post = db.AddPost();
        db.AddTag("paluan", post.Id);

        var act = () => ServiceFactory.Tags(db)
            .RemoveTagsFromPostAsync(post.Id, TestDb.OtherUserId);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        db.Context.PostTags.Should().ContainSingle();
    }
}
