import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { put } from '@vercel/blob';

function sanitizeFilename(filename: string) {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const uniqueFilename = `${Date.now()}-${sanitizeFilename(file.name)}`;
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

        if (blobToken) {
            const blob = await put(uniqueFilename, file, {
                access: 'public',
                token: blobToken,
                contentType: file.type || 'application/octet-stream',
            });

            return NextResponse.json({ url: blob.url }, { status: 201 });
        }

        if (process.env.VERCEL) {
            return NextResponse.json(
                { error: 'BLOB_READ_WRITE_TOKEN is required for image uploads on Vercel' },
                { status: 500 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (err) {
            console.error('Error creating directory:', err);
        }

        const filePath = join(uploadDir, uniqueFilename);
        await writeFile(filePath, buffer);

        return NextResponse.json({ url: `/uploads/${uniqueFilename}` }, { status: 201 });
    } catch (error) {
        console.error('Error handling upload:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
