using AutoMapper;
using Ralphy.Application.Mappings;
using Xunit;

namespace Ralphy.Tests;

public class MappingProfileTests
{
    /// <summary>
    /// One assertion that catches every unmapped member added anywhere in the
    /// milestone. Cheap, and it fires the moment a DTO grows a field nobody
    /// wired up — which is the failure mode of the
    /// "add field → DTO → mapping → validator → migration" chain.
    /// </summary>
    [Fact]
    public void Every_mapping_is_fully_configured()
    {
        var configuration = new MapperConfiguration(
            cfg => cfg.AddProfile<MappingProfile>());

        configuration.AssertConfigurationIsValid();
    }
}
