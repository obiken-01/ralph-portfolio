using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ralphy.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoCameraInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Camera",
                table: "Photos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EditedWith",
                table: "Photos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "ExposureTime",
                table: "Photos",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "FNumber",
                table: "Photos",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "FocalLength",
                table: "Photos",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Iso",
                table: "Photos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Lens",
                table: "Photos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Camera",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "EditedWith",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "ExposureTime",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "FNumber",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "FocalLength",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "Iso",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "Lens",
                table: "Photos");
        }
    }
}
