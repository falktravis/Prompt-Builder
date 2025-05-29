// c:\Users\falkt\Documents\Prompt-Builder\src\app\api\prompts\route.ts
/**
 * API Route for Prompts (List and Create)
 * Handles fetching all prompts and creating new prompts.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // SQLite database instance
import { v4 as uuidv4 } from 'uuid';
import { Prompt } from '@/types'; // Assuming Prompt type is defined

/**
 * GET /api/prompts
 * Fetches all prompts from the database.
 */
export async function GET() {
    try {
        const stmt = db.prepare('SELECT id, name, sections, num, created_at, updated_at FROM prompts');
        const promptsRaw = stmt.all() as any[];

        const prompts = promptsRaw.map(prompt => ({
            ...prompt,
            sections: prompt.sections ? JSON.parse(prompt.sections) : [], // Ensure sections are parsed or defaulted to an empty array
        }));

        return NextResponse.json(prompts);
    } catch (error) {
        console.error('Error fetching prompts:', error);
        return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }
}

/**
 * POST /api/prompts
 * Creates a new prompt.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, sections, num } = body as Partial<Prompt>; // Use Partial<Prompt> for incoming data

        if (!name) {
            return NextResponse.json({ error: 'Prompt name is required' }, { status: 400 });
        }

        const newPromptId = uuidv4();
        const sectionsJson = JSON.stringify(sections || []); // Default to empty array if sections are not provided
        const currentTimestamp = new Date().toISOString();

        const stmt = db.prepare(
            'INSERT INTO prompts (id, name, sections, num, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        stmt.run(newPromptId, name, sectionsJson, num ?? null, currentTimestamp, currentTimestamp);

        // Retrieve the newly created prompt to return it in the response
        const newPromptStmt = db.prepare('SELECT id, name, sections, num, created_at, updated_at FROM prompts WHERE id = ?');
        const newPrompt = newPromptStmt.get(newPromptId) as any;

        if (newPrompt) {
            return NextResponse.json({ ...newPrompt, sections: JSON.parse(newPrompt.sections) }, { status: 201 });
        } else {
            // Should not happen if insert was successful
            return NextResponse.json({ error: 'Failed to create prompt or retrieve it after creation' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error creating prompt:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
    }
}
