// c:\Users\falkt\Documents\Prompt-Builder\src\app\api\components\route.ts
/**
 * API Route for Component Library (List and Create)
 * Handles fetching all component/folder items and creating new ones.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // SQLite database instance
import { v4 as uuidv4 } from 'uuid';
import { FolderType, ComponentType, TreeNode } from '@/types'; // Added TreeNode

/**
 * GET /api/components
 * Fetches all items from the component_library table.
 */
export async function GET() {
    try {
        const stmt = db.prepare('SELECT id, parent_id, name, item_type, content, component_type, created_at, updated_at FROM component_library');
        const components = stmt.all() as (FolderType | ComponentType)[];
        return NextResponse.json(components);
    } catch (error) {
        console.error('Error fetching components:', error);
        return NextResponse.json({ error: 'Failed to fetch components' }, { status: 500 });
    }
}

/**
 * POST /api/components
 * Creates/updates the entire component library tree structure.
 * Expects an array of FolderType (usually the single root "Components" folder).
 */
export async function POST(request: Request) {
    try {
        const treeData = await request.json() as FolderType[];

        if (!Array.isArray(treeData)) {
            return NextResponse.json({ error: 'Request body must be an array of FolderType' }, { status: 400 });
        }

        // Start a transaction
        db.exec('BEGIN');

        try {
            // Clear existing component library data
            // In a multi-user scenario, this would be scoped by user_id
            db.prepare('DELETE FROM component_library').run();

            const itemsToInsert: any[] = [];
            const currentTimestamp = new Date().toISOString();

            // Recursive function to flatten the tree and prepare items for insertion
            const flattenTree = (nodes: TreeNode[], parentId: string | null) => {
                nodes.forEach(node => {
                    const item: any = {
                        id: node.id || uuidv4(), // Ensure ID exists, generate if not (should be provided by client)
                        parent_id: parentId,
                        name: node.name,
                        item_type: node.type,
                        created_at: currentTimestamp,
                        updated_at: currentTimestamp,
                    };

                    if (node.type === 'folder') {
                        item.content = null;
                        item.component_type = null;
                        item.is_expanded = node.expanded !== undefined ? (node.expanded ? 1 : 0) : 0; // SQLite stores boolean as 0 or 1
                        itemsToInsert.push(item);
                        if (node.children && node.children.length > 0) {
                            flattenTree(node.children, node.id);
                        }
                    } else if (node.type === 'component') {
                        item.content = node.content;
                        item.component_type = node.componentType;
                        item.is_expanded = null; // Components are not expandable
                        itemsToInsert.push(item);
                    }
                });
            };

            // The treeData is an array of root folders (usually just one: "Components")
            treeData.forEach(rootNode => {
                if (rootNode.type === 'folder') {
                    flattenTree([rootNode], null); // Root nodes have no parent_id
                }
            });

            // Prepare statement for insertion
            const stmt = db.prepare(
                'INSERT INTO component_library (id, parent_id, name, item_type, content, component_type, is_expanded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            // Insert all items
            itemsToInsert.forEach(item => {
                stmt.run(
                    item.id,
                    item.parent_id,
                    item.name,
                    item.item_type,
                    item.content,
                    item.component_type,
                    item.is_expanded,
                    item.created_at,
                    item.updated_at
                );
            });

            db.exec('COMMIT');

            // After successful save, fetch and return the saved tree (or just a success message)
            // For simplicity, returning the flat list of inserted items for now.
            // The client-side `buildTreeFromApiData` will reconstruct the tree from this flat list.
            const newItemsStmt = db.prepare('SELECT id, parent_id, name, item_type, content, component_type, is_expanded, created_at, updated_at FROM component_library');
            const newLibrary = newItemsStmt.all();

            return NextResponse.json(newLibrary, { status: 201 });

        } catch (dbError) {
            db.exec('ROLLBACK'); // Rollback transaction on error
            console.error('Database error during component/folder tree update:', dbError);
            return NextResponse.json({ error: 'Failed to update component/folder tree in database' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error processing request for component/folder tree update:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update component/folder tree' }, { status: 500 });
    }
}
