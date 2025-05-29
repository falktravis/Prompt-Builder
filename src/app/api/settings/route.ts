// c:\Users\falkt\Documents\Prompt-Builder\src\app\api\settings\route.ts
/**
 * API Route for Settings (app_config)
 * Handles fetching and updating application settings and active prompt ID.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // SQLite database instance
import { Settings } from '@/types'; // Assuming Settings type is defined

// Default settings - consider moving to a shared constants file if used elsewhere
const DEFAULT_SETTINGS: Settings = {
    autoSave: true,
    defaultPromptName: "New Prompt",
    defaultSectionType: "instruction",
    theme: "dark",
    markdownPromptingEnabled: false,
    systemPrompt: "# Prompt Structure/System Guide...", // Keep it concise or load from a file if very long
};

/**
 * GET /api/settings
 * Fetches the current application settings and active_prompt_id.
 */
export async function GET() {
    try {
        const stmt = db.prepare('SELECT settings_json, active_prompt_id FROM app_config WHERE id = 1');
        const result = stmt.get() as { settings_json?: string; active_prompt_id?: string | null } | undefined;

        if (result && result.settings_json) {
            const settings = JSON.parse(result.settings_json);
            return NextResponse.json({ settings, activePromptId: result.active_prompt_id });
        } else {
            // No settings found, return default settings and null activePromptId
            // Optionally, insert default settings here if preferred
            return NextResponse.json({ settings: DEFAULT_SETTINGS, activePromptId: null });
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

/**
 * POST /api/settings
 * Creates or updates the application settings and active_prompt_id.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { settings, activePromptId } = body;

        if (typeof settings === 'undefined' && typeof activePromptId === 'undefined') {
            return NextResponse.json({ error: 'Settings or activePromptId must be provided' }, { status: 400 });
        }

        const currentTimestamp = new Date().toISOString();

        // Fetch existing settings to merge if only one part is provided
        const stmtGet = db.prepare('SELECT settings_json, active_prompt_id FROM app_config WHERE id = 1');
        const existingConfig = stmtGet.get() as { settings_json?: string; active_prompt_id?: string | null } | undefined;

        const newSettingsJson = settings ? JSON.stringify(settings) : existingConfig?.settings_json;
        let newActivePromptId = typeof activePromptId !== 'undefined' ? activePromptId : existingConfig?.active_prompt_id;

        // Validate activePromptId if it's not null
        if (newActivePromptId !== null && typeof newActivePromptId !== 'undefined') {
            const promptCheckStmt = db.prepare('SELECT id FROM prompts WHERE id = ?');
            const existingPrompt = promptCheckStmt.get(newActivePromptId);
            if (!existingPrompt) {
                console.warn(`Active prompt ID ${newActivePromptId} not found in prompts table. Setting to null.`);
                newActivePromptId = null; // Set to null if prompt doesn't exist
            }
        }

        const finalSettingsJson = newSettingsJson || JSON.stringify(DEFAULT_SETTINGS);

        const stmt = db.prepare(
            'INSERT OR REPLACE INTO app_config (id, settings_json, active_prompt_id, updated_at) VALUES (1, ?, ?, ?)'
        );
        // Ensure newActivePromptId is explicitly passed, even if it became null
        stmt.run(finalSettingsJson, newActivePromptId, currentTimestamp);

        return NextResponse.json({ message: 'Settings updated successfully', settings: JSON.parse(finalSettingsJson), activePromptId: newActivePromptId });

    } catch (error) {
        console.error('Error updating settings:', error);
        // Check if error is due to JSON parsing
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
