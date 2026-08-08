using FluentAssertions;
using Ralphy.Application.DTOs.Locations;
using Ralphy.Domain.Enums;
using Xunit;

namespace Ralphy.Tests;

/// <summary>
/// Location stopped belonging to a trip in v2.0 and became shared reference
/// data. That removes its per-row owner and makes the Restrict FK the thing
/// standing between a careless delete and a table full of orphans.
/// </summary>
public class LocationTests
{
    [Fact]
    public async Task Delete_refuses_while_posts_still_point_at_the_place()
    {
        using var db = new TestDb();
        db.AddPost(locationId: 1);

        var act = () => ServiceFactory.Locations(db).DeleteAsync(1);

        // A sentence, not a DbUpdateException from the Restrict FK.
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*posts*");

        db.Context.Locations.Should().ContainSingle();
    }

    [Fact]
    public async Task Delete_succeeds_once_nothing_references_the_place()
    {
        using var db = new TestDb();
        var unused = db.AddLocation("Somewhere else");

        await ServiceFactory.Locations(db).DeleteAsync(unused.Id);

        db.Context.Locations.Should().ContainSingle()
            .Which.Id.Should().Be(1);
    }

    [Fact]
    public async Task Any_authenticated_admin_may_edit_a_place()
    {
        using var db = new TestDb();

        // No userId parameter to pass — locations have no per-row owner.
        var result = await ServiceFactory.Locations(db).UpdateAsync(
            1,
            new CreateLocationDto
            {
                PlaceName = "Bugtong Bato Falls, Tibiao",
                Latitude = 11.16,
                Longitude = 122.06,
            });

        result.PlaceName.Should().Be("Bugtong Bato Falls, Tibiao");
    }

    [Fact]
    public async Task Editing_the_placeholder_clears_its_flag()
    {
        using var db = new TestDb();
        var placeholder = db.AddLocation("West Philippine Sea", isPlaceholder: true);

        await ServiceFactory.Locations(db).UpdateAsync(
            placeholder.Id,
            new CreateLocationDto
            {
                PlaceName = "Paluan Bay",
                Latitude = 13.42,
                Longitude = 120.46,
            });

        db.Context.Locations.Single(l => l.Id == placeholder.Id)
            .IsPlaceholder.Should().BeFalse();
    }

    [Fact]
    public async Task The_public_map_leaves_out_the_placeholder()
    {
        using var db = new TestDb();
        var placeholder = db.AddLocation("West Philippine Sea", isPlaceholder: true);

        db.AddPost(status: PostStatus.Published, locationId: 1);
        db.AddPost(status: PostStatus.Published, locationId: placeholder.Id);

        var result = await ServiceFactory.Locations(db).GetPublicAsync();

        // Otherwise the live site shows a pin cluster floating in the
        // Mindoro Strait until the cleanup finishes.
        result.Select(l => l.PlaceName)
            .Should().NotContain("West Philippine Sea");
    }

    [Fact]
    public async Task The_public_map_leaves_out_places_with_no_published_posts()
    {
        using var db = new TestDb();
        var draftOnly = db.AddLocation("Draft territory");
        db.AddPost(status: PostStatus.Draft, locationId: draftOnly.Id);

        var result = await ServiceFactory.Locations(db).GetPublicAsync();

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Reports_how_many_published_posts_are_at_each_place()
    {
        using var db = new TestDb();
        var falls = db.AddLocation("Bugtong Bato");

        db.AddPost(status: PostStatus.Published, locationId: falls.Id);
        db.AddPost(status: PostStatus.Published, locationId: falls.Id);
        db.AddPost(status: PostStatus.Draft, locationId: falls.Id);
        db.SimulateNewRequest();

        var result = (await ServiceFactory.Locations(db).GetPublicAsync())
            .Single(l => l.Id == falls.Id);

        // Regression: Where(l => l.Posts.Any(...)) is a SQL EXISTS, so the
        // filter passed while Posts stayed unloaded and every pin on the map
        // reported "0 posts".
        result.PostCount.Should().Be(2);
    }

    [Fact]
    public async Task The_admin_picker_counts_posts_too()
    {
        using var db = new TestDb();
        db.AddPost(status: PostStatus.Published, locationId: 1);
        db.SimulateNewRequest();

        var result = (await ServiceFactory.Locations(db).GetAllAsync())
            .Single(l => l.Id == 1);

        result.PostCount.Should().Be(1);
    }

    [Fact]
    public async Task The_admin_list_keeps_everything_including_the_placeholder()
    {
        using var db = new TestDb();
        db.AddLocation("West Philippine Sea", isPlaceholder: true);

        var result = await ServiceFactory.Locations(db).GetAllAsync();

        // The cleanup list needs to see it, so /locations/all holds nothing back.
        result.Should().HaveCount(2);
        result.Should().ContainSingle(l => l.IsPlaceholder);
    }
}
