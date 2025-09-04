import { NextRequest, NextResponse } from "next/server";
import { Pool, PoolClient } from "pg";
import { getToken } from "next-auth/jwt";

// Type definitions
interface MergeRequest {
  merge_person_id: string;
  merge_into_person_id: string;
}

interface PersonCheckResult {
  merge_person_count: string;
  target_person_count: string;
}

interface MergeDetails {
  merge_person_id: string;
  merge_into_person_id: string;
  faces_updated: number;
  totalImages: number;
  similar_faces_deleted_as_main: number;
  similar_faces_deleted_as_similar: number;
  duplicate_similar_faces_removed: number;
  self_references_removed: number;
  person_deleted: boolean;
}

interface MergeResponse {
  success: boolean;
  message: string;
  details: MergeDetails;
}

interface ErrorResponse {
  error: string;
  message?: string;
}

interface PreviewRow {
  type: string;
  person_id: string;
  face_count: string;
}

interface PreviewResponse {
  merge_person_id: string;
  merge_into_person_id: string;
  preview: PreviewRow[];
}

const pool = new Pool({
  connectionString: process.env.DATABASE,
});

export async function POST(req: NextRequest): Promise<NextResponse<MergeResponse | ErrorResponse>> {
    //   const token = await getToken({ req, secret: process.env.JWT_SECRET });
    // if (!token) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
  try {
    const body: MergeRequest = await req.json();
    const { merge_person_id, merge_into_person_id } = body;

    // Validate required fields
    if (!merge_person_id || !merge_into_person_id) {
      return NextResponse.json(
        { error: "Both merge_person_id and merge_into_person_id are required" },
        { status: 400 }
      );
    }

    // Validate that the person IDs are different
    if (merge_person_id === merge_into_person_id) {
      return NextResponse.json(
        { error: "Cannot merge person into themselves" },
        { status: 400 }
      );
    }

    const client: PoolClient = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Step 1: Check if both persons exist
      const personCheckQuery = `
        SELECT 
          COUNT(CASE WHEN person_id = $1::uuid THEN 1 END) as merge_person_count,
          COUNT(CASE WHEN person_id = $2::uuid THEN 1 END) as target_person_count
        FROM faces
        WHERE person_id IN ($1::uuid, $2::uuid)
      `;
      
      const personCheckResult = await client.query(personCheckQuery, [merge_person_id, merge_into_person_id]);
      const { merge_person_count, target_person_count }: PersonCheckResult = personCheckResult.rows[0];

      if (parseInt(merge_person_count) === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Person to merge (${merge_person_id}) not found` },
          { status: 404 }
        );
      }

      if (parseInt(target_person_count) === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Target person (${merge_into_person_id}) not found` },
          { status: 404 }
        );
      }

      // Step 2: Update faces table - change merge_person_id to merge_into_person_id
      const updateFacesQuery = `
        UPDATE faces 
        SET person_id = $2::uuid
        WHERE person_id = $1::uuid
      `;
      
      const updateFacesResult = await client.query(updateFacesQuery, [merge_person_id, merge_into_person_id]);
      
      const updatedFacesCount: number = updateFacesResult.rowCount || 0;

      // Step 3: Handle persons table - merge image_ids arrays
      // First, get the image_ids from the person being merged
      const getPersonsQuery = `
          SELECT id, image_ids, thumbnail, quality_score
          FROM persons
          WHERE id IN ($1::uuid, $2::uuid)
        `;

        const personsResult = await client.query(getPersonsQuery, [merge_person_id, merge_into_person_id]);

        // Extract both records
        const mergePerson = personsResult.rows.find(r => r.id === merge_person_id);
        const targetPerson = personsResult.rows.find(r => r.id === merge_into_person_id);

        // Merge image_ids
        // const mergedImageIds = [
        //   ...(targetPerson?.image_ids || []),
        //   ...(mergePerson?.image_ids || [])
        // ];

        // // Deduplicate UUIDs
        // const dedupedImageIds = [...new Set(mergedImageIds.map((id: string) => id.toString()))];
        // const mergedImageIdsCount = (mergePerson?.image_ids?.length || 0);
        const totalImages = targetPerson?.total_images + mergePerson?.total_images
        // Decide thumbnail based on higher quality_score
        let newThumbnail = targetPerson?.thumbnail;
        let newQualityScore = targetPerson?.quality_score;

        if ((mergePerson?.quality_score || 0) > (targetPerson?.quality_score || 0)) {
          newThumbnail = mergePerson?.thumbnail;
          newQualityScore = mergePerson?.quality_score;
        }

        // Update target person
        const updateTargetPersonQuery = `
          UPDATE persons
          SET totalImages = $2,
              thumbnail = $3,
              quality_score = $4
          WHERE id = $1::uuid
        `;

        await client.query(updateTargetPersonQuery, [
          merge_into_person_id,
          totalImages,
          newThumbnail,
          newQualityScore
        ]);

      // Delete the person being merged from persons table
      const deleteFromPersonsQuery = `
        DELETE FROM persons 
        WHERE id = $1::uuid
      `;
      
      const deleteFromPersonsResult = await client.query(deleteFromPersonsQuery, [merge_person_id]);
      const personDeleted = (deleteFromPersonsResult.rowCount || 0) > 0;

      // Step 4: Handle similar_faces table cleanup
      // Delete records where merge_person_id appears as main person
      const deleteSimilarAsMainQuery = `
        DELETE FROM similar_faces 
        WHERE person_id = $1
      `;
      
      const deleteSimilarAsMainResult = await client.query(deleteSimilarAsMainQuery, [merge_person_id]);
      const deletedAsMainCount: number = deleteSimilarAsMainResult.rowCount || 0;

      // Delete records where merge_person_id appears as similar person
      const deleteSimilarAsSimilarQuery = `
        DELETE FROM similar_faces 
        WHERE similar_person_id = $1
      `;
      
      const deleteSimilarAsSimilarResult = await client.query(deleteSimilarAsSimilarQuery, [merge_person_id]);
      const deletedAsSimilarCount: number = deleteSimilarAsSimilarResult.rowCount || 0;

      // Step 5: Remove any potential duplicate similar_faces entries that might have been created
      // (e.g., if there were entries like person_A -> person_B and person_A -> person_C, 
      // and now both person_B and person_C point to the same merged person)
      const deduplicateQuery = `
        DELETE FROM similar_faces s1
        WHERE EXISTS (
          SELECT 1 FROM similar_faces s2
          WHERE s1.person_id = s2.person_id 
            AND s1.similar_person_id = s2.similar_person_id
            AND s1.ctid > s2.ctid
        )
      `;
      
      const deduplicateResult = await client.query(deduplicateQuery);
      const deduplicatedCount: number = deduplicateResult.rowCount || 0;

      // Step 6: Remove self-references (person similar to themselves)
      const removeSelfRefQuery = `
        DELETE FROM similar_faces 
        WHERE person_id = similar_person_id
      `;
      
      const removeSelfRefResult = await client.query(removeSelfRefQuery);
      const removedSelfRefsCount: number = removeSelfRefResult.rowCount || 0;

      // Commit transaction
      await client.query('COMMIT');

      // Return success response with operation details
      return NextResponse.json<MergeResponse>({
        success: true,
        message: "Persons merged successfully",
        details: {
          merge_person_id,
          merge_into_person_id,
          faces_updated: updatedFacesCount,
          totalImages: totalImages,
          similar_faces_deleted_as_main: deletedAsMainCount,
          similar_faces_deleted_as_similar: deletedAsSimilarCount,
          duplicate_similar_faces_removed: deduplicatedCount,
          self_references_removed: removedSelfRefsCount,
          person_deleted: personDeleted
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error("Error merging persons:", error);
    
    // Handle specific database errors
    if (error?.code === '23505') { // Unique constraint violation
      return NextResponse.json<ErrorResponse>(
        { error: "Constraint violation during merge operation" },
        { status: 409 }
      );
    }
    
    if (error?.code === '23503') { // Foreign key constraint violation
      return NextResponse.json<ErrorResponse>(
        { error: "Foreign key constraint violation" },
        { status: 409 }
      );
    }

    return NextResponse.json<ErrorResponse>(
      { 
        error: "Internal Server Error",
        message: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET method to check merge feasibility
export async function GET(req: NextRequest): Promise<NextResponse<PreviewResponse | ErrorResponse>> {
    //   const token = await getToken({ req, secret: process.env.JWT_SECRET });
    // if (!token) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
  try {
    const { searchParams } = new URL(req.url);
    const merge_person_id: string | null = searchParams.get('merge_person_id');
    const merge_into_person_id: string | null = searchParams.get('merge_into_person_id');

    if (!merge_person_id || !merge_into_person_id) {
      return NextResponse.json<ErrorResponse>(
        { error: "Both merge_person_id and merge_into_person_id query parameters are required" },
        { status: 400 }
      );
    }

    const client: PoolClient = await pool.connect();

    try {
      const previewQuery = `
        SELECT 
          'merge_person' as type,
          person_id,
          COUNT(*) as face_count
        FROM faces
        WHERE person_id = $1::uuid
        GROUP BY person_id
        
        UNION ALL
        
        SELECT 
          'target_person' as type,
          person_id,
          COUNT(*) as face_count
        FROM faces
        WHERE person_id = $2::uuid
        GROUP BY person_id
        
        UNION ALL
        
        SELECT 
          'similar_as_main' as type,
          person_id,
          COUNT(*) as face_count
        FROM similar_faces
        WHERE person_id = $1::uuid
        GROUP BY person_id
        
        UNION ALL
        
        SELECT 
          'similar_as_similar' as type,
          similar_person_id as person_id,
          COUNT(*) as face_count
        FROM similar_faces
        WHERE similar_person_id = $1::uuid
        GROUP BY similar_person_id
      `;

      const result = await client.query(previewQuery, [merge_person_id, merge_into_person_id]);
      
      return NextResponse.json<PreviewResponse>({
        merge_person_id,
        merge_into_person_id,
        preview: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error("Error previewing merge:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}