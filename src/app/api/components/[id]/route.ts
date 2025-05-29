// c:\Users\falkt\Documents\Prompt-Builder\src\app\api\components\[id]\route.ts
/**
 * API Route for Single Component/Folder (Read, Update, Delete)
 * Handles fetching, updating, and deleting a single item from component_library by its ID.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // SQLite database instance
import { FolderType, ComponentType } from '@/types';

interface RouteParams {
    params: {
        id: string;
    };
}

/**
 * GET /api/components/[id]
 * Fetches a single component/folder by its ID.
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;
        const stmt = db.prepare('SELECT id, parent_id, name, item_type, content, component_type, is_expanded, created_at, updated_at FROM component_library WHERE id = ?');
        const itemRaw = stmt.get(id) as any;

        if (itemRaw) {
            const item = {
                ...itemRaw,
                // Ensure is_expanded is boolean for folders, and not present/null for components
                ...(itemRaw.item_type === 'folder' && {
                    expanded: itemRaw.is_expanded === 1,
                    // children: [] // GET by id doesn't typically fetch children unless specified
                }),
            };
            delete item.is_expanded; // Remove the original is_expanded after processing
            return NextResponse.json(item);
        } else {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
    } catch (error) {
        console.error(`Error fetching item ${params.id}:`, error);
        return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
    }
}

/**
 * PUT /api/components/[id]
 * Updates an existing component/folder by its ID.
 */
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;
        const body = await request.json();
        // Add is_expanded to destructuring, and ensure expanded from FolderType is mapped to is_expanded
        const { name, parent_id, item_type, content, component_type, expanded } = body as Partial<FolderType & ComponentType & { expanded: boolean }>;

        // Check if the item exists
        const checkStmt = db.prepare('SELECT item_type FROM component_library WHERE id = ?');
        const existingItem = checkStmt.get(id) as { item_type: string } | undefined;
        if (!existingItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Validate item_type specific fields if item_type is being changed or if it's a component
        const effectiveItemType = item_type ?? existingItem.item_type;

        let is_expanded_db: number | null = null;
        if (effectiveItemType === 'folder') {
            if (body.hasOwnProperty('expanded')) {
                is_expanded_db = expanded ? 1 : 0;
            }
            if (body.hasOwnProperty('content') && content !== null) {
                 return NextResponse.json({ error: 'Content must be null for folders' }, { status: 400 });
            }
            if (body.hasOwnProperty('component_type') && component_type !== null) {
                 return NextResponse.json({ error: 'Component type must be null for folders' }, { status: 400 });
            }
        } else if (effectiveItemType === 'component') {
            // Content and component_type checks remain the same
            if (body.hasOwnProperty('content') && content === null) {
                return NextResponse.json({ error: 'Content cannot be null for a component' }, { status: 400 });
            }
            if (body.hasOwnProperty('component_type') && component_type === null) {
                return NextResponse.json({ error: 'Component type cannot be null for a component' }, { status: 400 });
            }
            // is_expanded should be null for components
            if (body.hasOwnProperty('expanded') && typeof expanded !== 'undefined') {
                // Or simply ignore it, but for clarity, ensure DB stores null
            }
        }
        
        const currentTimestamp = new Date().toISOString();

        // Build the update query dynamically based on provided fields
        const updates: string[] = [];
        const values: any[] = [];

        if (typeof name !== 'undefined') {
            updates.push('name = ?');
            values.push(name);
        }
        if (typeof parent_id !== 'undefined') { // parent_id can be null
            updates.push('parent_id = ?');
            values.push(parent_id);
        }
        if (typeof item_type !== 'undefined') {
            updates.push('item_type = ?');
            values.push(item_type);
        }
        if (typeof content !== 'undefined') { // content can be null for folders
            updates.push('content = ?');
            values.push(effectiveItemType === 'component' ? content : null);
        }
        if (typeof component_type !== 'undefined') { // component_type can be null for folders
            updates.push('component_type = ?');
            values.push(effectiveItemType === 'component' ? component_type : null);
        }
        // Add is_expanded to updates if provided for a folder
        if (effectiveItemType === 'folder' && body.hasOwnProperty('expanded')) {
            updates.push('is_expanded = ?');
            values.push(is_expanded_db);
        } else if (effectiveItemType === 'component') {
            // Ensure is_expanded is set to NULL if item_type is component or being changed to component
            if (item_type === 'component' || (existingItem.item_type !== 'component' && effectiveItemType === 'component')) {
                updates.push('is_expanded = NULL');
            }
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
        }

        updates.push('updated_at = ?');
        values.push(currentTimestamp);
        values.push(id); // For the WHERE clause

        const query = `UPDATE component_library SET ${updates.join(', ')} WHERE id = ?`;
        const stmt = db.prepare(query);
        stmt.run(...values);

        // Retrieve the updated item to return it
        const updatedItemStmt = db.prepare('SELECT id, parent_id, name, item_type, content, component_type, is_expanded, created_at, updated_at FROM component_library WHERE id = ?');
        const updatedItemRaw = updatedItemStmt.get(id) as any;

        if (updatedItemRaw) {
            const responseItem = {
                ...updatedItemRaw,
                ...(updatedItemRaw.item_type === 'folder' && {
                    expanded: updatedItemRaw.is_expanded === 1,
                }),
            };
            delete responseItem.is_expanded;
            return NextResponse.json(responseItem);
        } else {
            // Should not happen if update was successful and item existed
            return NextResponse.json({ error: 'Failed to retrieve updated item' }, { status: 500 });
        }

    } catch (error) {
        console.error(`Error updating item ${params.id}:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}

/**
 * DELETE /api/components/[id]
 * Deletes a component/folder by its ID. SQLite handles cascading deletes for children.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        // Check if the item exists
        const checkStmt = db.prepare('SELECT id FROM component_library WHERE id = ?');
        const existingItem = checkStmt.get(id);
        if (!existingItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        const stmt = db.prepare('DELETE FROM component_library WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes > 0) {
            return NextResponse.json({ message: 'Item deleted successfully' });
        } else {
            return NextResponse.json({ error: 'Item not found or already deleted' }, { status: 404 });
        }
    } catch (error) {
        console.error(`Error deleting item ${params.id}:`, error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
