// c:\Users\falkt\Documents\Prompt-Builder\src\app\api\prompts\[id]\route.ts
/**
 * API Route for Single Prompt (Read, Update, Delete)
 * Handles fetching, updating, and deleting a single prompt by its ID.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // SQLite database instance
import { Prompt } from '@/types'; // Assuming Prompt type is defined

interface RouteParams {
    params: {
        id: string;
    };
}

/**
 * GET /api/prompts/[id]
 * Fetches a single prompt by its ID.
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const stmt = db.prepare('SELECT id, name, sections, num, created_at, updated_at FROM prompts WHERE id = ?');
        const promptRaw = stmt.get(id) as any;

        if (promptRaw) {
            const prompt = {
                ...promptRaw,
                sections: promptRaw.sections ? JSON.parse(promptRaw.sections) : [],
            };
            return NextResponse.json(prompt);
        } else {
            return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
        }
    } catch (error) {
        console.error(`Error fetching prompt ${params.id}:`, error);
        return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
    }
}

/**
 * PUT /api/prompts/[id]
 * Updates an existing prompt by its ID.
 */
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        const body = await request.json();
        const { name, sections, num } = body as Partial<Prompt>;

        // Check if the prompt exists
        const checkStmt = db.prepare('SELECT id FROM prompts WHERE id = ?');
        const existingPrompt = checkStmt.get(id);
        if (!existingPrompt) {
            return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
        }

        // At least one updatable field must be provided
        if (typeof name === 'undefined' && typeof sections === 'undefined' && typeof num === 'undefined') {
            return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
        }

        const currentTimestamp = new Date().toISOString();
        
        // Fetch current prompt data to merge if only partial data is sent
        const currentPromptStmt = db.prepare('SELECT name, sections, num FROM prompts WHERE id = ?');
        const currentPromptData = currentPromptStmt.get(id) as { name: string; sections: string; num: number | null };

        const updatedName = name ?? currentPromptData.name;
        const updatedSectionsJson = sections ? JSON.stringify(sections) : currentPromptData.sections;
        const updatedNum = num ?? currentPromptData.num;

        const stmt = db.prepare(
            'UPDATE prompts SET name = ?, sections = ?, num = ?, updated_at = ? WHERE id = ?'
        );
        stmt.run(updatedName, updatedSectionsJson, updatedNum, currentTimestamp, id);

        // Retrieve the updated prompt to return it
        const updatedPromptStmt = db.prepare('SELECT id, name, sections, num, created_at, updated_at FROM prompts WHERE id = ?');
        const updatedPromptRaw = updatedPromptStmt.get(id) as any;
        
        if (!updatedPromptRaw) {
            // Should not happen if update was successful and ID is correct
            console.error(`Failed to retrieve updated prompt ${id} after update.`);
            return NextResponse.json({ error: 'Failed to retrieve prompt after update' }, { status: 500 });
        }
        
        return NextResponse.json({ ...updatedPromptRaw, sections: JSON.parse(updatedPromptRaw.sections) });

    } catch (error) {
        // Access params.id safely for logging, it should be available if the signature is correct
        console.error(`Error updating prompt ${params?.id || 'unknown'}:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
    }
}

/**
 * DELETE /api/prompts/[id]
 * Deletes a prompt by its ID.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Check if the prompt exists
        const checkStmt = db.prepare('SELECT id FROM prompts WHERE id = ?');
        const existingPrompt = checkStmt.get(id);
        if (!existingPrompt) {
            return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
        }

        // Before deleting, check if this prompt is the active_prompt_id in app_config
        // If so, set active_prompt_id to null
        const appConfigStmt = db.prepare('SELECT active_prompt_id FROM app_config WHERE id = 1');
        const appConfig = appConfigStmt.get() as { active_prompt_id?: string | null } | undefined;

        if (appConfig && appConfig.active_prompt_id === id) {
            const updateAppConfigStmt = db.prepare('UPDATE app_config SET active_prompt_id = NULL, updated_at = ? WHERE id = 1');
            updateAppConfigStmt.run(new Date().toISOString());
        }

        const stmt = db.prepare('DELETE FROM prompts WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes > 0) {
            return NextResponse.json({ message: 'Prompt deleted successfully' });
        } else {
            // This case should ideally be caught by the checkStmt earlier
            return NextResponse.json({ error: 'Prompt not found or already deleted' }, { status: 404 });
        }
    } catch (error) {
        console.error(`Error deleting prompt ${params.id}:`, error);
        return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }
}
