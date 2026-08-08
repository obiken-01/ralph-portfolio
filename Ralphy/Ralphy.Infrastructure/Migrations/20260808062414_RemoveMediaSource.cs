using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ralphy.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveMediaSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Source",
                table: "Photos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Photos",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
