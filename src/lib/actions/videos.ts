'use server';

import { QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '@/lib/aws/dynamo-client';

export interface VideoItem {
  videoId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  hlsUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

export async function getVideo(videoId: string): Promise<VideoItem | null> {
  const TABLE_NAME = process.env.DYNAMODB_TABLE;
  if (!TABLE_NAME) {
    console.error('DYNAMODB_TABLE env var not set');
    return null;
  }
  try {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `VIDEO#${videoId}`, SK: 'META' },
      }),
    );

    if (!result.Item) return null;
    return mapItem(result.Item);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('getVideo error:', message);
    return null;
  }
}

export async function listVideos(limit: number = 20): Promise<VideoItem[]> {
  const TABLE_NAME = process.env.DYNAMODB_TABLE;
  if (!TABLE_NAME) {
    console.error('DYNAMODB_TABLE env var not set');
    return [];
  }
  try {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI-AllVideos',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': 'VIDEO' },
        ScanIndexForward: false, // newest first
        Limit: limit,
      }),
    );

    return (result.Items ?? []).map(mapItem);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('listVideos error:', message);
    return [];
  }
}

function mapItem(item: Record<string, unknown>): VideoItem {
  const CF_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? '';
  const hlsKey = item.hlsManifestKey as string | undefined;
  const thumbKey = item.thumbnailKey as string | undefined;

  return {
    videoId: item.videoId as string,
    fileName: item.fileName as string,
    fileType: (item.fileType as string) ?? '',
    fileSize: (item.fileSize as number) ?? 0,
    status: item.status as string,
    hlsUrl: hlsKey && CF_DOMAIN ? `https://${CF_DOMAIN}/${hlsKey}` : null,
    thumbnailUrl: thumbKey && CF_DOMAIN ? `https://${CF_DOMAIN}/${thumbKey}` : null,
    createdAt: item.createdAt as string,
  };
}
