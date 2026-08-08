using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Ralphy.Infrastructure.Migrations
{
    /// <summary>
    /// The one irreversible step of v2.0. Take a database snapshot before
    /// running it.
    ///
    /// Order matters, and EF happens to get it right here — check it stays that
    /// way if this file is ever regenerated. The foreign key must go before the
    /// table. Post → Trip was Cascade until PhotoFirstSchema relaxed it to
    /// SetNull; with a Cascade FK still in place, DROP TABLE "Trips" would take
    /// every post with it, and since Post → Photos is Cascade, every photo row
    /// as well. Dropping the constraint first makes the table drop inert.
    ///
    /// Trip descriptions are discarded rather than merged into their posts
    /// (settled decision #4). Down() rebuilds the table's shape but cannot
    /// bring the rows back.
    /// </summary>
    public partial class DropTrip : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // First: sever the link, so the table drop cannot reach Posts.
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Trips_TripId",
                table: "Posts");

            migrationBuilder.DropTable(
                name: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Posts_TripId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "TripId",
                table: "Posts");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TripId",
                table: "Posts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Trips",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    Country = table.Column<string>(type: "text", nullable: false),
                    CoverImageUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trips", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Trips_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_TripId",
                table: "Posts",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_UserId",
                table: "Trips",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Trips_TripId",
                table: "Posts",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
