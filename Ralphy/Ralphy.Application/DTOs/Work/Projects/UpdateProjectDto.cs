namespace Ralphy.Application.DTOs.Work.Projects
{
    public class UpdateProjectDto : CreateProjectDto
    {
        public DateOnly? ActualEndDate { get; set; }
        public int DisplayOrder { get; set; }
    }
}
