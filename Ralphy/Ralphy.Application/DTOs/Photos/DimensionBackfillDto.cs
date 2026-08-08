namespace Ralphy.Application.DTOs.Photos
{
    /// <summary>Outcome of one backfill batch.</summary>
    public class DimensionBackfillDto
    {
        /// <summary>Rows read from the database this run.</summary>
        public int Scanned { get; set; }

        /// <summary>Rows that now carry width and height.</summary>
        public int Updated { get; set; }

        /// <summary>
        /// Rows Cloudinary had nothing for — usually an asset deleted from the
        /// media library while the database row survived. These are re-attempted
        /// on the next run, so a non-zero value that never falls is the signal
        /// that some rows need clearing out by hand.
        /// </summary>
        public int Failed { get; set; }

        /// <summary>Rows still missing dimensions after this batch.</summary>
        public int Remaining { get; set; }
    }

    /// <summary>How much of the library predates dimension recording.</summary>
    public class DimensionStatusDto
    {
        public int Missing { get; set; }
        public int Total { get; set; }
    }
}
