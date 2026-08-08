using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ralphy.Infrastructure.Migrations
{
    /// <summary>
    /// Moves ownership and location off Trip and onto Post, and gives Photo the
    /// metadata a gallery needs.
    ///
    /// The order below is not cosmetic. You cannot add a NOT NULL FK to a table
    /// that already has rows, and Location.TripId is non-nullable today, so the
    /// placeholder row has no trip to point at. So: add the columns nullable,
    /// drop Location.TripId, backfill, and only then tighten to NOT NULL.
    /// </summary>
    public partial class PhotoFirstSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Loosen the Trip couplings ─────────────────────────────
            migrationBuilder.DropForeignKey(
                name: "FK_Locations_Trips_TripId",
                table: "Locations");

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Trips_TripId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Photos_PostId",
                table: "Photos");

            migrationBuilder.DropIndex(
                name: "IX_Locations_TripId",
                table: "Locations");

            // Must happen before the placeholder insert below — the column is
            // non-nullable and the placeholder belongs to no trip.
            migrationBuilder.DropColumn(
                name: "TripId",
                table: "Locations");

            migrationBuilder.AlterColumn<int>(
                name: "TripId",
                table: "Posts",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            // Decision #3 — a photo-first post needs no prose.
            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Posts",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            // ── 2. Add the new columns, nullable for now ─────────────────
            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "Posts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Posts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TakenAt",
                table: "Posts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Height",
                table: "Photos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Photos",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Photos",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Photos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "TakenAt",
                table: "Photos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Width",
                table: "Photos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPlaceholder",
                table: "Locations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // ── 3. Backfill ──────────────────────────────────────────────
            // Ownership inherits from the trip the post used to hang off.
            migrationBuilder.Sql("""
                UPDATE "Posts" p
                SET "UserId" = t."UserId"
                FROM "Trips" t
                WHERE p."TripId" = t."Id";
                """);

            // A post whose trip vanished, or a row that predates the FK, would
            // otherwise block the NOT NULL below. Fall back to the oldest user.
            migrationBuilder.Sql("""
                UPDATE "Posts"
                SET "UserId" = (SELECT MIN("Id") FROM "Users")
                WHERE "UserId" IS NULL
                  AND EXISTS (SELECT 1 FROM "Users");
                """);

            // Blanket backfill onto one placeholder, chosen over
            // inherit-when-unambiguous for migration simplicity. The tradeoff is
            // that trips with correct locations lose them and get re-entered by
            // hand — AdminPostsPage's "needs location" filter is the cleanup UI.
            //
            // 13.2000°N, 120.3000°E — ~30 km west of Mamburao in the Mindoro
            // Strait. Round numbers on purpose so a placeholder is obvious at a
            // glance, and clear of Apo Reef (12.67°N, 120.45°E) so it isn't
            // mistaken for a real dive site.
            migrationBuilder.Sql("""
                INSERT INTO "Locations"
                    ("PlaceName", "Latitude", "Longitude", "Description",
                     "IsPlaceholder", "CreatedAt")
                SELECT 'West Philippine Sea', 13.2, 120.3,
                       'Placeholder — needs a real location', TRUE, NOW()
                WHERE EXISTS (SELECT 1 FROM "Posts")
                  AND NOT EXISTS (
                      SELECT 1 FROM "Locations" WHERE "IsPlaceholder" = TRUE);
                """);

            migrationBuilder.Sql("""
                UPDATE "Posts"
                SET "LocationId" = (
                    SELECT "Id" FROM "Locations"
                    WHERE "IsPlaceholder" = TRUE
                    ORDER BY "Id" LIMIT 1)
                WHERE "LocationId" IS NULL;
                """);

            // Existing photos have no sort order; creation order is the closest
            // thing to the order they were meant to appear in.
            migrationBuilder.Sql("""
                UPDATE "Photos" ph
                SET "SortOrder" = ranked.rn - 1
                FROM (
                    SELECT "Id",
                           ROW_NUMBER() OVER (
                               PARTITION BY "PostId"
                               ORDER BY "CreatedAt", "Id") AS rn
                    FROM "Photos"
                ) ranked
                WHERE ph."Id" = ranked."Id";
                """);

            // ── 4. Tighten to NOT NULL ───────────────────────────────────
            // Raw SQL rather than AlterColumn on purpose. For a non-nullable
            // int, EF always emits `UPDATE ... SET col = 0 WHERE col IS NULL`
            // followed by a permanent `SET DEFAULT 0` — and 0 is not a valid
            // Location or User id, so it would quietly trade a loud failure
            // here for a broken foreign key one statement later.
            //
            // Postgres refuses SET NOT NULL on a column that still holds nulls,
            // which is exactly the behaviour we want if the backfill missed a
            // row: the migration stops rather than inventing data.
            migrationBuilder.Sql("""
                ALTER TABLE "Posts" ALTER COLUMN "LocationId" SET NOT NULL;
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Posts" ALTER COLUMN "UserId" SET NOT NULL;
                """);

            // ── 5. Indexes and foreign keys ──────────────────────────────
            migrationBuilder.CreateIndex(
                name: "IX_Posts_LocationId",
                table: "Posts",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_UserId",
                table: "Posts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_PostId_SortOrder",
                table: "Photos",
                columns: new[] { "PostId", "SortOrder" });

            // Restrict, not Cascade: many posts share one place, so deleting a
            // place must never cascade-delete everything pinned to it.
            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Locations_LocationId",
                table: "Posts",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // SetNull rather than Cascade — dropping Trips in Phase 3 must not
            // take every post (and via Post→Photos, every photo) with it.
            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Trips_TripId",
                table: "Posts",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Users_UserId",
                table: "Posts",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Locations_LocationId",
                table: "Posts");

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Trips_TripId",
                table: "Posts");

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Users_UserId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_LocationId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_UserId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Photos_PostId_SortOrder",
                table: "Photos");

            // Drop the seeded placeholder before the flag column goes with it.
            migrationBuilder.Sql("""
                DELETE FROM "Locations" WHERE "IsPlaceholder" = TRUE;
                """);

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "TakenAt",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "Height",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "TakenAt",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "IsPlaceholder",
                table: "Locations");

            // Posts orphaned by the SetNull FK cannot be restored to a trip;
            // point them at the oldest one so the NOT NULL below holds.
            migrationBuilder.Sql("""
                UPDATE "Posts"
                SET "TripId" = (SELECT MIN("Id") FROM "Trips")
                WHERE "TripId" IS NULL
                  AND EXISTS (SELECT 1 FROM "Trips");
                """);

            migrationBuilder.AlterColumn<int>(
                name: "TripId",
                table: "Posts",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.Sql("""
                UPDATE "Posts" SET "Content" = '' WHERE "Content" IS NULL;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Posts",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            // Locations lost their trip on the way up; there is nothing to
            // restore them to, so every row lands on the oldest trip.
            migrationBuilder.AddColumn<int>(
                name: "TripId",
                table: "Locations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("""
                UPDATE "Locations"
                SET "TripId" = (SELECT MIN("Id") FROM "Trips")
                WHERE EXISTS (SELECT 1 FROM "Trips");
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Photos_PostId",
                table: "Photos",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_TripId",
                table: "Locations",
                column: "TripId");

            migrationBuilder.AddForeignKey(
                name: "FK_Locations_Trips_TripId",
                table: "Locations",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Trips_TripId",
                table: "Posts",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
