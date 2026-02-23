import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";

// Cache client to avoid recreating it on every request if possible (in serverless/edge this might reset)
let cachedClient: S3Client | null = null;
let cachedConfig: any = null;

export async function getStorageConfig() {
    if (cachedConfig) return cachedConfig;

    const setting = await prisma.appSetting.findUnique({
        where: { key: "STORAGE_CONFIG" }
    });

    if (!setting?.value) {
        throw new Error("STORAGE_CONFIG not found in database settings");
    }

    cachedConfig = setting.value;
    return cachedConfig;
}

export async function getR2Client() {
    if (cachedClient) return cachedClient;

    const config = await getStorageConfig();

    // The endpoint in config might include the bucket path, but S3Client expects the base service URL
    // e.g. "https://<account>.r2.cloudflarestorage.com/bucket" -> "https://<account>.r2.cloudflarestorage.com"
    let endpoint = config.endpoint;
    if (endpoint && config.bucket_name && endpoint.endsWith(`/${config.bucket_name}`)) {
        endpoint = endpoint.replace(`/${config.bucket_name}`, "");
    }

    cachedClient = new S3Client({
        region: "auto",
        endpoint: endpoint,
        credentials: {
            accessKeyId: config.access_key_id,
            secretAccessKey: config.secret_access_key,
        },
    });

    return cachedClient;
}

/**
 * Uploads a file to R2 bucket
 */
export async function uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string
): Promise<string> {
    const client = await getR2Client();
    const config = await getStorageConfig();

    const command = new PutObjectCommand({
        Bucket: config.bucket_name,
        Key: key,
        Body: body,
        ContentType: contentType,
    });

    await client.send(command);
    return key;
}

/**
 * Deletes a file from R2 bucket
 */
export async function deleteFile(key: string): Promise<void> {
    const client = await getR2Client();
    const config = await getStorageConfig();

    const command = new DeleteObjectCommand({
        Bucket: config.bucket_name,
        Key: key,
    });

    await client.send(command);
}

/**
 * Generates a signed URL for viewing/downloading a private file
 */
export async function getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600
): Promise<string> {
    const client = await getR2Client();
    const config = await getStorageConfig();

    const command = new GetObjectCommand({
        Bucket: config.bucket_name,
        Key: key,
    });

    // Signed URLs need the client and command
    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generates a signed URL for uploading a file directly from the frontend
 */
export async function getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 600
): Promise<string> {
    const client = await getR2Client();
    const config = await getStorageConfig();

    const command = new PutObjectCommand({
        Bucket: config.bucket_name,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(client, command, {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(["host", "content-type"])
    });
}
