using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Ralphy.Domain.Entities;
using Ralphy.Domain.Entities.Work;
using Ralphy.Domain.Enums;
using Ralphy.Infrastructure.Data;

namespace Ralphy.Tests;

/// <summary>
/// A throwaway SQLite database per test, seeded with two users so every
/// ownership assertion has an owner and an interloper to work with.
///
/// SQLite rather than EF's InMemory provider on purpose: InMemory ignores
/// foreign keys entirely, and the constraints are half of what v2.0 changed.
/// </summary>
public sealed class TestDb : IDisposable
{
    public const int OwnerId = 1;
    public const int OtherUserId = 2;

    // WorkUsers are a different table with its own key sequence, so these
    // deliberately collide with the blog ids above — that overlap is the thing
    // the Work visibility rules have to survive.
    public const int WorkerId = 1;
    public const int OtherWorkerId = 2;

    private readonly SqliteConnection _connection;

    public AppDbContext Context { get; }

    public TestDb()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        Context = new AppDbContext(options);
        Context.Database.EnsureCreated();

        Seed();
    }

    private void Seed()
    {
        Context.Users.AddRange(
            new User
            {
                Id = OwnerId,
                Username = "ralph",
                Email = "ralph@example.com",
                PasswordHash = "x",
                PublicId = Guid.NewGuid(),
            },
            new User
            {
                Id = OtherUserId,
                Username = "someone-else",
                Email = "else@example.com",
                PasswordHash = "x",
                PublicId = Guid.NewGuid(),
            });

        Context.Locations.Add(new Location
        {
            Id = 1,
            PlaceName = "Bugtong Bato Falls",
            Latitude = 11.16,
            Longitude = 122.06,
        });

        Context.WorkUsers.AddRange(
            new WorkUser
            {
                Id = WorkerId,
                Username = "worker",
                Email = "worker@example.com",
                PasswordHash = "x",
                PublicId = Guid.NewGuid(),
            },
            new WorkUser
            {
                Id = OtherWorkerId,
                Username = "other-worker",
                Email = "other-worker@example.com",
                PasswordHash = "x",
                PublicId = Guid.NewGuid(),
            });

        Context.SaveChanges();
    }

    // ── Work module fixtures ─────────────────────────────────────────

    /// <summary>
    /// A project plus its membership rows. The owner is always a member with
    /// Role = Admin, mirroring what ProjectService must do on create — a project
    /// with no members is visible to nobody, including its owner.
    /// </summary>
    public Project AddProject(
        int ownerId = WorkerId,
        string name = "A project",
        params int[] extraMemberIds)
    {
        var project = new Project { Name = name, OwnerUserId = ownerId };
        Context.Projects.Add(project);
        Context.SaveChanges();

        Context.ProjectMembers.Add(new ProjectMember
        {
            ProjectId = project.Id,
            WorkUserId = ownerId,
            Role = ProjectRole.Admin,
        });

        foreach (var memberId in extraMemberIds.Where(id => id != ownerId))
            Context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = project.Id,
                WorkUserId = memberId,
                Role = ProjectRole.Member,
            });

        Context.SaveChanges();
        return project;
    }

    public WorkItem AddWorkItem(
        int createdByUserId = WorkerId,
        int? projectId = null,
        int? assigneeUserId = null,
        WorkItemStatus status = WorkItemStatus.Todo,
        int boardOrder = 0,
        string title = "A task")
    {
        var item = new WorkItem
        {
            Title = title,
            Status = status,
            BoardOrder = boardOrder,
            ProjectId = projectId,
            CreatedByUserId = createdByUserId,
            AssigneeUserId = assigneeUserId,
        };

        Context.WorkItems.Add(item);
        Context.SaveChanges();
        return item;
    }

    public TimeLog AddTimeLog(
        int workUserId = WorkerId,
        int? workItemId = null,
        decimal duration = 1m,
        string description = "Did the thing")
    {
        var log = new TimeLog
        {
            TaskDescription = description,
            Duration = duration,
            LoggedAt = new DateTime(2026, 1, 5, 9, 0, 0, DateTimeKind.Utc),
            WorkUserId = workUserId,
            WorkItemId = workItemId,
        };

        Context.TimeLogs.Add(log);
        Context.SaveChanges();
        return log;
    }

    public Location AddLocation(string name, bool isPlaceholder = false)
    {
        var location = new Location
        {
            PlaceName = name,
            Latitude = 13.2,
            Longitude = 120.3,
            IsPlaceholder = isPlaceholder,
        };

        Context.Locations.Add(location);
        Context.SaveChanges();
        return location;
    }

    public Post AddPost(
        int userId = OwnerId,
        PostStatus status = PostStatus.Draft,
        int locationId = 1,
        string title = "A post")
    {
        var post = new Post
        {
            Title = title,
            UserId = userId,
            LocationId = locationId,
            Status = status,
            PublishedAt = status == PostStatus.Published
                ? DateTime.UtcNow
                : null,
        };

        Context.Posts.Add(post);
        Context.SaveChanges();
        return post;
    }

    public Photo AddPhoto(
        int postId,
        int sortOrder = 0,
        MediaType type = MediaType.Image,
        DateTime? takenAt = null)
    {
        var photo = new Photo
        {
            Url = $"https://res.cloudinary.com/demo/image/upload/p{postId}-{sortOrder}.jpg",
            PublicId = $"p{postId}-{sortOrder}",
            Type = type,
            SortOrder = sortOrder,
            TakenAt = takenAt,
            PostId = postId,
        };

        Context.Photos.Add(photo);
        Context.SaveChanges();
        return photo;
    }

    public Tag AddTag(string name, params int[] postIds)
    {
        var tag = new Tag { Name = name.ToLower().Trim() };
        Context.Tags.Add(tag);
        Context.SaveChanges();

        foreach (var postId in postIds)
            Context.PostTags.Add(new PostTag { PostId = postId, TagId = tag.Id });

        Context.SaveChanges();
        return tag;
    }

    public Comment AddComment(int postId)
    {
        var comment = new Comment
        {
            PostId = postId,
            AuthorName = "A reader",
            Content = "Nice shot",
        };

        Context.Comments.Add(comment);
        Context.SaveChanges();
        return comment;
    }

    /// <summary>
    /// Forgets everything the context is tracking, so the next query behaves
    /// like a fresh HTTP request.
    ///
    /// Without this, seeding and querying share one DbContext and EF's identity
    /// map silently fixes up navigation properties from tracked entities — so a
    /// repository that forgot its Include still returns fully-populated
    /// navigations in tests and empty ones in production. Any test asserting on
    /// eager loading has to call this first or it proves nothing.
    /// </summary>
    public void SimulateNewRequest() => Context.ChangeTracker.Clear();

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}
