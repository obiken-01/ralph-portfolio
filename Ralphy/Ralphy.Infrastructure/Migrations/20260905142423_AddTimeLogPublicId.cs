using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ralphy.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeLogPublicId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Three steps, not one. The scaffolded version added the column
            // NOT NULL with an all-zero default, which stamps every existing row
            // with the same GUID — and the unique index below then fails to
            // build. So: add it nullable, give each row its own value, and only
            // then constrain.
            migrationBuilder.AddColumn<Guid>(
                name: "PublicId",
                table: "TimeLogs",
                type: "uuid",
                nullable: true);

            // gen_random_uuid() is core in PostgreSQL 13+; the container is 16.
            migrationBuilder.Sql(
                @"UPDATE ""TimeLogs"" SET ""PublicId"" = gen_random_uuid() WHERE ""PublicId"" IS NULL;");

            migrationBuilder.AlterColumn<Guid>(
                name: "PublicId",
                table: "TimeLogs",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimeLogs_PublicId",
                table: "TimeLogs",
                column: "PublicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TimeLogs_PublicId",
                table: "TimeLogs");

            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "TimeLogs");
        }
    }
}
