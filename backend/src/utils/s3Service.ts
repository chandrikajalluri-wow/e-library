import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";

dotenv.config();

export const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

/**
 * Uploads a file to AWS S3
 * @param file Buffer of the file to upload
 * @param fileName Name of the file in S3
 * @param mimeType MIME type of the file
 * @returns Promise with the location (URL) of the uploaded file
 */
export const uploadToS3 = async (
    file: Buffer,
    fileName: string,
    mimeType: string
): Promise<string> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
        throw new Error("AWS_S3_BUCKET_NAME is not defined in environment variables");
    }

    try {
        const parallelUploads3 = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: `books/${fileName}`,
                Body: file,
                ContentType: mimeType,
            },
            // Optional: configure concurrency and part size
            queueSize: 4,
            partSize: 1024 * 1024 * 5, // 5MB
            leavePartsOnError: false,
        });

        const result = await parallelUploads3.done();

        // Since the bucket is public read, we can construct the URL if result.Location is not present
        // but SDK v3 Upload.done() returns Location in most cases.
        return (result as any).Location || `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/books/${fileName}`;
    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error("Failed to upload file to S3");
    }
};

/**
 * Gets a file stream from AWS S3
 * @param key The S3 key of the file
 * @returns Promise with the S3 GetObjectCommand output
 */
export const getS3FileStream = async (key: string) => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
        throw new Error("AWS_S3_BUCKET_NAME is not defined");
    }

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    });

    return await s3Client.send(command);
};
