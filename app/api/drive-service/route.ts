// app/api/drive-service/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { drive_v3 } from "googleapis";
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
import { authOptions } from "@/lib/auth";

// Initialize Google Auth with service account from environment variables
function getServiceAccountAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

async function listFoldersSharedBy(email: string) {
  const auth = getServiceAccountAuth();
  const drive = google.drive({ version: "v3", auth });

  const folders: {
    id: string;
    name: string;
    imageCount: number;
    imageCountTruncated?: string;
    hasSubfolders: boolean;
  }[] = [];

  let pageToken: string | null = null;

  do {
    // Correctly type the response
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and sharedWithMe",
      fields: "nextPageToken, files(id, name, owners, permissions)",
      pageSize: 1000,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const data: drive_v3.Schema$FileList = res.data; // ✅ only .data is Schema$FileList

    for (const file of data.files || []) {
      const ownerMatch = file.owners?.some(
        (o: drive_v3.Schema$User) =>
          o.emailAddress?.toLowerCase() === email.toLowerCase()
      );
      const permissionMatch = file.permissions?.some(
        (p: drive_v3.Schema$Permission) =>
          p.emailAddress?.toLowerCase() === email.toLowerCase()
      );

      if (ownerMatch || permissionMatch) {
        const imageCountResult = await getFolderImageCount(drive, file.id!);
        folders.push({
          id: file.id!,
          name: file.name!,
          imageCount: imageCountResult.count,
          imageCountTruncated: imageCountResult.hasMore ? `${imageCountResult.count}+` : undefined,
          hasSubfolders: await hasFolderSubfolders(drive, file.id!),
        });
      }
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return folders;
}

async function getFolderImageCount(drive: any, folderId: string): Promise<{ count: number; hasMore: boolean }> {
  try {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
    const mimeTypeQuery = imageTypes.map(type => `mimeType='${type}'`).join(' or ');
    
    let totalCount = 0;
    let pageToken: string | null = null;
    const maxCount = 1000; // Stop counting after 1000 to avoid performance issues
    
    do {
      const response: any = await drive.files.list({
        q: `'${folderId}' in parents and (${mimeTypeQuery}) and trashed=false`,
        fields: 'nextPageToken, files(id)',
        pageSize: 1000,
        pageToken: pageToken || undefined,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const fileCount = response.data.files?.length || 0;
      totalCount += fileCount;
      
      // If we've reached our max count limit, return with a flag
      if (totalCount >= maxCount) {
        return { count: maxCount, hasMore: true };
      }
      
      pageToken = response.data.nextPageToken || null;
      
      // If we got less than the page size, we've reached the end
      if (fileCount < 1000) {
        break;
      }
    } while (pageToken && totalCount < maxCount);

    return { count: totalCount, hasMore: false };
  } catch (error) {
    console.error(`Error counting images in folder ${folderId}:`, error);
    return { count: 0, hasMore: false };
  }
}

async function hasFolderSubfolders(drive: any, folderId: string) {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return (response.data.files?.length || 0) > 0;
  } catch (error) {
    console.error(`Error checking subfolders in folder ${folderId}:`, error);
    return false;
  }
}

async function getFolderContents(folderId: string, type: 'folders' | 'images'): Promise<any> {
  const auth = getServiceAccountAuth();
  const drive = google.drive({ version: 'v3', auth });

  let query = `'${folderId}' in parents and trashed=false`;
  
  if (type === 'folders') {
    query += " and mimeType='application/vnd.google-apps.folder'";
    
    // For folders, return full metadata since it's used in UI
    const response: any = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, parents)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return response.data.files || [];
    
  } else if (type === 'images') {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
    const mimeTypeQuery = imageTypes.map(type => `mimeType='${type}'`).join(' or ');
    query += ` and (${mimeTypeQuery})`;

    // For images, only count them - don't return metadata
    let totalCount = 0;
    let pageToken: string | null = null;
    const maxCount = 1000; // Stop counting after 1000 for performance

    do {
      const response: any = await drive.files.list({
        q: query,
        fields: 'nextPageToken, files(id)', // Only get ID to count, no other metadata
        pageSize: 1000,
        pageToken: pageToken || undefined,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const fileCount = response.data.files?.length || 0;
      totalCount += fileCount;
      
      // Stop if we've reached our limit
      if (totalCount >= maxCount) {
        return {
          count: maxCount,
          hasMore: true
        };
      }
      
      pageToken = response.data.nextPageToken || null;
      
      // If we got less than the page size, we've reached the end
      if (fileCount < 1000) {
        break;
      }
    } while (pageToken);

    return {
      count: totalCount,
      hasMore: false
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log("session", session)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const folderId = searchParams.get('folderId');
    const type = searchParams.get('type');

    switch (action) {
      case 'list-folders':
        const folders = await listFoldersSharedBy(session.user.email);
        return NextResponse.json({ folders });

      case 'get-folder-contents':
        if (!folderId || !type) {
          return NextResponse.json({ error: 'folderId and type are required' }, { status: 400 });
        }
        const contents = await getFolderContents(folderId, type as 'folders' | 'images');
        return NextResponse.json({ files: contents });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in drive-service API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'refresh-folders':
        const folders = await listFoldersSharedBy(session.user.email);
        return NextResponse.json({ folders });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in drive-service API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}