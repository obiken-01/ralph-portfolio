using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ralphy.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeLogDuration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Duration",
                table: "TimeLogs",
                type: "numeric(5,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Duration",
                table: "TimeLogs");
        }
    }
}
